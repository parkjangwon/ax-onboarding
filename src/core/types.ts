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

export interface RoleArchetype {
  id: string;
  name: string;
  category: RoleCategory;
  description: string;
  routineQuestions: string[];
  commonPainPoints: PainPoint[];
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

export interface UserTaskAnalysis {
  taskName: string;
  currentWorkflow: string;
  axWorkflow: string;
  category: TaskCategory;
  opportunityScore: number;
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
  detectedArchetype: string;
  appliedAddon?: string;
  groundRules: string[];
  tasks: UserTaskAnalysis[];
  actionPlan: {
    provisioningSteps: ProvisioningStep[];
    day1QuickWin: Day1QuickWin;
  };
}
