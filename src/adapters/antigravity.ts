import fs from 'node:fs';
import path from 'node:path';
import type { AXBlueprint } from '../core/types.js';

export class AntigravityAdapter {
  static provision(blueprint: AXBlueprint, targetDir?: string): { success: boolean; modifiedFiles: string[] } {
    const { GlobalPaths } = require('../core/paths.js');
    const modifiedFiles: string[] = [];

    // 1. Generate Global or Project-local AGENTS.md
    const agentsMdPath = targetDir 
      ? path.join(targetDir, 'AGENTS.md')
      : GlobalPaths.getGlobalAgentsMdPath();

    const content = this.generateAgentsMd(blueprint);
    fs.writeFileSync(agentsMdPath, content, 'utf-8');
    modifiedFiles.push(agentsMdPath);

    // 2. Inject production runbooks
    const { RunbookInjector } = require('../core/runbooks.js');
    const runbookFiles = RunbookInjector.inject(targetDir);
    modifiedFiles.push(...runbookFiles);

    return { success: true, modifiedFiles };
  }

  private static generateAgentsMd(blueprint: AXBlueprint): string {
    const rulesList = blueprint.groundRules.map(r => `- ${r}`).join('\n');
    const taskList = blueprint.tasks
      .map(t => `- **${t.taskName}**: ${t.axWorkflow}`)
      .join('\n');

    return `# Agent Operational Contract (AGENTS.md)

## Persona & Domain Context
- **Organization**: ${blueprint.userProfile.organization}
- **Role**: ${blueprint.userProfile.role}
- **Archetype**: ${blueprint.detectedArchetype}

## Ground Rules
${rulesList}

## Autonomous Intent Routing (Zero-Command Execution)
The user will communicate using casual, conversational language. DO NOT require slash commands (/command), file path mentions (@runbooks/...), or tool names.
Automatically map user intents to internal runbooks and tools in the background:
- Errors, log traces, batch failures -> Apply \`~/.ax/runbooks/01-troubleshoot.md\` protocol.
- Inquiries, user complaints -> Apply \`~/.ax/runbooks/02-customer-inquiry.md\` (Symptoms - Root Cause - Action format).
- Bug fixes, patches -> Apply \`~/.ax/runbooks/03-safe-patch.md\` (non-breaking, conservative).
- UI defects -> Apply \`~/.ax/runbooks/04-browser-e2e.md\` (Playwright inspection).
- Data, sheets, stock, orders -> Call connected MCP tools silently.

## Task Delegation Matrix
${taskList}

## Recurring Routines
- Automations and recurring schedules can be dispatched using the schedule tool or headless cron.
`;
  }
}
