import type { PricePoint } from "./types";
import { listWeeklyAnchors, listMonthlyAnchors } from "./anchors";
import { PERIOD_SPECS, WEEKLY_ANCHOR_BUFFER, MONTHLY_ANCHOR_BUFFER } from "./constants";
import { resolveTradingDay, getStockClose } from "../krx/client";
import { getStockMarket } from "../common/stock-code-resolver";

/**
 * KRX 공식 Open API에서 베타 계산용 시계열을 가져온다.
 *
 * 네이버 siseJson과 달리 KRX는 "특정 날짜 하루치, 전종목"만 반환하고
 * 기간범위 조회를 지원하지 않는다. 그래서 필요한 주간/월간 앵커 날짜만
 * 미리 계산해(anchors.ts) 그 날짜들에 대해서만 조회하고, 휴장일이면
 * resolveTradingDay가 하루씩 물러나며 유효 거래일을 확정한다.
 *
 * math.ts(buildAlignedRows/resampleWeekly/resampleMonthly/ols)는 PricePoint[]만
 * 소비하는 source-agnostic 순수 함수라 이 파일의 구현 교체와 무관하게 그대로 쓴다.
 */

function buildAnchorDates(endDate: string, startDate: string): string[] {
  const weekly = listWeeklyAnchors(endDate, PERIOD_SPECS["Weekly-2Y"].keepRows + WEEKLY_ANCHOR_BUFFER);
  const monthly = listMonthlyAnchors(endDate, PERIOD_SPECS["Monthly-5Y"].keepRows + MONTHLY_ANCHOR_BUFFER);
  const merged = new Set([...weekly, ...monthly].filter((d) => d >= startDate && d <= endDate));
  return [...merged].sort();
}

/**
 * 개별종목 일별 종가 (앵커 날짜만, KRX 원본 종가 — 수정주가 아님).
 * 앵커는 서로 독립적이므로 병렬로 처리한다 — 실제 동시 HTTP 요청 수는
 * krx/client.ts의 세마포어가 제한하고, 같은 날짜로 수렴하는 경우 in-flight
 * 캐시가 중복 호출을 막는다.
 */
export async function fetchAdjDaily(stockCode: string, startDate: string, endDate: string): Promise<PricePoint[]> {
  const market = await getStockMarket(stockCode);
  const anchors = buildAnchorDates(endDate, startDate);

  const results = await Promise.all(
    anchors.map(async (anchor) => {
      const resolved = await resolveTradingDay(anchor, 7);
      if (!resolved) return null;
      const close = await getStockClose(resolved.date, market, stockCode);
      return close !== null ? { date: resolved.date, close } : null;
    })
  );

  const dedup = new Map<string, number>();
  for (const r of results) if (r) dedup.set(r.date, r.close);
  return [...dedup.entries()].map(([date, close]) => ({ date, close })).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** KOSPI 지수 일별 종가 (앵커 날짜만, 병렬 처리). symbol 파라미터는 호환용으로 남기되 무시한다(KRX는 "코스피" 고정). */
export async function fetchKospiDaily(startDate: string, endDate: string, _symbol?: string): Promise<PricePoint[]> {
  const anchors = buildAnchorDates(endDate, startDate);

  const results = await Promise.all(anchors.map((anchor) => resolveTradingDay(anchor, 7)));

  const dedup = new Map<string, number>();
  for (const r of results) if (r) dedup.set(r.date, r.close);
  return [...dedup.entries()].map(([date, close]) => ({ date, close })).sort((a, b) => (a.date < b.date ? -1 : 1));
}
