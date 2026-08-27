import axios from "axios";
import https from "https";
import type { KrxApiResponse, KrxIndexRow, KrxMarket, KrxStockRow, KrxStockBaseInfoRow } from "./types";

/**
 * 한국거래소(KRX) 공식 Open API 클라이언트.
 *
 * 제약: 이 API는 "특정 날짜(basDd) 하루치, 전종목" 스냅샷만 반환한다.
 * 종목 단위 지정도, 기간범위(start~end) 조회도 지원하지 않는다.
 * → (날짜, 시장) 단위로 원시 응답 전체를 캐싱해서, 같은 날짜를 여러 종목이
 *   조회할 때 실제 HTTP 호출을 시장당 1번으로 묶는다.
 * → 거래일 여부를 모른 채 호출해야 하므로, 코스피 지수 조회를 "거래일 오라클"로
 *   사용해 원하는 날짜가 휴장일이면 하루씩 물러나며 재시도한다.
 */

const KRX_API_BASE = "https://data-dbg.krx.co.kr/svc/apis";
const KOSPI_TOTAL_INDEX_NAME = "코스피";
/**
 * 요청 "시작" 속도(토큰 버킷)와 동시 in-flight 상한을 분리해서 관리한다.
 * - 동시성만 세마포어로 제한하면(응답을 기다렸다 다음 요청) latency가 그대로
 *   누적돼 느려지고, 반대로 latency와 무관하게 계속 밀어넣으면 KRX 앞단
 *   WAF(Akamai)가 순간 요청 폭주로 판단해 403을 낸다(실측: 동시/속도 10↑에서 차단 시작).
 * - "초당 RATE_PER_SECOND개 시작, 동시 최대 MAX_CONCURRENT개 in-flight"로
 *   두 축을 같이 제한하면 latency에 관계없이 파이프라인화하면서도 순간 폭주를 피한다.
 * - 8은 403 재현 없이 안전한 값. vercel.json의 maxDuration을 120초(Fluid Compute)로
 *   늘려뒀으므로 굳이 이 값을 더 밀어붙여 차단 위험을 감수할 필요는 없다.
 */
const RATE_PER_SECOND = 8;
const MAX_CONCURRENT_REQUESTS = 8;

// TCP/TLS 핸드셰이크를 요청마다 새로 맺지 않도록 연결을 재사용한다 — 앵커별로
// 수백 번씩 나가는 요청의 latency를 줄이는 핵심 요인.
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: MAX_CONCURRENT_REQUESTS });

function resolveApiKey(apiKey?: string): string {
  const key = apiKey || process.env.KRX_AUTH_KEY;
  if (!key) {
    throw new Error("KRX API 인증키가 필요합니다. KRX_AUTH_KEY 환경변수를 설정해주세요.");
  }
  return key;
}

// ── 날짜 유틸 (YYYYMMDD 문자열) ──────────────────────────────────────────
function toDate(basDd: string): Date {
  return new Date(Date.UTC(Number(basDd.slice(0, 4)), Number(basDd.slice(4, 6)) - 1, Number(basDd.slice(6, 8))));
}

function toBasDd(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

function addDays(basDd: string, n: number): string {
  return toBasDd(new Date(toDate(basDd).getTime() + n * 86400000));
}

function isWeekend(basDd: string): boolean {
  const dow = toDate(basDd).getUTCDay();
  return dow === 0 || dow === 6;
}

// ── 전역 스로틀: 토큰 버킷(시작 속도) + 세마포어(동시 in-flight 상한) ──────
let activeRequests = 0;
let tokens = RATE_PER_SECOND;
let lastRefill = Date.now();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function refillTokens(): void {
  const now = Date.now();
  const elapsed = (now - lastRefill) / 1000;
  tokens = Math.min(RATE_PER_SECOND, tokens + elapsed * RATE_PER_SECOND);
  lastRefill = now;
}

async function acquireSlot(): Promise<void> {
  while (true) {
    refillTokens();
    if (tokens >= 1 && activeRequests < MAX_CONCURRENT_REQUESTS) {
      tokens -= 1;
      activeRequests++;
      return;
    }
    await sleep(15); // 짧은 폴링 — 토큰/슬롯 여유가 생기는지 재확인
  }
}

function releaseSlot(): void {
  activeRequests--;
}

function isRetryableError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  if (!err.response) return true; // 네트워크 오류/타임아웃
  // 403은 KRX 앞단 WAF(Akamai)가 순간 요청 폭주를 일시 차단할 때도 발생한다.
  return err.response.status === 403 || err.response.status === 429 || err.response.status >= 500;
}

/** 동시성 제한 + 일시적 오류(429/5xx/네트워크) 1회 재시도 */
async function throttled<T>(fn: () => Promise<T>): Promise<T> {
  await acquireSlot();
  try {
    try {
      return await fn();
    } catch (err) {
      if (!isRetryableError(err)) throw err;
      await sleep(800);
      return await fn();
    }
  } finally {
    releaseSlot();
  }
}

// ── (날짜) / (날짜,시장) 단위 원시 응답 캐시 ────────────────────────────
// in-flight Promise 자체를 캐싱해서, 같은 날짜를 동시에 조회하는 여러 호출이
// (병렬화된 앵커 순회에서 흔히 발생) 중복 HTTP 요청을 내지 않고 하나를 공유한다.
const kospiIndexCache = new Map<string, Promise<KrxIndexRow[]>>();
const stockMarketCache = new Map<string, Promise<KrxStockRow[]>>();
const stockBaseInfoCache = new Map<string, Promise<KrxStockBaseInfoRow[]>>();

function fetchKospiIndexRaw(basDd: string, apiKey?: string): Promise<KrxIndexRow[]> {
  const cached = kospiIndexCache.get(basDd);
  if (cached) return cached;

  const promise = throttled(async () => {
    const res = await axios.get<KrxApiResponse<KrxIndexRow>>(`${KRX_API_BASE}/idx/kospi_dd_trd`, {
      params: { basDd },
      headers: { AUTH_KEY: resolveApiKey(apiKey) },
      httpsAgent,
      timeout: 15000,
    });
    return res.data.OutBlock_1 ?? [];
  });
  kospiIndexCache.set(basDd, promise);
  promise.catch(() => kospiIndexCache.delete(basDd)); // 실패 시 재시도 가능하도록 캐시에서 제거
  return promise;
}

function fetchMarketStocksRaw(basDd: string, market: KrxMarket, apiKey?: string): Promise<KrxStockRow[]> {
  const cacheKey = `${basDd}:${market}`;
  const cached = stockMarketCache.get(cacheKey);
  if (cached) return cached;

  const endpoint = market === "KOSPI" ? "stk_bydd_trd" : "ksq_bydd_trd";
  const promise = throttled(async () => {
    const res = await axios.get<KrxApiResponse<KrxStockRow>>(`${KRX_API_BASE}/sto/${endpoint}`, {
      params: { basDd },
      headers: { AUTH_KEY: resolveApiKey(apiKey) },
      httpsAgent,
      timeout: 15000,
    });
    return res.data.OutBlock_1 ?? [];
  });
  stockMarketCache.set(cacheKey, promise);
  promise.catch(() => stockMarketCache.delete(cacheKey));
  return promise;
}

function fetchStockBaseInfoRaw(basDd: string, market: KrxMarket, apiKey?: string): Promise<KrxStockBaseInfoRow[]> {
  const cacheKey = `${basDd}:${market}`;
  const cached = stockBaseInfoCache.get(cacheKey);
  if (cached) return cached;

  const endpoint = market === "KOSPI" ? "stk_isu_base_info" : "ksq_isu_base_info";
  const promise = throttled(async () => {
    const res = await axios.get<KrxApiResponse<KrxStockBaseInfoRow>>(`${KRX_API_BASE}/sto/${endpoint}`, {
      params: { basDd },
      headers: { AUTH_KEY: resolveApiKey(apiKey) },
      httpsAgent,
      timeout: 15000,
    });
    return res.data.OutBlock_1 ?? [];
  });
  stockBaseInfoCache.set(cacheKey, promise);
  promise.catch(() => stockBaseInfoCache.delete(cacheKey));
  return promise;
}

// ── 파생 조회 (파싱된 값) ────────────────────────────────────────────────

/** basDd의 코스피 종합지수 종가. 휴장일이면 null(전종목 응답이 빈 배열). */
export async function getKospiIndexClose(basDd: string, apiKey?: string): Promise<number | null> {
  const rows = await fetchKospiIndexRaw(basDd, apiKey);
  if (rows.length === 0) return null;

  const row = rows.find((r) => r.IDX_NM === KOSPI_TOTAL_INDEX_NAME);
  if (!row) {
    console.warn(
      `[KRX] "${KOSPI_TOTAL_INDEX_NAME}" 지수 레코드를 찾지 못했습니다. 관측된 IDX_NM: ${[...new Set(rows.map((r) => r.IDX_NM))].join(", ")}`
    );
    return null;
  }
  const close = parseFloat(row.CLSPRC_IDX);
  return isFinite(close) ? close : null;
}

/** basDd, market 기준 개별종목 종가. 휴장일이거나 해당 종목이 없으면 null. */
export async function getStockClose(basDd: string, market: KrxMarket, stockCode: string, apiKey?: string): Promise<number | null> {
  const rows = await fetchMarketStocksRaw(basDd, market, apiKey);
  const row = rows.find((r) => r.ISU_CD === stockCode);
  if (!row) return null;
  const close = parseFloat(row.TDD_CLSPRC);
  return isFinite(close) ? close : null;
}

// ── 거래일 오라클 ─────────────────────────────────────────────────────────

/**
 * anchorDate가 실제 거래일인지 코스피 지수 유무로 확인하고, 아니면 하루씩
 * 최대 maxBackoffDays일 역행하며 재시도한다. 주말은 API 호출 없이 건너뛴다.
 */
export async function resolveTradingDay(
  anchorDate: string,
  maxBackoffDays = 7,
  apiKey?: string
): Promise<{ date: string; close: number } | null> {
  let candidate = anchorDate;
  for (let i = 0; i <= maxBackoffDays; i++) {
    if (!isWeekend(candidate)) {
      const close = await getKospiIndexClose(candidate, apiKey);
      if (close !== null) return { date: candidate, close };
    }
    candidate = addDays(candidate, -1);
  }
  return null;
}

/** 기준일(asOfDate) 이하 가장 가까운 거래일의 개별종목 종가 1건. */
export async function fetchKrxPriceAsOf(
  stockCode: string,
  market: KrxMarket,
  asOfDate: string,
  maxBackoffDays = 10,
  apiKey?: string
): Promise<{ date: string; close: number } | null> {
  let candidate = asOfDate;
  for (let i = 0; i <= maxBackoffDays; i++) {
    if (!isWeekend(candidate)) {
      const close = await getStockClose(candidate, market, stockCode, apiKey);
      if (close !== null) return { date: candidate, close };
    }
    candidate = addDays(candidate, -1);
  }
  return null;
}

/**
 * 종목의 액면가(원). 종목기본정보는 매일 갱신되는 시세가 아니라 현재 상태
 * 스냅샷이므로, 기준일 없이 "오늘"부터 최대 maxBackoffDays일 역행하며 조회한다.
 */
export async function getParValue(
  stockCode: string,
  market: KrxMarket,
  maxBackoffDays = 10,
  apiKey?: string
): Promise<number | null> {
  let candidate = toBasDd(new Date());
  for (let i = 0; i <= maxBackoffDays; i++) {
    if (!isWeekend(candidate)) {
      const rows = await fetchStockBaseInfoRaw(candidate, market, apiKey);
      const row = rows.find((r) => r.ISU_SRT_CD === stockCode);
      if (row) {
        const parVal = parseInt(row.PARVAL, 10);
        return isNaN(parVal) ? null : parVal;
      }
    }
    candidate = addDays(candidate, -1);
  }
  return null;
}
