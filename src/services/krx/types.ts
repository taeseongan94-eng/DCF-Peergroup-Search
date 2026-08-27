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

/**
 * sto/stk_isu_base_info, sto/ksq_isu_base_info 응답 레코드 (유가증권/코스닥 종목기본정보).
 * 주의: 여기서는 ISU_CD가 12자리 표준코드다 (일별매매정보 KrxStockRow의 ISU_CD는 6자리 단축코드라 의미가 다름) — 종목 매칭엔 ISU_SRT_CD(6자리)를 쓴다.
 */
export interface KrxStockBaseInfoRow {
  ISU_CD: string; // 표준코드 12자리 (예: "KR7005930003")
  ISU_SRT_CD: string; // 단축코드 6자리
  ISU_NM: string;
  ISU_ABBRV: string;
  ISU_ENG_NM: string;
  LIST_DD: string; // 상장일
  MKT_TP_NM: string; // "KOSPI" | "KOSDAQ"
  SECUGRP_NM: string;
  SECT_TP_NM: string;
  KIND_STKCERT_TP_NM: string;
  PARVAL: string; // 액면가
  LIST_SHRS: string; // 상장주식수
}

export interface KrxApiResponse<T> {
  OutBlock_1: T[];
}
