import { createMcpHandler } from "mcp-handler";
import { registerSearchStockTool } from "@/services/tools/search-stock";
import { registerDartCompanyTool } from "@/services/tools/dart-company";
import { registerDartFinancialsTool } from "@/services/tools/dart-financials";
import { registerNaverMarketDataTool } from "@/services/tools/naver-market-data";
import { registerValuationDataTool } from "@/services/tools/valuation-data";
import { registerSearchByIndustryTool } from "@/services/tools/search-by-industry";
import { registerBusinessContentTool } from "@/services/tools/business-content";
import { registerComputeBetaTool } from "@/services/tools/compute-beta";
import { registerPeergroupPopulationTool } from "@/services/tools/peergroup-population";
import { registerAuditReviewTool } from "@/services/tools/audit-review";

const handler = createMcpHandler(
  (server) => {
    registerSearchStockTool(server);

    // OpenDART (신규)
    registerDartCompanyTool(server);
    registerDartFinancialsTool(server);

    // 네이버 금융 (신규)
    registerNaverMarketDataTool(server);

    // 통합 밸류에이션 (신규)
    registerValuationDataTool(server);

    // 업종별 상장사 검색
    registerSearchByIndustryTool(server);

    // 사업보고서 원문 마크다운 추출
    registerBusinessContentTool(server);

    // 베타 직접 계산 (네이버 기반, KICPA 비의존)
    registerComputeBetaTool(server);

    // Peer 모집단 결정론적 조회 (분기말 스냅샷)
    registerPeergroupPopulationTool(server);

    // 감사의견·순자산 (Peer 재무적 타당성 검토용)
    registerAuditReviewTool(server);
  },
  {},
  {
    basePath: "/api",
    maxDuration: 120,
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
