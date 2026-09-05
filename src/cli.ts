#!/usr/bin/env node
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ArchetypeManager } from './core/archetypes.js';
import { AddonLoader } from './addons/loader.js';
import { TaskAnalyzer } from './core/analyzer.js';
import { AdapterRegistry } from './adapters/index.js';
import type { AgentEnvironment } from './core/types.js';

async function main() {
  const rl = readline.createInterface({ input, output });

  console.log('\n======================================================');
  console.log('       🚀 Universal AX Onboarding Framework           ');
  console.log('       Transforming Daily Work into Agentic Power     ');
  console.log('======================================================\n');

  // Handle Rollback flag
  if (process.argv.includes('--rollback') || process.argv.includes('-r')) {
    const { RollbackManager } = await import('./core/rollback.js');
    const result = RollbackManager.rollback();
    console.log('✨ [Rollback 완료] 에이전트 설정 및 생성 파일이 안전하게 원상복구되었습니다.');
    if (result.restoredFiles.length > 0) {
      result.restoredFiles.forEach(f => console.log(` - 복원됨: ${f}`));
    }
    if (result.deletedFiles.length > 0) {
      result.deletedFiles.forEach(f => console.log(` - 정리됨: ${f}`));
    }
    rl.close();
    process.exit(0);
  }

  // Check for auto-detected Addon
  let addon = AddonLoader.autoDetectAddon();
  if (addon) {
    console.log(`💡 조직 애드온 감지됨: [${addon.name}] (${addon.organization})`);
    const useAddon = await rl.question('해당 조직 애드온을 적용하시겠습니까? (Y/n): ');
    if (useAddon.trim().toLowerCase() === 'n') {
      addon = null;
    }
  } else {
    // Check if user wants Acme or Merchant example for demo
    const demo = await rl.question('사전 정의된 애드온 템플릿을 로드하시겠습니까? (1: ACME, 2: 스마트스토어/상인, n: 범용 기본): ');
    if (demo.trim() === '1') {
      addon = AddonLoader.loadBuiltinExample('acme');
      console.log(`✅ [${addon.name}] 로드 완료\n`);
    } else if (demo.trim() === '2') {
      addon = AddonLoader.loadBuiltinExample('merchant');
      console.log(`✅ [${addon.name}] 로드 완료\n`);
    }
  }

  // Basic User Info
  const name = (await rl.question('성함을 입력해 주세요 (기본: 사용자): ')).trim() || '사용자';
  const role = (await rl.question('담당 직무 또는 하시는 일을 입력해 주세요 (예: 솔루션 엔지니어, 쇼핑몰 사장님, 레스토랑 셰프, 회계 담당): ')).trim() || '일반 사무';
  const organization = addon ? addon.organization : ((await rl.question('소속 회사 또는 상호명을 입력해 주세요 (선택): ')).trim() || '개인');

  // Match Archetype
  const archetype = ArchetypeManager.matchByKeywords(role);
  console.log(`\n🎯 매칭된 직군 아키타입: [${archetype.name}]`);
  console.log(`   ${archetype.description}\n`);

  // Environment
  console.log('주로 사용하시는 AI 에이전트 환경을 선택해 주세요:');
  console.log('1: Claude Code (터미널 CLI)');
  console.log('2: Antigravity / Agentic IDE');
  console.log('3: Claude Desktop (데스크톱 앱)');
  console.log('4: 범용 (AGENTS.md & CLAUDE.md 동시 생성)');
  const envChoice = (await rl.question('선택 (기본: 1): ')).trim() || '1';
  const envMap: Record<string, AgentEnvironment> = {
    '1': 'claude-code',
    '2': 'antigravity',
    '3': 'claude-desktop',
    '4': 'generic'
  };
  const agentEnvironment = envMap[envChoice] || 'claude-code';

  // Scope selection: Global (Home dir) vs Project local
  console.log('\n적용 범위를 선택해 주세요:');
  console.log('1: 글로벌 적용 (사용자 홈 디렉토리 ~/.ax 전역 - 모든 폴더/프로젝트에서 공통 사용) [권장]');
  console.log('2: 현재 로컬 프로젝트 폴더만 적용 (./)');
  const scopeChoice = (await rl.question('선택 (기본: 1): ')).trim() || '1';
  const targetDir = scopeChoice === '2' ? process.cwd() : undefined;

  // Routine Interview
  console.log('\n--- 📋 출근부터 퇴근까지: 일상 루틴 인터뷰 ---');
  const routineAnswers: string[] = [];
  for (let i = 0; i < archetype.routineQuestions.length; i++) {
    const q = archetype.routineQuestions[i];
    const ans = (await rl.question(`[Q${i + 1}] ${q}\n👉 `)).trim();
    routineAnswers.push(ans);
  }

  // Addon custom questions if any
  if (addon?.customQuestions) {
    console.log('\n--- 🏢 조직 전용 심층 질문 ---');
    for (let i = 0; i < addon.customQuestions.length; i++) {
      const q = addon.customQuestions[i];
      const ans = (await rl.question(`[Q-Org${i + 1}] ${q}\n👉 `)).trim();
      routineAnswers.push(ans);
    }
  }

  // Analyze & Produce Blueprint
  console.log('\n⚙️  업무 분해 및 AX 기회 진단 중...');
  const blueprint = TaskAnalyzer.analyze(
    {
      name,
      role,
      organization,
      agentEnvironment,
      routineAnswers,
      painPointAnswers: []
    },
    archetype,
    addon || undefined
  );

  console.log('\n======================================================');
  console.log('               📊 도출된 AX 전환 청사진              ');
  console.log('======================================================');
  console.log(`- 대상자: ${blueprint.userProfile.name} (${blueprint.userProfile.role} @ ${blueprint.userProfile.organization})`);
  console.log(`- 감지된 직군: ${blueprint.detectedArchetype}`);
  if (blueprint.appliedAddon) {
    console.log(`- 주입된 애드온: ${blueprint.appliedAddon}`);
  }

  console.log('\n[✅ 에이전틱 전환 추천 과업 (현재 PC 환경 접근 검증됨)]');
  blueprint.tasks.forEach((t, idx) => {
    console.log(`\n${idx + 1}. [${t.taskName}] (${t.category})`);
    console.log(`   - 현재 방식: ${t.currentWorkflow}`);
    console.log(`   - AX 방식 : ${t.axWorkflow}`);
  });

  if (blueprint.manualTasks && blueprint.manualTasks.length > 0) {
    console.log('\n[🛑 사람 직접 수행 유지 과업 (폐쇄망/현장 출장/물리적 작업)]');
    blueprint.manualTasks.forEach(m => {
      console.log(` * [${m.taskName}]: ${m.reason}`);
      console.log(`   ➔ 조치: ${m.humanActionNote}`);
    });
  }

  console.log('\n[적용될 그라운드 룰 (보안/컨벤션)]');
  blueprint.groundRules.forEach(r => console.log(` * ${r}`));

  // Dynamic skill discovery from skills.sh
  console.log('\n🔍 skills.sh 에서 직무에 최적화된 오픈소스 에이전트 스킬 검색 중...');
  const { SkillFinder } = await import('./core/skill-finder.js');
  const searchKeyword = role.split(' ')[0] || archetype.category;
  const discoveredSkills = SkillFinder.search(searchKeyword, 2);

  if (discoveredSkills.length > 0) {
    console.log('\n✨ [skills.sh 추천 스킬 발견]');
    discoveredSkills.forEach(s => {
      console.log(` • ${s.packageId} (${s.installs || 'popular'})`);
      console.log(`   링크: ${s.url}`);
    });
  }

  // Dynamic MCP discovery from Smithery
  console.log('\n🦾 Smithery 에서 팔과 다리가 되어줄 최적의 MCP 서버 검색 중...');
  const { McpFinder } = await import('./core/mcp-finder.js');
  const discoveredMcps = McpFinder.search(searchKeyword, 2);

  if (discoveredMcps.length > 0) {
    console.log('\n✨ [Smithery 추천 MCP 서버 발견]');
    discoveredMcps.forEach(m => {
      console.log(` • ${m.id} (${m.name})`);
      console.log(`   설명: ${m.description.slice(0, 80)}...`);
    });
  }

  console.log('\n------------------------------------------------------');
  const confirm = await rl.question('\n이 청사진대로 로컬 에이전트 환경에 자동 세팅(프로비저닝)할까요? (Y/n): ');
  if (confirm.trim().toLowerCase() !== 'n') {
    // DB 계정 정책은 도구가 심문하거나 강제하지 않는다. READONLY 권고는 조직 애드온의
    // groundRules와 생성된 규약 파일(텍스트)로 안내하고, 계정 선택은 사용자 몫으로 남긴다.

    // 2. Dispatch adapters (generates CLAUDE.md, AGENTS.md, runbooks/ etc.)
    const result = AdapterRegistry.dispatch(agentEnvironment, blueprint, targetDir);

    // Record the locally-provisioned scope so a later no-arg `--rollback`
    // (separate process) can still find and clean this project directory.
    if (targetDir) {
      const { ManifestManager } = await import('./core/manifest.js');
      ManifestManager.recordLocalTarget(targetDir);
    }

    // 3. Optionally install discovered skills
    if (discoveredSkills.length > 0) {
      const installSkills = await rl.question('\n위 추천 오픈소스 스킬도 함께 설치할까요? (Y/n): ');
      if (installSkills.trim().toLowerCase() !== 'n') {
        const { execFileSync } = await import('node:child_process');
        for (const s of discoveredSkills) {
          try {
            console.log(`⚙️  설치 중: ${s.packageId}...`);
            // packageId is regex-validated upstream; spawn without a shell
            execFileSync('npx', ['skills', 'add', s.packageId, '-y'], { stdio: 'inherit' });
          } catch {
            console.warn(`스킬 설치 실패 (수동 설치 권장: ${s.installCommand})`);
          }
        }
      }
    }

    // 4. Preflight Health Check
    console.log('\n🏥 [Pre-flight 헬스체크] 가동 상태 및 보안 격리 점검 중...');
    const { PreflightHealthCheck } = await import('./core/healthcheck.js');
    const healthChecks = PreflightHealthCheck.runAll(targetDir);
    healthChecks.forEach(hc => {
      const badge = hc.securityLevel === 'PASSED' ? '✅' : hc.securityLevel === 'WARNING' ? '⚠️ ' : '❌';
      console.log(` ${badge} ${hc.name}: ${hc.message}`);
    });

    console.log('\n✨ 축하합니다! 에이전틱 환경 프로비저닝이 완료되었습니다.');
    console.log('생성/수정된 설정 및 실전 런북 파일:');
    result.modifiedFiles.forEach(f => console.log(` - ${f}`));

    console.log('\n======================================================');
    console.log('         🎉 지금 바로 해보는 Day-1 Quick Win          ');
    console.log('======================================================');
    console.log(`과업명: ${blueprint.actionPlan.day1QuickWin.title}`);
    console.log('\n에이전트에게 지금 당장 아래 문장을 던져보세요:');
    console.log(`👉 "${blueprint.actionPlan.day1QuickWin.samplePrompt}"`);
    console.log(`\n기대 효과: ${blueprint.actionPlan.day1QuickWin.expectedResult}\n`);
    console.log('💡 Tip: 설정 원상복구가 필요할 땐 언제든 `bun start --rollback` 을 실행하세요.\n');
  } else {
    console.log('\n프로비저닝이 취소되었습니다.');
  }

  rl.close();
}

main().catch(err => {
  console.error('Error during onboarding:', err);
  process.exit(1);
});
