import fs from 'node:fs';
import path from 'node:path';
import type { AXBlueprint } from '../core/types.js';
import { GlobalPaths } from '../core/paths.js';

export class ClaudeDesktopAdapter {
  static provision(blueprint: AXBlueprint): { success: boolean; modifiedFiles: string[] } {
    const modifiedFiles: string[] = [];

    // Cross-platform config path (macOS ~/Library/..., Windows %APPDATA%/Claude/...)
    const configPath = GlobalPaths.getClaudeDesktopConfigPath();
    const configDir = path.dirname(configPath);

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    let config: any = { mcpServers: {} };
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        config.mcpServers = config.mcpServers || {};
      } catch {
        config = { mcpServers: {} };
      }
    }

    const mcpStep = blueprint.actionPlan.provisioningSteps.find(s => s.actionType === 'install_mcp');
    if (mcpStep && mcpStep.details?.mcps) {
      let addedAny = false;
      for (const mcp of mcpStep.details.mcps) {
        if (!config.mcpServers[mcp.id]) {
          config.mcpServers[mcp.id] = {
            command: mcp.command || 'npx',
            args: mcp.args || ['-y', mcp.id],
            env: mcp.env || {}
          };
          addedAny = true;
        }
      }
      if (addedAny) {
        // Timestamped backup before first write so rollback can restore the original
        if (fs.existsSync(configPath)) {
          const backupPath = `${configPath}.bak_axonboard.${Date.now()}`;
          fs.writeFileSync(backupPath, fs.readFileSync(configPath));
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
        modifiedFiles.push(configPath);
      }
    }

    return { success: true, modifiedFiles };
  }
}
