import fs from 'node:fs';
import path from 'node:path';
import type { AXBlueprint } from '../core/types.js';
import { GlobalPaths } from '../core/paths.js';
import { RunbookInjector } from '../core/runbooks.js';

export class AntigravityAdapter {
  static provision(blueprint: AXBlueprint, targetDir?: string): { success: boolean; modifiedFiles: string[] } {
    const modifiedFiles: string[] = [];

    // 1. Generate Dedicated AX Constitution (~/.ax/AGENTS.md or <targetDir>/.ax/AGENTS.md)
    const axDir = targetDir ? path.join(targetDir, '.ax') : GlobalPaths.getAxHome();
    if (!fs.existsSync(axDir)) {
      fs.mkdirSync(axDir, { recursive: true });
    }

    const axAgentsMd = path.join(axDir, 'AGENTS.md');
    const content = this.generateAgentsMd(blueprint);
    fs.writeFileSync(axAgentsMd, content, 'utf-8');
    modifiedFiles.push(axAgentsMd);

    // 2. Non-destructively inject reference line into user's existing AGENTS.md
    const userAgentsMd = targetDir 
      ? path.join(targetDir, 'AGENTS.md')
      : path.join(GlobalPaths.getHomeDir(), 'AGENTS.md');

    // Forward slashes in the link line: rollback filters match on '.ax/AGENTS.md'
    // regardless of platform, so the reference must be separator-stable.
    const linkLine = `@${axAgentsMd.split(path.sep).join('/')}`;
    let existingContent = '';
    if (fs.existsSync(userAgentsMd)) {
      existingContent = fs.readFileSync(userAgentsMd, 'utf-8');
    }

    if (!existingContent.includes(linkLine)) {
      const refBlock = existingContent.length === 0
        ? `# Agent Operational Contract\n\n<!-- AX Onboarding Contract Reference -->\n${linkLine}\n`
        : existingContent.endsWith('\n')
          ? `\n<!-- AX Onboarding Contract Reference -->\n${linkLine}\n`
          : `\n\n<!-- AX Onboarding Contract Reference -->\n${linkLine}\n`;

      fs.writeFileSync(userAgentsMd, existingContent + refBlock, 'utf-8');
      modifiedFiles.push(userAgentsMd);
    }

    // 3. Inject production runbooks
    const runbookFiles = RunbookInjector.inject(targetDir);
    modifiedFiles.push(...runbookFiles);

    return { success: true, modifiedFiles };
  }

  private static generateAgentsMd(blueprint: AXBlueprint): string {
    const rulesList = blueprint.groundRules.map(r => `- ${r}`).join('\n');
    const taskList = blueprint.tasks
      .map(t => `- **${t.taskName}**: ${t.axWorkflow}`)
      .join('\n');
    const interviewExcerpts = (blueprint.interviewRaw?.routineAnswers || [])
      .map(a => (a || '').trim())
      .filter(a => a.length > 0)
      .map(a => `- "${a}"`)
      .join('\n');

    return `# Agent Operational Contract (AGENTS.md)

## Persona & Domain Context
- **Organization**: ${blueprint.userProfile.organization}
- **Role**: ${blueprint.userProfile.role}
- **Archetype**: ${blueprint.detectedArchetype}
${interviewExcerpts ? `
## User's Own Routine (Raw Interview Excerpts)
The following are the user's actual recurring tasks, in their own words. Prioritize this context:
${interviewExcerpts}
` : ''}
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

## Task Delegation Matrix (Verified Feasible on PC)
${taskList}

${(blueprint.manualTasks || []).length > 0 ? `## Human-Only Boundaries (Do NOT Attempt with Agent)
The following tasks involve physical on-site presence, air-gapped networks, or face-to-face interactions. The agent MUST NOT attempt to handle these autonomously:
${blueprint.manualTasks!.map(m => `- **${m.taskName}**: ${m.reason} -> Maintain human manual action (${m.humanActionNote})`).join('\n')}
` : ''}
## Recurring Routines
- Automations and recurring schedules can be dispatched using the schedule tool or headless cron.
`;
  }
}
