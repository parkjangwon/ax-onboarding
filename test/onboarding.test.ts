import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { ArchetypeManager } from '../src/core/archetypes.js';
import { AddonLoader } from '../src/addons/loader.js';
import { TaskAnalyzer } from '../src/core/analyzer.js';
import { AdapterRegistry } from '../src/adapters/index.js';
import { SkillFinder } from '../src/core/skill-finder.js';
import { McpFinder } from '../src/core/mcp-finder.js';
import { CredentialManager } from '../src/core/credentials.js';
import { RunbookInjector } from '../src/core/runbooks.js';
import { PreflightHealthCheck } from '../src/core/healthcheck.js';
import { RollbackManager } from '../src/core/rollback.js';
import { GlobalPaths } from '../src/core/paths.js';

describe('ArchetypeManager', () => {
  it('should load all archetypes correctly', () => {
    const map = ArchetypeManager.loadAll();
    expect(map.size).toBeGreaterThanOrEqual(4);
    expect(map.has('tech-engineer')).toBe(true);
    expect(map.has('office-general')).toBe(true);
    expect(map.has('commerce-merchant')).toBe(true);
    expect(map.has('culinary-fnb')).toBe(true);
  });

  it('should match role keywords to correct archetypes', () => {
    expect(ArchetypeManager.matchByKeywords('솔루션 DevOps 엔지니어').id).toBe('tech-engineer');
    expect(ArchetypeManager.matchByKeywords('네이버 스마트스토어 온라인 판매자').id).toBe('commerce-merchant');
    expect(ArchetypeManager.matchByKeywords('레스토랑 총괄 셰프 및 식당 운영').id).toBe('culinary-fnb');
    expect(ArchetypeManager.matchByKeywords('인사 기획 및 총무 담당').id).toBe('office-general');
  });
});

describe('AddonLoader', () => {
  it('should load Acme enterprise addon with ground rules', () => {
    const acme = AddonLoader.loadBuiltinExample('acme');
    expect(acme.organization).toBe('Acme (ACME)');
    expect(acme.groundRules.some(r => r.includes('READONLY'))).toBe(true);
    expect(acme.vcs?.type).toBe('gitlab');
  });

  it('should load merchant addon correctly', () => {
    const merchant = AddonLoader.loadBuiltinExample('merchant');
    expect(merchant.addonId).toBe('smartstore-merchant-addon');
    expect(merchant.targetArchetypes).toContain('commerce-merchant');
  });
});

describe('TaskAnalyzer & Blueprint', () => {
  it('should produce a comprehensive AX blueprint for a tech engineer with enterprise addon', () => {
    const acme = AddonLoader.loadBuiltinExample('acme');
    const archetype = ArchetypeManager.get('tech-engineer')!;

    const blueprint = TaskAnalyzer.analyze(
      {
        name: '박장원',
        role: '솔루션 시니어 개발자',
        organization: 'ACME',
        agentEnvironment: 'claude-code',
        routineAnswers: ['서버 모니터링 확인', '에러 로그 수동 분석에 1시간 소모'],
        painPointAnswers: []
      },
      archetype,
      acme
    );

    expect(blueprint.userProfile.name).toBe('박장원');
    expect(blueprint.detectedArchetype).toBe(archetype.name);
    expect(blueprint.appliedAddon).toBe(acme.name);
    expect(blueprint.groundRules.some(r => r.includes('READONLY'))).toBe(true);
    expect(blueprint.tasks.length).toBeGreaterThan(0);
    expect(blueprint.manualTasks && blueprint.manualTasks.length > 0).toBe(true);
    expect(blueprint.actionPlan.day1QuickWin.samplePrompt).toContain('오류 로그');
  });
});

describe('TaskAnalyzer Personalization (interview answers actually used)', () => {
  it('should turn routine interview answers into personalized runbook-routed tasks', () => {
    const archetype = ArchetypeManager.get('tech-engineer')!;

    const blueprint = TaskAnalyzer.analyze(
      {
        name: '테스터',
        role: '엔지니어',
        organization: '테스트',
        agentEnvironment: 'claude-code',
        routineAnswers: ['매일 오전에 배치 에러 로그를 수작업으로 확인함', '', '고객사에서 문의 오면 엑셀 취합해서 회신'],
        painPointAnswers: []
      },
      archetype
    );

    const personalized = blueprint.tasks.filter(
      t => t.taskName.includes('배치 에러 로그') || t.taskName.includes('고객사에서 문의')
    );
    expect(personalized.length).toBe(2);
    expect(personalized[0].axWorkflow).toContain('01-troubleshoot');
    expect(personalized[1].axWorkflow).toContain('02-customer-inquiry');
    expect(blueprint.interviewRaw?.routineAnswers.length).toBe(3);
  });
});

describe('AdapterRegistry & Provisioning', () => {
  it('should generate CLAUDE.md and AGENTS.md in target directory without errors', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-test-'));
    const archetype = ArchetypeManager.get('tech-engineer')!;
    const acme = AddonLoader.loadBuiltinExample('acme');

    const blueprint = TaskAnalyzer.analyze(
      {
        name: '테스터',
        role: '백엔드 엔지니어',
        organization: '테스트 컴퍼니',
        agentEnvironment: 'generic',
        routineAnswers: [],
        painPointAnswers: []
      },
      archetype,
      acme
    );

    const result = AdapterRegistry.dispatch('generic', blueprint, tempDir);
    expect(result.success).toBe(true);

    const claudeMd = path.join(tempDir, 'CLAUDE.md');
    const agentsMd = path.join(tempDir, 'AGENTS.md');
    const axClaudeMd = path.join(tempDir, '.ax', 'CLAUDE.md');
    const axAgentsMd = path.join(tempDir, '.ax', 'AGENTS.md');

    expect(fs.existsSync(claudeMd)).toBe(true);
    expect(fs.existsSync(agentsMd)).toBe(true);
    expect(fs.existsSync(axClaudeMd)).toBe(true);
    expect(fs.existsSync(axAgentsMd)).toBe(true);

    const claudeLinkContent = fs.readFileSync(claudeMd, 'utf-8');
    expect(claudeLinkContent).toContain('.ax/CLAUDE.md');

    const axContent = fs.readFileSync(axClaudeMd, 'utf-8');
    expect(axContent).toContain('Ground Rules');
    expect(axContent).toContain('Day-1 Quick Win Guide');
    // The harness must teach the agent how to self-extend safely (post-onboarding setups stay reversible)
    expect(axContent).toContain('환경 확장 규약');
    expect(axContent).toContain('.manifest.json');

    const axAgentsContent = fs.readFileSync(axAgentsMd, 'utf-8');
    expect(axAgentsContent).toContain('Harness Extension Protocol');
    expect(axAgentsContent).toContain('.manifest.json');

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

describe('SkillFinder', () => {
  it('should parse skills CLI output properly', () => {
    const mockOutput = `
Install with npx skills add <owner/repo@skill>

claude-office-skills/skills@excel-automation 14.5K installs
└ https://skills.sh/claude-office-skills/skills/excel-automation

sbroenne/mcp-server-excel@excel-mcp 1.6K installs
└ https://skills.sh/sbroenne/mcp-server-excel/excel-mcp
`;
    const skills = SkillFinder.parseOutput(mockOutput);
    expect(skills.length).toBe(2);
    expect(skills[0].packageId).toBe('claude-office-skills/skills@excel-automation');
    expect(skills[0].installs).toBe('14.5K installs');
    expect(skills[0].installCommand).toBe('npx skills add claude-office-skills/skills@excel-automation -y');
  });
});

describe('McpFinder', () => {
  it('should parse smithery MCP search output properly', () => {
    const mockOutput = `
{"name":"ThinAir Data","qualifiedName":"thinair/data","description":"Connect AI assistants to PostgreSQL, MySQL, or SQL Server.","useCount":20,"connectionUrl":"https://server.smithery.ai/thinair/data"}
{"name":"PlanetScale","qualifiedName":"planetscale","description":"Manage databases and execute SQL queries securely.","useCount":2,"connectionUrl":"https://server.smithery.ai/planetscale"}
`;
    const mcps = McpFinder.parseOutput(mockOutput);
    expect(mcps.length).toBe(2);
    expect(mcps[0].id).toBe('thinair/data');
    expect(mcps[0].name).toBe('ThinAir Data');
    expect(mcps[0].installCommand).toContain('thinair/data');
  });
});

describe('Security: CredentialManager', () => {
  it('should flag dangerous admin/root database users', () => {
    expect(CredentialManager.validateDbSecurity('root').isSafe).toBe(false);
    expect(CredentialManager.validateDbSecurity('admin').isSafe).toBe(false);
    expect(CredentialManager.validateDbSecurity('sa').isSafe).toBe(false);
    expect(CredentialManager.validateDbSecurity('readonly').isSafe).toBe(true);
    expect(CredentialManager.validateDbSecurity('svc_dev_ro').isSafe).toBe(true);
  });

  it('should save credentials with 0600 mode and update .gitignore', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-cred-'));
    
    const envPath = CredentialManager.saveSecureEnv(tempDir, {
      DB_HOST: '10.1.1.20',
      DB_USER: 'readonly'
    });

    expect(fs.existsSync(envPath)).toBe(true);
    // POSIX file modes are a no-op on Windows — verify 0600 only where applicable
    if (process.platform !== 'win32') {
      const stat = fs.statSync(envPath);
      expect(stat.mode & 0o777).toBe(0o600);
    }

    const gitignoreContent = fs.readFileSync(path.join(tempDir, '.gitignore'), 'utf-8');
    expect(gitignoreContent).toContain('.env.mcp');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

describe('RunbookInjector & Preflight', () => {
  it('should inject 5 real-world runbooks into targetDir', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-rb-'));

    const injected = RunbookInjector.inject(tempDir);
    expect(injected.length).toBe(5);
    expect(fs.existsSync(path.join(tempDir, 'runbooks', '01-troubleshoot.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'runbooks', '02-customer-inquiry.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'runbooks', '05-security-audit.md'))).toBe(true);

    // Verify non-destructive behavior: existing runbook is NOT overwritten
    const customContent = '# My Custom User Runbook';
    const customPath = path.join(tempDir, 'runbooks', '01-troubleshoot.md');
    fs.writeFileSync(customPath, customContent, 'utf-8');

    const secondInject = RunbookInjector.inject(tempDir);
    expect(secondInject.includes(customPath)).toBe(false);
    expect(fs.readFileSync(customPath, 'utf-8')).toBe(customContent);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should run preflight healthcheck cleanly', () => {
    const checks = PreflightHealthCheck.runAll(process.cwd());
    expect(checks.length).toBeGreaterThanOrEqual(3);
    expect(checks.some(c => c.name.includes('Git'))).toBe(true);
  });

  it('should NOT crash in global mode (undefined targetDir) — regression for path.join(undefined)', () => {
    let checks;
    expect(() => { checks = PreflightHealthCheck.runAll(undefined); }).not.toThrow();
    expect(checks.length).toBeGreaterThanOrEqual(3);
    // Global mode must report the runbooks check without throwing
    expect(checks.some(c => c.name.includes('런북'))).toBe(true);
  });
});

describe('RollbackManager', () => {
  it('should cleanly remove generated files during rollback and preserve existing user rules', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-rbk-'));

    // User already had custom rules in CLAUDE.md!
    const originalRule = '# Existing Custom User Rule\n@my-custom-doc.md\n';
    const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, originalRule + '\n# AX Onboarding Rule Reference\n@.ax/CLAUDE.md\n');

    // Create local .ax and runbooks
    fs.mkdirSync(path.join(tempDir, '.ax'));
    fs.writeFileSync(path.join(tempDir, '.ax', 'CLAUDE.md'), 'ax rules');
    fs.mkdirSync(path.join(tempDir, 'runbooks'));
    fs.writeFileSync(path.join(tempDir, 'runbooks', 'dummy.md'), 'test');

    const res = RollbackManager.rollback(tempDir);
    expect(res.restoredFiles).toContain(claudeMdPath);
    expect(fs.existsSync(claudeMdPath)).toBe(true);

    // Existing rule is 100% preserved!
    const restoredContent = fs.readFileSync(claudeMdPath, 'utf-8');
    expect(restoredContent).toContain('Existing Custom User Rule');
    expect(restoredContent).not.toContain('.ax/CLAUDE.md');

    // Local .ax and runbooks are deleted
    expect(fs.existsSync(path.join(tempDir, '.ax'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, 'runbooks'))).toBe(false);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('global rollback should preserve user-owned custom files in ~/.ax (not rm -rf whole dir)', () => {
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-home-'));
    try {
      // Set up a fake ~/.ax exactly as a user would: tool artifacts + a user-owned file
      const axDir = path.join(fakeHome, '.ax');
      const runbooksDir = path.join(axDir, 'runbooks');
      fs.mkdirSync(runbooksDir, { recursive: true });
      fs.writeFileSync(path.join(axDir, 'CLAUDE.md'), '# AX constitution\n');
      fs.writeFileSync(path.join(runbooksDir, '01-troubleshoot.md'), '# runbook\n');
      // User-owned file that MUST survive rollback
      const userFile = path.join(axDir, 'my-custom-credentials.json');
      fs.writeFileSync(userFile, '{"note":"user owned"}');
      // User-owned top-level dir that MUST survive
      const userDir = path.join(axDir, 'custom-backups');
      fs.mkdirSync(userDir, { recursive: true });
      fs.writeFileSync(path.join(userDir, 'data.txt'), 'keep me');

      const script = `
        import { RollbackManager } from './src/core/rollback.ts';
        const res = RollbackManager.rollback();
        console.log(JSON.stringify(res));
      `;
      // Write the script inside the project root so relative ./src imports resolve
      const scriptPath = path.join(process.cwd(), '.rollback-test-tmp.ts');
      fs.writeFileSync(scriptPath, script);
      try {
        const out = execFileSync('bun', [scriptPath], {
          cwd: process.cwd(),
          encoding: 'utf-8',
          env: { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome }
        });
        const res = JSON.parse(out.trim().split('\n').pop());

        // Tool artifacts removed
        expect(fs.existsSync(path.join(axDir, 'CLAUDE.md'))).toBe(false);
        expect(fs.existsSync(runbooksDir)).toBe(false);
        expect(res.deletedFiles.some(f => f.includes('runbooks'))).toBe(true);

        // User-owned files preserved
        expect(fs.existsSync(userFile)).toBe(true);
        expect(fs.existsSync(path.join(userDir, 'data.txt'))).toBe(true);
        expect(res.deletedFiles.some(f => f.includes('custom-backups'))).toBe(false);
      } finally {
        fs.rmSync(scriptPath, { force: true });
      }
    } finally {
      fs.rmSync(fakeHome, { recursive: true, force: true });
    }
  });

  it('no-arg rollback should also clean manifest-recorded local targets (CLI scope is not persisted between runs)', () => {
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-home2-'));
    const localProj = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-localproj-'));
    try {
      // Global manifest recording the locally-provisioned project
      const axDir = path.join(fakeHome, '.ax');
      fs.mkdirSync(axDir, { recursive: true });
      fs.writeFileSync(path.join(axDir, '.manifest.json'), JSON.stringify({
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        localTargets: [localProj]
      }));

      // Locally-provisioned artifacts + a user-owned rule that MUST survive
      fs.mkdirSync(path.join(localProj, '.ax'));
      fs.writeFileSync(path.join(localProj, '.ax', 'CLAUDE.md'), 'ax rules');
      fs.mkdirSync(path.join(localProj, 'runbooks'));
      fs.writeFileSync(path.join(localProj, 'runbooks', '01-troubleshoot.md'), 'rb');
      const userRule = '# My Precious Rule\n@my-doc.md\n';
      fs.writeFileSync(path.join(localProj, 'CLAUDE.md'), userRule + '\n# AX Onboarding Rule Reference\n@.ax/CLAUDE.md\n');

      const script = `
        import { RollbackManager } from './src/core/rollback.ts';
        const res = RollbackManager.rollback();
        console.log(JSON.stringify(res));
      `;
      const scriptPath = path.join(process.cwd(), '.rollback-manifest-test-tmp.ts');
      fs.writeFileSync(scriptPath, script);
      try {
        const out = execFileSync('bun', [scriptPath], {
          cwd: process.cwd(),
          encoding: 'utf-8',
          env: { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome }
        });
        JSON.parse(out.trim().split('\n').pop());

        // Local tool artifacts cleaned via manifest
        expect(fs.existsSync(path.join(localProj, '.ax'))).toBe(false);
        expect(fs.existsSync(path.join(localProj, 'runbooks'))).toBe(false);

        // User-owned rule preserved, AX reference removed
        const restored = fs.readFileSync(path.join(localProj, 'CLAUDE.md'), 'utf-8');
        expect(restored).toContain('My Precious Rule');
        expect(restored).not.toContain('.ax/CLAUDE.md');

        // Manifest itself removed after use
        expect(fs.existsSync(path.join(axDir, '.manifest.json'))).toBe(false);
      } finally {
        fs.rmSync(scriptPath, { force: true });
      }
    } finally {
      fs.rmSync(fakeHome, { recursive: true, force: true });
      fs.rmSync(localProj, { recursive: true, force: true });
    }
  });

  it('ManifestManager should record (deduped) and remove local targets under HOME', () => {
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-man-'));
    try {
      const script = `
        import { ManifestManager } from './src/core/manifest.ts';
        ManifestManager.recordLocalTarget('/tmp/someproj');
        ManifestManager.recordLocalTarget('/tmp/someproj');
        console.log(JSON.stringify(ManifestManager.read()));
        ManifestManager.removeLocalTarget('/tmp/someproj');
        console.log(JSON.stringify(ManifestManager.read()));
      `;
      const scriptPath = path.join(process.cwd(), '.manifest-test-tmp.ts');
      fs.writeFileSync(scriptPath, script);
      try {
        const out = execFileSync('bun', [scriptPath], {
          cwd: process.cwd(),
          encoding: 'utf-8',
          env: { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome }
        });
        const lines = out.trim().split('\n');
        const afterRecord = JSON.parse(lines[0]);
        const afterRemove = JSON.parse(lines[1]);
        expect(afterRecord.localTargets.length).toBe(1);
        // ManifestManager stores path.resolve() output — compare the same way
        expect(afterRecord.localTargets[0]).toBe(path.resolve('/tmp/someproj'));
        expect(afterRemove.localTargets.length).toBe(0);
      } finally {
        fs.rmSync(scriptPath, { force: true });
      }
    } finally {
      fs.rmSync(fakeHome, { recursive: true, force: true });
    }
  });

  it('should restore ~/.claude.json from the OLDEST backup (true pre-onboarding state)', () => {
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-bak-'));
    try {
      // Two onboarding runs happened: oldest backup = original, newest = after run 1
      const claudeJson = path.join(fakeHome, '.claude.json');
      fs.writeFileSync(claudeJson, '{"mcpServers":{"from-second-run":true}}');
      fs.writeFileSync(path.join(fakeHome, '.claude.json.bak_axonboard.1000'), '{"mcpServers":{}}');
      fs.writeFileSync(path.join(fakeHome, '.claude.json.bak_axonboard.2000'), '{"mcpServers":{"from-first-run":true}}');

      const script = `
        import { RollbackManager } from './src/core/rollback.ts';
        console.log(JSON.stringify(RollbackManager.rollback()));
      `;
      const scriptPath = path.join(process.cwd(), '.rollback-bak-test-tmp.ts');
      fs.writeFileSync(scriptPath, script);
      try {
        const out = execFileSync('bun', [scriptPath], {
          cwd: process.cwd(),
          encoding: 'utf-8',
          env: { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome }
        });
        JSON.parse(out.trim().split('\n').pop());

        // Restored to the true pre-onboarding state, not the intermediate one
        const restored = JSON.parse(fs.readFileSync(claudeJson, 'utf-8'));
        expect(restored.mcpServers['from-second-run']).toBeUndefined();
        expect(restored.mcpServers['from-first-run']).toBeUndefined();

        // All tool backups cleaned up after restore
        const leftovers = fs.readdirSync(fakeHome).filter(f => f.includes('.bak_axonboard'));
        expect(leftovers.length).toBe(0);
      } finally {
        fs.rmSync(scriptPath, { force: true });
      }
    } finally {
      fs.rmSync(fakeHome, { recursive: true, force: true });
    }
  });
});

describe('Cross-Platform: GlobalPaths', () => {
  it('should resolve user home directory and global AX paths seamlessly', () => {
    const home = GlobalPaths.getHomeDir();
    expect(home.length).toBeGreaterThan(0);

    // Pure path resolution — getters must NOT create directories as a side effect
    const axHome = GlobalPaths.getAxHome();
    expect(axHome).toContain('.ax');
    expect(path.basename(axHome)).toBe('.ax');

    const runbooksDir = GlobalPaths.getGlobalRunbooksDir();
    expect(runbooksDir).toContain('runbooks');
    expect(fs.existsSync(runbooksDir)).toBe(true); // ensure-style getter creates on demand

    const envPath = GlobalPaths.getGlobalEnvPath();
    expect(envPath).toContain('.env.mcp');

    const claudeMd = GlobalPaths.getGlobalClaudeMdPath();
    expect(claudeMd).toContain('CLAUDE.md');
  });
});
