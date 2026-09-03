import type { AXBlueprint, AgentEnvironment } from '../core/types.js';
import { ClaudeCodeAdapter } from './claude-code.js';
import { AntigravityAdapter } from './antigravity.js';
import { ClaudeDesktopAdapter } from './claude-desktop.js';

export class AdapterRegistry {
  static dispatch(env: AgentEnvironment, blueprint: AXBlueprint, targetDir?: string) {
    switch (env) {
      case 'claude-code':
        return ClaudeCodeAdapter.provision(blueprint, targetDir);
      case 'antigravity':
        return AntigravityAdapter.provision(blueprint, targetDir);
      case 'claude-desktop':
        return ClaudeDesktopAdapter.provision(blueprint);
      default:
        // Generic: generate both CLAUDE.md and AGENTS.md
        const res1 = ClaudeCodeAdapter.provision(blueprint, targetDir);
        const res2 = AntigravityAdapter.provision(blueprint, targetDir);
        return {
          success: res1.success && res2.success,
          modifiedFiles: Array.from(new Set([...res1.modifiedFiles, ...res2.modifiedFiles]))
        };
    }
  }
}
