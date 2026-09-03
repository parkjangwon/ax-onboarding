import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { AXBlueprint } from '../core/types.js';

export class ClaudeCodeAdapter {
  static provision(blueprint: AXBlueprint, targetDir = process.cwd()): { success: boolean; modifiedFiles: string[] } {
    const modifiedFiles: string[] = [];

    // 1. Generate project-local or target CLAUDE.md
    const claudeMdPath = path.join(targetDir, 'CLAUDE.md');
    const claudeMdContent = this.generateClaudeMd(blueprint);
    fs.writeFileSync(claudeMdPath, claudeMdContent, 'utf-8');
    modifiedFiles.push(claudeMdPath);

    // 2. Inject production runbooks into targetDir/runbooks
    const { RunbookInjector } = require('../core/runbooks.js');
    const runbookFiles = RunbookInjector.inject(targetDir);
    modifiedFiles.push(...runbookFiles);

    // 2. Prepare MCP configuration snippet
    const homeDir = os.homedir();
    const claudeJsonPath = path.join(homeDir, '.claude.json');
    if (fs.existsSync(claudeJsonPath)) {
      try {
        const claudeJson = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf-8'));
        claudeJson.mcpServers = claudeJson.mcpServers || {};

        const mcpStep = blueprint.actionPlan.provisioningSteps.find(s => s.actionType === 'install_mcp');
        if (mcpStep && mcpStep.details?.mcps) {
          for (const mcp of mcpStep.details.mcps) {
            if (!claudeJson.mcpServers[mcp.id]) {
              claudeJson.mcpServers[mcp.id] = {
                type: mcp.type || 'stdio',
                command: mcp.command || 'npx',
                args: mcp.args || ['-y', mcp.id],
                env: mcp.env || {}
              };
            }
          }
          // Safely backup and write
          fs.writeFileSync(`${claudeJsonPath}.bak_axonboard`, fs.readFileSync(claudeJsonPath));
          fs.writeFileSync(claudeJsonPath, JSON.stringify(claudeJson, null, 2), 'utf-8');
          modifiedFiles.push(claudeJsonPath);
        }
      } catch (err) {
        console.warn('Could not automatically patch ~/.claude.json, skipping file modification:', err);
      }
    }

    return { success: true, modifiedFiles };
  }

  private static generateClaudeMd(blueprint: AXBlueprint): string {
    const rulesList = blueprint.groundRules.map(r => `- ${r}`).join('\n');
    const taskList = blueprint.tasks
      .map(t => `### [${t.taskName}] (${t.category})\n- **현재 방식**: ${t.currentWorkflow}\n- **AX 에이전틱 방식**: ${t.axWorkflow}`)
      .join('\n\n');

    return `# Project & Workflow Rules (AX Onboarded)

## Role & Profile
- **User**: ${blueprint.userProfile.name} (${blueprint.userProfile.role})
- **Organization**: ${blueprint.userProfile.organization}
- **Archetype**: ${blueprint.detectedArchetype}
${blueprint.appliedAddon ? `- **Active Addon**: ${blueprint.appliedAddon}\n` : ''}

## Ground Rules (작업 규약)
${rulesList}

## Agentic Tasks (에이전트 위임 과업)
${taskList}

## Day-1 Quick Win Guide
- **첫 번째 추천 과업**: ${blueprint.actionPlan.day1QuickWin.title}
- **추천 프롬프트**:
  > "${blueprint.actionPlan.day1QuickWin.samplePrompt}"
`;
  }
}
