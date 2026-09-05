export type RoleCategory = 'tech' | 'business' | 'commerce' | 'culinary' | 'general';
export type AgentEnvironment = 'claude-code' | 'antigravity' | 'claude-desktop' | 'cursor' | 'generic';
export type TaskCategory = 'adhoc' | 'routine_daily' | 'routine_weekly' | 'co-work';
export type ActionType = 'install_mcp' | 'install_skill' | 'create_rules' | 'setup_routine';

export interface PainPoint {
  task: string;
  currentPain: string;
  axOpportunity: string;
}

export interface RecommendedToolchain {
  mcps?: string[];
  skills?: string[];
  routines?: string[];
}

export interface ManualBoundary {
  task: string;
  reason: string;
  humanActionNote: string;
}

export interface RoleArchetype {
  id: string;
  name: string;
  category: RoleCategory;
  description: string;
  routineQuestions: string[];
  commonPainPoints: PainPoint[];
  manualBoundaries?: ManualBoundary[];
  recommendedToolchain: RecommendedToolchain;
}

export interface McpDefinition {
  id: string;
  name: string;
  type: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  safetyLevel: 'safe' | 'readonly' | 'requires_approval' | 'sensitive';
  notes?: string;
}

export interface OrganizationAddon {
  addonId: string;
  name: string;
  organization: string;
  version: string;
  description?: string;
  targetArchetypes?: string[];
  groundRules: string[];
  securityGuidelines?: string[];
  vcs?: {
    type: 'gitlab' | 'github' | 'gitea' | 'bitbucket' | 'other';
    baseUrl?: string;
    guidelinesRepo?: string;
    workflowPhases?: string[];
  };
  mcpCatalog?: McpDefinition[];
  recommendedPlugins?: string[];
  customQuestions?: string[];
}

export interface FeasibilityCheck {
  networkAccessible: boolean;
  dataAccessible: boolean;
  isPhysicalOnSite: boolean;
  notes?: string;
}

export interface ManualHumanTask {
  taskName: string;
  reason: string; // e.g., "고객사 폐쇄망/현장 직접 접속 필요", "물리적 조리/패키징 작업", "대면 협상 및 현장 실사"
  humanActionNote: string;
}

export interface UserTaskAnalysis {
  taskName: string;
  currentWorkflow: string;
  axWorkflow: string;
  category: TaskCategory;
  feasibility?: FeasibilityCheck;
  requiredTools: {
    mcps: string[];
    skills: string[];
  };
}

export interface ProvisioningStep {
  stepNumber: number;
  title: string;
  actionType: ActionType;
  details: Record<string, any>;
}

export interface Day1QuickWin {
  title: string;
  samplePrompt: string;
  expectedResult: string;
}

export interface AXBlueprint {
  userProfile: {
    name: string;
    role: string;
    organization: string;
    agentEnvironment: AgentEnvironment;
  };
  /** Raw interview answers preserved for downstream agents and SKILL.md analysis */
  interviewRaw?: {
    routineAnswers: string[];
    painPointAnswers: string[];
  };
  detectedArchetype: string;
  appliedAddon?: string;
  groundRules: string[];
  tasks: UserTaskAnalysis[];          // 에이전트 전환이 실제 가능한 검증된 과업
  manualTasks?: ManualHumanTask[];    // 네트워크/보안/물리적 제약으로 사람이 직접 수행해야 하는 과업
  actionPlan: {
    provisioningSteps: ProvisioningStep[];
    day1QuickWin: Day1QuickWin;
  };
}
