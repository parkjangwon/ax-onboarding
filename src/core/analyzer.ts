import type { AXBlueprint, OrganizationAddon, RoleArchetype, UserTaskAnalysis, ProvisioningStep, TaskCategory } from './types.js';

export interface RawInterviewData {
  name: string;
  role: string;
  organization: string;
  agentEnvironment: 'claude-code' | 'antigravity' | 'claude-desktop' | 'cursor' | 'generic';
  routineAnswers: string[];
  painPointAnswers: string[];
}

export class TaskAnalyzer {
  static analyze(
    interview: RawInterviewData,
    archetype: RoleArchetype,
    addon?: OrganizationAddon
  ): AXBlueprint {
    const tasks: UserTaskAnalysis[] = [];

    // Map common archetype pain points + specific answers
    for (let i = 0; i < archetype.commonPainPoints.length; i++) {
      const item = archetype.commonPainPoints[i];
      const isRoutine = i === 1; // e.g. second item is typically routine
      
      tasks.push({
        taskName: item.task,
        currentWorkflow: item.currentPain,
        axWorkflow: item.axOpportunity,
        category: isRoutine ? 'routine_daily' : 'adhoc',
        opportunityScore: 5,
        requiredTools: {
          mcps: archetype.recommendedToolchain.mcps?.slice(0, 2) || [],
          skills: archetype.recommendedToolchain.skills?.slice(0, 2) || []
        }
      });
    }

    // Personalize: turn the user's own interview answers into first-class tasks,
    // routed to the matching runbook / tooling based on keyword heuristics.
    const MAX_PERSONAL_TASKS = 5;
    const answers = Array.from(new Set(
      [...(interview.routineAnswers || []), ...(interview.painPointAnswers || [])]
        .map(a => (a || '').trim())
        .filter(a => a.length >= 2)
    ));
    for (const ans of answers.slice(0, MAX_PERSONAL_TASKS)) {
      const routed = this.routeAnswerToAx(ans);
      tasks.push({
        taskName: ans.length > 80 ? `${ans.slice(0, 80)}…` : ans,
        currentWorkflow: '사용자가 매일 수작업으로 직접 반복 처리',
        axWorkflow: routed.axWorkflow,
        category: routed.category,
        opportunityScore: 5,
        requiredTools: {
          mcps: archetype.recommendedToolchain.mcps?.slice(0, 1) || [],
          skills: archetype.recommendedToolchain.skills?.slice(0, 1) || []
        }
      });
    }

    // Merge ground rules
    const groundRules = [
      ...(addon?.groundRules || [
        "신뢰성 확보: AI가 생성한 결과물은 반드시 사용자 검증 후 최종 배포",
        "토큰 최적화: 불필요한 반복 질의 지양 및 컨텍스트 경량화 유지"
      ])
    ];

    // Build provisioning steps
    const provisioningSteps: ProvisioningStep[] = [];
    let stepNum = 1;

    // 1. MCP Setup
    const mcpsToInstall = addon?.mcpCatalog || (archetype.recommendedToolchain.mcps || []).map(id => ({
      id,
      name: `${id} Server`,
      type: 'stdio' as const,
      safetyLevel: 'safe' as const
    }));

    if (mcpsToInstall.length > 0) {
      provisioningSteps.push({
        stepNumber: stepNum++,
        title: '필수 MCP(Model Context Protocol) 서버 구성',
        actionType: 'install_mcp',
        details: {
          mcps: mcpsToInstall
        }
      });
    }

    // 2. Rules / Harness creation
    provisioningSteps.push({
      stepNumber: stepNum++,
      title: '개인 및 조직 맞춤형 작업 규약(Harness) 생성 (CLAUDE.md / AGENTS.md)',
      actionType: 'create_rules',
      details: {
        rules: groundRules,
        role: interview.role,
        organization: interview.organization
      }
    });

    // 3. Routines / Scheduled Jobs
    provisioningSteps.push({
      stepNumber: stepNum++,
      title: '반복 정기 업무 스케줄러(루틴/자동화) 등록',
      actionType: 'setup_routine',
      details: {
        routines: archetype.recommendedToolchain.routines || ['daily-summary']
      }
    });

    // Day 1 Quick win
    const day1QuickWin = this.generateQuickWin(archetype, addon);

    // Filter and map human-only / on-site boundaries (no fake automation)
    const manualTasks = (archetype.manualBoundaries || []).map(b => ({
      taskName: b.task,
      reason: b.reason,
      humanActionNote: b.humanActionNote
    }));

    return {
      userProfile: {
        name: interview.name,
        role: interview.role,
        organization: interview.organization,
        agentEnvironment: interview.agentEnvironment
      },
      interviewRaw: {
        routineAnswers: interview.routineAnswers || [],
        painPointAnswers: interview.painPointAnswers || []
      },
      detectedArchetype: archetype.name,
      appliedAddon: addon?.name,
      groundRules,
      tasks,
      manualTasks,
      actionPlan: {
        provisioningSteps,
        day1QuickWin
      }
    };
  }

  /**
   * Deterministic keyword routing: maps the user's own words (interview answers)
   * to the injected runbooks / MCP tooling, so the blueprint reflects what the
   * user actually said instead of archetype templates only.
   */
  private static routeAnswerToAx(answer: string): { axWorkflow: string; category: TaskCategory } {
    const lower = answer.toLowerCase();
    if (/(로그|에러|오류|장애|배치|인시던트|서버점검|error|log|incident|outage)/i.test(lower)) {
      return {
        axWorkflow: '에이전트가 01-troubleshoot 런북 프로토콜(로그 추적 → 원인 코드 특정 → 안전 패치 제안)을 백그라운드에서 자동 적용',
        category: 'adhoc'
      };
    }
    if (/(고객|문의|민원|불만|회신|답변|답장|cs|inquiry|complaint)/i.test(lower)) {
      return {
        axWorkflow: '에이전트가 02-customer-inquiry 런북에 따라 [현상 - 원인 - 조치방안] 3단계 공식 회신 초안을 즉시 산출',
        category: 'adhoc'
      };
    }
    if (/(수정|패치|버그|리팩토링|배포|머지|mr|pr|branch|hotfix|patch)/i.test(lower)) {
      return {
        axWorkflow: '에이전트가 03-safe-patch 런북에 따라 하위 호환성을 유지하며 보수적으로 패치하고 MR/PR 브랜치까지 구성',
        category: 'adhoc'
      };
    }
    if (/(화면|ui|버튼|브라우저|프론트|캡처|e2e|browser)/i.test(lower)) {
      return {
        axWorkflow: '에이전트가 04-browser-e2e 런북(Playwright)으로 직접 화면을 가동해 콘솔 오류와 UI 결함을 캡처·분석',
        category: 'adhoc'
      };
    }
    if (/(엑셀|시트|주문|재고|발주|취합|정리|보고서|보고|원가|매출|송장|데이터|db|sql)/i.test(lower)) {
      return {
        axWorkflow: '에이전트가 연결된 MCP 도구(스프레드시트/DB)를 백그라운드에서 호출해 완결된 결과물(표/정리본)을 즉시 산출',
        category: 'routine_daily'
      };
    }
    return {
      axWorkflow: '사용자가 일상어로 이 업무를 요청하면, 에이전트가 등록된 런북과 도구를 백그라운드에서 자동 적용해 초안/결과물을 산출',
      category: 'routine_daily'
    };
  }

  private static generateQuickWin(archetype: RoleArchetype, addon?: OrganizationAddon) {
    switch (archetype.category) {
      case 'tech':
        return {
          title: '최근 이슈 로그 분석 및 원인 파악 즉시 체험',
          samplePrompt: '어제 발생한 오류 로그를 확인해서, 어떤 코드 라인에서 예외가 발생했는지와 재현 조건을 분석해줘.',
          expectedResult: '에이전트가 스택 트레이스 기반으로 대상 파일과 원인 코드, 추천 예외 처리 코드를 즉시 제시'
        };
      case 'commerce':
        return {
          title: '주문 엑셀 데이터 정제 및 배송 양식 변환 체험',
          samplePrompt: '오늘 인입된 주문 엑셀 파일에서 수령인별 배송 메시지와 운송장 출력용 데이터를 표준 양식으로 정리해줘.',
          expectedResult: '수작업 필요 없이 택배사 대량 등록용 정제 엑셀 파일 즉시 생성'
        };
      case 'culinary':
        return {
          title: '오늘의 메뉴별 식자재 원가 및 발주 권고 산출 체험',
          samplePrompt: '오늘 예약 40인 기준으로 필요한 안심, 연어, 채소류의 적정 발주량과 1인당 식자재 원가를 계산해줘.',
          expectedResult: '현재 재고와 시세를 반영한 즉시 발주용 품목별 수량표 생성'
        };
      default:
        return {
          title: '주간 업무 보고서 초안 원클릭 생성 체험',
          samplePrompt: '이번 주에 내가 완료한 작업 목록과 메모를 바탕으로 정형화된 주간 업무 보고서를 작성해줘.',
          expectedResult: '30초 만에 완결된 구조의 주간 업무 보고서 초안 완성'
        };
    }
  }
}
