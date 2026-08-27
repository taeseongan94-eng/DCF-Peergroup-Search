import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveCorpCode, getCompanyInfo } from "../common/stock-code-resolver";
import { fetchFinancials, fetchAuditOpinion, extractAuditOpinion, extractNetAssets } from "../opendart/client";
import { REPORT_CODE } from "../opendart/constants";
import { handleApiError } from "../utils/error-handler";

const AuditReviewInputSchema = z.object({
  stock_codes: z.union([
    z.string().min(1).max(10),
    z.array(z.string().min(1).max(10)).min(1).max(10),
  ]).describe("종목코드 6자리. 단일 문자열 또는 최대 10개 배열"),
  year: z.string().regex(/^\d{4}$/).describe("사업연도 YYYY (예: '2024')"),
  report_type: z.enum(["annual", "semi", "q1", "q3"]).default("annual")
    .describe("보고서 유형: annual(사업보고서, 기본), semi(반기), q1(1분기), q3(3분기)"),
  api_key: z.string().optional().describe("OpenDART API 키 (미입력 시 서버 환경변수 사용)"),
});

type AuditReviewInput = z.infer<typeof AuditReviewInputSchema>;

interface AuditReviewResult {
  code: string;
  name: string | null;
  auditOpinion: {
    auditor: string | null;
    opinion: string | null;
    emphasisMatter: string | null;
    coreAuditMatter: string | null;
    settlementDate: string | null;
  } | null;
  netAssets: number | null;
  error?: string;
}

export function registerAuditReviewTool(server: McpServer): void {
  server.registerTool(
    "get_audit_review_data",
    {
      title: "감사의견·순자산 조회 (Peer 재무적 타당성 검토용)",
      description: `Peer Group의 "재무적 타당성 검토"에 필요한 감사의견과 순자산(자본총계)을 DART 공식 데이터로 조회합니다.
이자부부채/비지배지분/세전이익/시가총액/베타는 이 도구가 아니라 valuation_get_data 를 쓰세요 (역할 분담).

[반환 필드]
- auditOpinion: { auditor(감사인), opinion(감사의견, 예: "적정의견"), emphasisMatter(강조사항), coreAuditMatter(핵심감사사항), settlementDate(결산일) }
- netAssets: 순자산(자본총계), 원 단위 정수

[출처]
- 감사의견: OpenDART 회계감사인의 명칭 및 감사의견 API (accnutAdtorNmNdAdtOpinion)
- 순자산: OpenDART 전체 재무제표(fnlttSinglAcntAll)의 재무상태표 "자본총계" 계정 — 연결(CFS) 우선, 없으면 별도(OFS) 자동 폴백

[파라미터]
- stock_codes: 종목코드 6자리 (단일 문자열 또는 최대 10개 배열)
- year: 사업연도 YYYY — report_type 이 가리키는 보고서가 다루는 회계연도
- report_type: annual(사업보고서, 기본)/semi(반기)/q1(1분기)/q3(3분기)

[Peer 재무 타당성 검토 워크플로우]
Peer Group 확정 후, 이 도구로 감사의견·순자산을 받고 valuation_get_data 로 세전이익·주식수·시가총액을 받아 합쳐서 EPS/BPS 등을 계산하세요. 감사의견이 "적정의견"이 아니거나(한정/부적정/의견거절), 순자산이 자본잠식 수준이면 Peer 부적합 판단 근거가 됩니다.`,
      inputSchema: AuditReviewInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params: AuditReviewInput) => {
      const codes = Array.isArray(params.stock_codes) ? params.stock_codes : [params.stock_codes];
      const reportCode = REPORT_CODE[params.report_type];
      const apiKey = params.api_key;

      try {
        const results = await Promise.all(
          codes.map((code) => processCompany(code, params.year, reportCode, apiKey))
        );
        const output = results.length === 1 ? results[0] : results;
        return { content: [{ type: "text" as const, text: JSON.stringify(output) }] };
      } catch (error) {
        return { content: [{ type: "text" as const, text: handleApiError(error) }], isError: true };
      }
    },
  );
}

async function processCompany(
  code: string,
  year: string,
  reportCode: string,
  apiKey: string | undefined,
): Promise<AuditReviewResult> {
  try {
    const corpCode = await resolveCorpCode(code);

    const [auditResult, financialResult, companyResult] = await Promise.allSettled([
      fetchAuditOpinion(corpCode, year, reportCode, apiKey),
      fetchFinancials(corpCode, year, reportCode, "CFS", apiKey),
      getCompanyInfo(code, apiKey),
    ]);

    const name = companyResult.status === "fulfilled" ? companyResult.value.corp_name : null;

    const auditOpinion = auditResult.status === "fulfilled"
      ? extractAuditOpinion(auditResult.value, reportCode)
      : null;

    const netAssets = financialResult.status === "fulfilled"
      ? extractNetAssets(financialResult.value)
      : null;

    return {
      code,
      name,
      auditOpinion: auditOpinion
        ? {
            auditor: auditOpinion.auditor,
            opinion: auditOpinion.opinion,
            emphasisMatter: auditOpinion.emphasisMatter,
            coreAuditMatter: auditOpinion.coreAuditMatter,
            settlementDate: auditOpinion.settlementDate,
          }
        : null,
      netAssets,
    };
  } catch (error) {
    return {
      code,
      name: null,
      auditOpinion: null,
      netAssets: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
