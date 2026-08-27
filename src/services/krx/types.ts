/** KRX Open API (data-dbg.krx.co.kr) 응답 타입. 필드명은 실제 API 응답으로 확인함. */

export type KrxMarket = "KOSPI" | "KOSDAQ";

/** idx/kospi_dd_trd 응답 레코드 (KOSPI 시리즈 일별시세정보) */
export interface KrxIndexRow {
  BAS_DD: string;
  IDX_CLSS: string;
  IDX_NM: string; // 전체지수는 정확히 "코스피" (서브지수는 "코스피 200" 등)
  CLSPRC_IDX: string;
  CMPPREVDD_IDX: string;
  FLUC_RT: string;
  OPNPRC_IDX: string;
  HGPRC_IDX: string;
  LWPRC_IDX: string;
  ACC_TRDVOL: string;
  ACC_TRDVAL: string;
  MKTCAP: string;
}

/** sto/stk_bydd_trd, sto/ksq_bydd_trd 응답 레코드 (유가증권/코스닥 일별매매정보) */
export interface KrxStockRow {
  BAS_DD: string;
  ISU_CD: string; // 종목코드 6자리
  ISU_NM: string;
  MKT_NM: string; // "KOSPI" | "KOSDAQ"
  SECT_TP_NM: string;
  TDD_CLSPRC: string; // 당일 종가
  CMPPREVDD_PRC: string;
  FLUC_RT: string;
  TDD_OPNPRC: string;
  TDD_HGPRC: string;
  TDD_LWPRC: string;
  ACC_TRDVOL: string;
  ACC_TRDVAL: string;
  MKTCAP: string;
  LIST_SHRS: string;
}

export interface KrxApiResponse<T> {
  OutBlock_1: T[];
}
