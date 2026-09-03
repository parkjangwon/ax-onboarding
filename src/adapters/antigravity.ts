import fs from 'node:fs';
import path from 'node:path';
import type { AXBlueprint } from '../core/types.js';

export class AntigravityAdapter {
  static provision(blueprint: AXBlueprint, targetDir = process.cwd()): { success: boolean; modifiedFiles: string[] } {
    const modifiedFiles: string[] = [];

    // 1. Generate AGENTS.md
    const agentsMdPath = path.join(targetDir, 'AGENTS.md');
    const content = this.generateAgentsMd(blueprint);
    fs.writeFileSync(agentsMdPath, content, 'utf-8');
    modifiedFiles.push(agentsMdPath);

    // 2. Inject production runbooks into targetDir/runbooks
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

## Task Delegation Matrix
${taskList}

## Recurring Routines
- Automations and recurring schedules can be dispatched using the schedule tool or headless cron.
`;
  }
}
