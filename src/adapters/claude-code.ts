import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { AXBlueprint } from '../core/types.js';
import { GlobalPaths } from '../core/paths.js';
import { RunbookInjector } from '../core/runbooks.js';

export class ClaudeCodeAdapter {
  static provision(blueprint: AXBlueprint, targetDir?: string): { success: boolean; modifiedFiles: string[] } {
    const modifiedFiles: string[] = [];

    // 1. Generate Dedicated AX Constitution (~/.ax/CLAUDE.md or <targetDir>/.ax/CLAUDE.md)
    const axDir = targetDir ? path.join(targetDir, '.ax') : GlobalPaths.getAxHome();
    if (!fs.existsSync(axDir)) {
      fs.mkdirSync(axDir, { recursive: true });
    }

    const axClaudeMd = path.join(axDir, 'CLAUDE.md');
    const claudeMdContent = this.generateClaudeMd(blueprint);
    fs.writeFileSync(axClaudeMd, claudeMdContent, 'utf-8');
    modifiedFiles.push(axClaudeMd);

    // 2. Non-destructively inject reference line into user's existing CLAUDE.md
    const userClaudeMd = targetDir 
      ? path.join(targetDir, 'CLAUDE.md') 
      : GlobalPaths.getGlobalClaudeMdPath();

    // Forward slashes in the link line: rollback filters match on '.ax/CLAUDE.md'
    // regardless of platform, so the reference must be separator-stable.
    const linkLine = `@${axClaudeMd.split(path.sep).join('/')}`;
    let existingContent = '';
    if (fs.existsSync(userClaudeMd)) {
      existingContent = fs.readFileSync(userClaudeMd, 'utf-8');
    }

    if (!existingContent.includes(linkLine)) {
      const refBlock = existingContent.length === 0
        ? `# AX Onboarding Rule Reference\n${linkLine}\n`
        : existingContent.endsWith('\n')
          ? `\n# AX Onboarding Rule Reference\n${linkLine}\n`
          : `\n\n# AX Onboarding Rule Reference\n${linkLine}\n`;

      fs.mkdirSync(path.dirname(userClaudeMd), { recursive: true });
      fs.writeFileSync(userClaudeMd, existingContent + refBlock, 'utf-8');
      modifiedFiles.push(userClaudeMd);
    }

    // 3. Inject runbooks
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
          let addedAny = false;
          for (const mcp of mcpStep.details.mcps) {
            if (!claudeJson.mcpServers[mcp.id]) {
              claudeJson.mcpServers[mcp.id] = {
                type: mcp.type || 'stdio',
                command: mcp.command || 'npx',
                args: mcp.args || ['-y', mcp.id],
                env: mcp.env || {}
              };
              addedAny = true;
            }
          }
          if (addedAny) {
            // Safely backup (timestamped, so repeated runs never clobber the original)
            // and write
            const backupPath = `${claudeJsonPath}.bak_axonboard.${Date.now()}`;
            fs.writeFileSync(backupPath, fs.readFileSync(claudeJsonPath));
            fs.writeFileSync(claudeJsonPath, JSON.stringify(claudeJson, null, 2), 'utf-8');
            modifiedFiles.push(claudeJsonPath);
          }
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
    const interviewExcerpts = (blueprint.interviewRaw?.routineAnswers || [])
      .map(a => (a || '').trim())
      .filter(a => a.length > 0)
      .map(a => `- "${a}"`)
      .join('\n');

    return `# Project & Workflow Rules (AX Onboarded)

## Role & Profile
- **User**: ${blueprint.userProfile.name} (${blueprint.userProfile.role})
- **Organization**: ${blueprint.userProfile.organization}
- **Archetype**: ${blueprint.detectedArchetype}
${blueprint.appliedAddon ? `- **Active Addon**: ${blueprint.appliedAddon}\n` : ''}
${interviewExcerpts ? `## 실제 업무 루틴 (사용자 인터뷰 발췌)
아래는 사용자가 직접 말한 실제 반복 업무입니다. 관련 요청이 오면 이 맥락을 우선 참고하십시오:
${interviewExcerpts}

` : ''}## Ground Rules (작업 규약)
${rulesList}

## 🧠 Autonomous Intent Routing (무명령어 자연어 자동 실행 원칙)
⚠️ **절대 준수: 사용자는 명령어(/command), 파일 경로(@runbooks/...), 도구 이름을 외우거나 직접 입력할 필요가 없습니다.**
사용자가 일상적인 대화(자연어)로 업무를 던지면, 에이전트는 아래 의도(Intent)에 따라 백그라운드에서 적절한 런북과 도구를 무의식적인 반사신경처럼 스스로 선택하여 즉시 실행해야 합니다:

1. **장애/에러/로그 언급 시 ("에러 났어", "배치 왜 죽었지", "로그 좀 봐줘")**:
   - 별도 지시가 없어도 \`~/.ax/runbooks/01-troubleshoot.md\` 규약(SSH 로그 추적 ➔ 코드 라인 특정 ➔ DB 무결성 점검 ➔ 방어 패치)을 백그라운드에서 즉시 자동 적용합니다.
2. **고객/사내 문의 언급 시 ("고객사에서 문의 왔어", "왜 안 되냐는데", "답변 보고서 써줘")**:
   - 자동으로 \`~/.ax/runbooks/02-customer-inquiry.md\` 규약에 따라 원인을 추적하고 [현상 - 원인 - 조치방안] 3단계 공식 보고서 포맷으로 즉시 회신합니다.
3. **코드 수정/버그 패치 요청 시 ("이거 고쳐줘", "버그 수정해줘", "기능 추가해줘")**:
   - 자동으로 \`~/.ax/runbooks/03-safe-patch.md\` 규약에 따라 하위 호환성을 유지하며 보수적으로 패치하고 MR/PR 브랜치를 구성합니다.
4. **화면 이상/UI 결함 언급 시 ("화면 왜 깨져", "버튼 안 눌려", "UI 이상해")**:
   - 자동으로 \`~/.ax/runbooks/04-browser-e2e.md\` (Playwright 브라우저 가동하여 캡처 및 콘솔 오류 분석)를 스스로 실행합니다.
5. **사무/엑셀/주문/재고/원가 언급 시 ("엑셀 취합해줘", "이상치 찾아줘", "발주서 뽑아줘")**:
   - 등록된 MCP 도구를 백그라운드에서 스스로 호출하여 완결된 결과물(표/정리본)을 출력합니다.

사용자에게 절대 "어떤 명령어나 런북을 실행할까요?"라고 되묻지 마십시오. 모든 런북과 도구는 에이전트의 무의식적 내부 반사신경으로 완결되어야 합니다.

## 환경 확장 규약 (Harness Extension Protocol)
사용자가 온보딩 이후 추가 세팅(새 MCP 등록, 도구 설치, 규칙 추가 등)을 요청하면, 아래 절차를 반드시 따르십시오. 이 규약은 에이전트의 모든 자기 확장에서 롤백 가능성과 안전장치가 무너지지 않도록 하기 위한 것입니다:
1. **수정 전 백업**: ~/.claude.json, claude_desktop_config.json 등 기존 설정 파일을 편집하기 전에 반드시 \`<원본경로>.bak_axonboard.<타임스탬프>\` 형식으로 백업합니다.
2. **매니페스트 기록**: 새로 생성/수정한 파일과 로컬 프로젝트에 설치한 경로를 \`~/.ax/.manifest.json\`에 기록합니다. 이 기록이 있어야 언제든 롤백으로 원상복구할 수 있습니다.
3. **비파괴 편집**: 사용자의 기존 CLAUDE.md/AGENTS.md는 통째로 덮지 말고 참조 한 줄(\`@...\`)만 추가/제거합니다. 같은 이름의 기존 파일(런북 포함)을 절대 덮어쓰지 않습니다.
4. **권한 최소화 우선**: DB·서버 접속에는 읽기 전용(READONLY) 계정을 먼저 제안하고, 파괴적인 명령(rm -rf, drop 등)은 반드시 사용자 승인을 받은 뒤 실행합니다.
5. **검증 후 보고**: 세팅이 끝나면 연결 테스트나 파일 확인으로 동작을 검증하고, 무엇을 변경했는지 요약해 사용자에게 보고합니다.

## Agentic Tasks (에이전트 위임 과업)
${taskList}

${(blueprint.manualTasks || []).length > 0 ? `## Human-Only Boundaries (사람 직접 수행 과업 - 에이전트 개입 금지)
⚠️ 아래 과업은 외부망 차단, 현장 출장, 물리적 조작 등 현실적 제약이 있는 영역입니다. 에이전트는 이 작업을 대신하려 들지 말고 사람의 지침을 기다려야 합니다:
${blueprint.manualTasks!.map(m => `- **${m.taskName}**: ${m.reason} (조치: ${m.humanActionNote})`).join('\n')}
` : ''}
## Day-1 Quick Win Guide
- **첫 번째 추천 과업**: ${blueprint.actionPlan.day1QuickWin.title}
- **추천 프롬프트 (일상 자연어)**:
  > "${blueprint.actionPlan.day1QuickWin.samplePrompt}"
`;
  }
}
