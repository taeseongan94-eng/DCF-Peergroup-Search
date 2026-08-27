export const DART_API_BASE = "https://opendart.fss.or.kr/api";

export const DART_ENDPOINTS = {
  COMPANY: "/company.json",
  FINANCIAL_SINGLE: "/fnlttSinglAcnt.json",
  FINANCIAL_FULL: "/fnlttSinglAcntAll.json",
  STOCK_QUANTITY: "/stockTotqySttus.json",
  AUDIT_OPINION: "/accnutAdtorNmNdAdtOpinion.json",
} as const;

export const REPORT_CODE: Record<string, string> = {
  annual: "11011",
  semi: "11012",
  q1: "11013",
  q3: "11014",
};

export const REPORT_CODE_LABEL: Record<string, string> = {
  "11011": "사업보고서",
  "11012": "반기보고서",
  "11013": "1분기보고서",
  "11014": "3분기보고서",
};

// ─── XBRL account_id 기반 매칭 (1차) ───

// 이자부부채 — 유동
export const IBD_CURRENT_ACCOUNT_IDS = new Set([
  "ifrs-full_ShorttermBorrowings",                      // 단기차입금
  "ifrs-full_CurrentPortionOfLongtermBorrowings",        // 유동성장기차입금
  "dart_CurrentPortionOfBonds",                          // 유동성사채
  "dart_CurrentPortionOfConvertibleBonds",               // 유동성전환사채
  "dart_CurrentPortionOfBondWithWarrant",                // 유동성신주인수권부사채
  "dart_CurrentPortionOfExchangeableBond",               // 유동성교환사채
  "dart_CurentPortionOfFinanceLeaseLiabilities",         // 유동금융리스부채
  "ifrs-full_CurrentLeaseLiabilities",                   // 유동리스부채
]);

// 이자부부채 — 비유동
export const IBD_NON_CURRENT_ACCOUNT_IDS = new Set([
  "dart_LongTermBorrowingsGross",                        // 장기차입금(총액)
  "ifrs-full_LongtermBorrowings",                        // 장기차입금
  "ifrs-full_NoncurrentPortionOfNoncurrentLoansReceived", // 장기차입금(삼성전자 등)
  "dart_BondsIssued",                                    // 사채
  "ifrs-full_NoncurrentPortionOfNoncurrentBondsIssued",  // 사채(삼성전자 등)
  "dart_ConvertibleBonds",                               // 전환사채
  "dart_BondWithWarrant",                                // 신주인수권부사채
  "dart_ExchangeableBonds",                              // 교환사채
  "dart_ExchangeableBondsNet",                           // 교환사채(순액)
  "dart_NonCurrentFinanceLeaseLiabilities",              // 비유동금융리스부채
  "ifrs-full_NoncurrentLeaseLiabilities",                // 비유동리스부채
]);

// 비지배지분
export const NCI_ACCOUNT_IDS = new Set([
  "ifrs-full_NoncontrollingInterests",
]);

// 세전이익
export const PRETAX_ACCOUNT_IDS = new Set([
  "ifrs-full_ProfitLossBeforeTax",
]);

// 순자산(자본총계)
export const NET_ASSETS_ACCOUNT_IDS = new Set([
  "ifrs-full_Equity",
]);

// ─── 계정명 폴백 (account_id가 "-표준계정코드 미사용-"일 때) ───

export const IBD_CURRENT_PATTERNS = [
  "단기차입금", "단기차입부채",
  "유동성장기부채", "유동성장기차입금",
  "유동성사채", "유동성전환사채", "유동성신주인수권부사채", "유동성교환사채",
  "단기사채", "당좌차월", "유동차입부채", "단기외화차입금",
];

export const IBD_NON_CURRENT_PATTERNS = [
  "장기차입금", "장기차입부채", "장기외화차입금",
  "사채", "전환사채", "신주인수권부사채", "교환사채",
  "사모사채", "할인채",
];

export const IBD_COMMON_PATTERNS = [
  "외화차입금", "차입부채", "주주차입금", "임원차입금", "관계기업차입금",
];

export const LEASE_LIABILITY_KEYWORD = "리스부채";

export const NON_CONTROLLING_INTEREST_PATTERNS = [
  "비지배지분", "소수주주지분",
];

export const PRETAX_INCOME_PATTERNS = [
  "법인세비용차감전", "법인세차감전",
];

export const NET_ASSETS_PATTERNS = [
  "자본총계",
];

// ─── valuation 모드 필터링용 (account_id + 이름 둘 다) ───

export const ALL_IBD_ACCOUNT_IDS = new Set([
  ...IBD_CURRENT_ACCOUNT_IDS,
  ...IBD_NON_CURRENT_ACCOUNT_IDS,
]);

export const ALL_IBD_PATTERNS = [
  ...IBD_CURRENT_PATTERNS,
  ...IBD_NON_CURRENT_PATTERNS,
  ...IBD_COMMON_PATTERNS,
  LEASE_LIABILITY_KEYWORD,
];

export const VALUATION_ACCOUNT_PATTERNS = [
  ...ALL_IBD_PATTERNS,
  ...NON_CONTROLLING_INTEREST_PATTERNS,
  ...PRETAX_INCOME_PATTERNS,
];

export const VALUATION_ACCOUNT_IDS = new Set([
  ...ALL_IBD_ACCOUNT_IDS,
  ...NCI_ACCOUNT_IDS,
  ...PRETAX_ACCOUNT_IDS,
]);
