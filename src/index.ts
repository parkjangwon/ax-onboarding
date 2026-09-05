// ax-onboarding — public library entry point.
// The interactive CLI entry lives in cli.ts (see package.json "bin" -> bin/ax-onboard.mjs).
export { ArchetypeManager } from './core/archetypes.js';
export { AddonLoader } from './addons/loader.js';
export { TaskAnalyzer } from './core/analyzer.js';
export { AdapterRegistry } from './adapters/index.js';
export { CredentialManager } from './core/credentials.js';
export { PreflightHealthCheck } from './core/healthcheck.js';
export { RollbackManager } from './core/rollback.js';
export { ManifestManager } from './core/manifest.js';
export { GlobalPaths } from './core/paths.js';
export { SkillFinder } from './core/skill-finder.js';
export { McpFinder } from './core/mcp-finder.js';
export { RunbookInjector } from './core/runbooks.js';
export type { AXBlueprint, AgentEnvironment } from './core/types.js';
