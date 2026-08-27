import { parseYmd, formatYmd } from "./math";

/**
 * KRX Open API는 "이 날짜가 거래일인지 모른 채" basDd로 호출해야 하므로,
 * math.ts(조밀한 일별 시계열을 축약)와 별개로 "조회할 달력 날짜 후보"를
 * 먼저 계산하는 역할을 분리한다. 실제 거래일 확정은 krx/client.ts의
 * resolveTradingDay가 담당한다.
 */

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

/**
 * endDate 이하 최근 count개 금요일 달력날짜(YYYYMMDD, 오름차순).
 * endDate가 포함된 주가 아직 그 주의 금요일에 도달하지 못했으면(진행 중) 제외한다
 * (math.ts의 resampleWeekly가 "fri <= last"만 채택하는 것과 동일한 규칙).
 */
export function listWeeklyAnchors(endDate: string, count: number): string[] {
  let fri = parseYmd(endDate);
  while (fri.getUTCDay() !== 5) fri = addDays(fri, -1);

  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(formatYmd(fri));
    fri = addDays(fri, -7);
  }
  return out.reverse();
}

/**
 * endDate 기준 최근 count개 달력월의 "그 달 마지막 날"(YYYYMMDD, 오름차순).
 * 이번 달이 아직 끝나지 않았으면(i=0) endDate로 클램프한다 — math.ts의
 * resampleMonthly가 "그 달에 존재하는 마지막 실제 거래일"을 쓰는 것과 동일하게,
 * 진행 중인 달도 endDate까지의 데이터로 포함시키기 위함.
 */
export function listMonthlyAnchors(endDate: string, count: number): string[] {
  const end = parseYmd(endDate);
  let y = end.getUTCFullYear();
  let m = end.getUTCMonth() + 1; // 1-based

  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const lastDayOfMonth = formatYmd(new Date(Date.UTC(y, m, 0)));
    out.push(i === 0 && lastDayOfMonth > endDate ? endDate : lastDayOfMonth);
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return out.reverse();
}
