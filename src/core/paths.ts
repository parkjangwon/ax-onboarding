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
   * Global AX Home: ~/.ax
   */
  static getAxHome(): string {
    const axHome = path.join(this.getHomeDir(), '.ax');
    if (!fs.existsSync(axHome)) {
      fs.mkdirSync(axHome, { recursive: true });
    }
    return axHome;
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
   * Global CLAUDE.md path: ~/.claude/CLAUDE.md
   */
  static getGlobalClaudeMdPath(): string {
    const claudeDir = this.getClaudeHome();
    if (!fs.existsSync(claudeDir)) {
      fs.mkdirSync(claudeDir, { recursive: true });
    }
    return path.join(claudeDir, 'CLAUDE.md');
  }

  /**
   * Global AGENTS.md path: ~/.ax/AGENTS.md
   */
  static getGlobalAgentsMdPath(): string {
    return path.join(this.getAxHome(), 'AGENTS.md');
  }
}
