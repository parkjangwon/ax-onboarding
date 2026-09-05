import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

export class GlobalPaths {
  /**
   * User home directory (Cross-platform: Windows C:\Users\xxx, Mac /Users/xxx, Linux /home/xxx)
   */
  static getHomeDir(): string {
    return os.homedir();
  }

  /**
   * Global AX Home: ~/.ax (pure path resolution — writers create it on demand)
   */
  static getAxHome(): string {
    return path.join(this.getHomeDir(), '.ax');
  }

  /**
   * Global Claude configuration directory: ~/.claude
   */
  static getClaudeHome(): string {
    return path.join(this.getHomeDir(), '.claude');
  }

  /**
   * Global Claude settings file: ~/.claude.json
   */
  static getClaudeJsonPath(): string {
    return path.join(this.getHomeDir(), '.claude.json');
  }

  /**
   * Global Claude Desktop config path across OS
   */
  static getClaudeDesktopConfigPath(): string {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      const appData = process.env.APPDATA || path.join(this.getHomeDir(), 'AppData', 'Roaming');
      return path.join(appData, 'Claude', 'claude_desktop_config.json');
    }
    // macOS
    return path.join(this.getHomeDir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }

  /**
   * Global Runbooks directory: ~/.ax/runbooks
   */
  static getGlobalRunbooksDir(): string {
    const dir = path.join(this.getAxHome(), 'runbooks');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Global secure credentials file: ~/.ax/.env.mcp
   */
  static getGlobalEnvPath(): string {
    return path.join(this.getAxHome(), '.env.mcp');
  }

  /**
   * Global CLAUDE.md path: ~/.claude/CLAUDE.md (pure path resolution — writers create the directory on demand)
   */
  static getGlobalClaudeMdPath(): string {
    return path.join(this.getClaudeHome(), 'CLAUDE.md');
  }

  /**
   * Global AGENTS.md path: ~/.ax/AGENTS.md
   */
  static getGlobalAgentsMdPath(): string {
    return path.join(this.getAxHome(), 'AGENTS.md');
  }
}
