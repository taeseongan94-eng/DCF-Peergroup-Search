export interface DartCompanyInfo {
  status: string;
  message: string;
  corp_code: string;
  corp_name: string;
  corp_name_eng: string;
  stock_name: string;
  stock_code: string;
  ceo_nm: string;
  corp_cls: string; // Y=유가, K=코스닥, N=코넥스, E=기타
  induty_code: string;
  est_dt: string;
  acc_mt: string;
}

export interface DartFinancialItem {
  rcept_no: string;
  bsns_year: string;
  stock_code?: string;
  corp_code?: string;
  reprt_code: string;
  account_id: string; // XBRL 계정코드 (e.g. "ifrs-full_ShorttermBorrowings", "-표준계정코드 미사용-")
  account_nm: string;
  account_detail?: string;
  fs_div: string; // OFS=개별, CFS=연결
  fs_nm: string;
  sj_div: string; // BS=재무상태표, IS=손익계산서, CIS=포괄손익계산서
  sj_nm: string;
  thstrm_nm: string;
  thstrm_dt: string;
  thstrm_amount: string;
  thstrm_add_amount?: string;
  frmtrm_nm: string;
  frmtrm_amount: string;
  bfefrmtrm_amount?: string;
  ord: string;
}

export interface DartFinancialResponse {
  status: string;
  message: string;
  list?: DartFinancialItem[];
}

export interface DartStockQuantityItem {
  rcept_no: string;
  corp_cls: string;
  corp_code: string;
  corp_name: string;
  se: string; // 증권종류 (보통주, 우선주 등)
  isu_stock_totqy: string; // 발행할 주식의 총수
  now_to_isu_stock_totqy: string; // 현재까지 발행한 주식의 총수
  now_to_dcrs_stock_totqy: string; // 현재까지 감소한 주식의 총수
  redc: string;
  profit_incnr: string;
  rdmstk_repy: string;
  etc: string;
  istc_totqy: string; // 발행주식의 총수
  tesstk_co: string; // 자기주식수
  distb_stock_co: string; // 유통주식수
}

export interface DartStockQuantityResponse {
  status: string;
  message: string;
  list?: DartStockQuantityItem[];
}

export interface SharesInfo {
  totalIssued: number;
  treasuryStock: number;
  outstanding: number;
  stockType: string;
  source: string;
}

export interface DebtItem {
  account: string;
  amount: number;
}

export interface DebtCategory {
  total: number;
  items: DebtItem[];
}

export interface DebtSummary {
  interestBearingDebt: number;
  current: DebtCategory;
  nonCurrent: DebtCategory;
  nonControllingInterest: number | null;
  pretaxIncome: number | null;
}

export interface ValuationFinancials {
  debt: DebtSummary;
  filteredItems: Array<{
    category: string;
    sjDiv: string;
    account: string;
    currentAmount: string;
    previousAmount: string;
  }>;
}

// ─── 감사의견 ───

export interface DartAuditOpinionItem {
  rcept_no: string;
  corp_cls: string;
  corp_code: string;
  corp_name: string;
  bsns_year: string; // 예: "제23기\n(당기)"
  adtor?: string; // 감사인(회계법인) — "-"는 비감사 관련 레코드
  adt_opinion?: string; // 감사의견 (예: "적정의견")
  adt_reprt_spcmnt_matter?: string;
  emphs_matter?: string; // 강조사항
  core_adt_matter?: string; // 핵심감사사항
  stlm_dt: string; // 결산일
}

export interface DartAuditOpinionResponse {
  status: string;
  message: string;
  list?: DartAuditOpinionItem[];
}

export interface AuditOpinionInfo {
  auditor: string | null;
  opinion: string | null;
  emphasisMatter: string | null;
  coreAuditMatter: string | null;
  settlementDate: string | null;
  source: string;
}
