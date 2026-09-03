import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ArchetypeManager } from '../src/core/archetypes.js';
import { AddonLoader } from '../src/addons/loader.js';
import { TaskAnalyzer } from '../src/core/analyzer.js';
import { AdapterRegistry } from '../src/adapters/index.js';

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
    const { SkillFinder } = require('../src/core/skill-finder.js');
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
    const { McpFinder } = require('../src/core/mcp-finder.js');
    const mcps = McpFinder.parseOutput(mockOutput);
    expect(mcps.length).toBe(2);
    expect(mcps[0].id).toBe('thinair/data');
    expect(mcps[0].name).toBe('ThinAir Data');
    expect(mcps[0].installCommand).toContain('thinair/data');
  });
});

describe('Security: CredentialManager', () => {
  it('should flag dangerous admin/root database users', () => {
    const { CredentialManager } = require('../src/core/credentials.js');
    expect(CredentialManager.validateDbSecurity('root').isSafe).toBe(false);
    expect(CredentialManager.validateDbSecurity('admin').isSafe).toBe(false);
    expect(CredentialManager.validateDbSecurity('sa').isSafe).toBe(false);
    expect(CredentialManager.validateDbSecurity('readonly').isSafe).toBe(true);
    expect(CredentialManager.validateDbSecurity('svc_dev_ro').isSafe).toBe(true);
  });

  it('should save credentials with 0600 mode and update .gitignore', () => {
    const { CredentialManager } = require('../src/core/credentials.js');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-cred-'));
    
    const envPath = CredentialManager.saveSecureEnv(tempDir, {
      DB_HOST: '10.1.1.20',
      DB_USER: 'readonly'
    });

    expect(fs.existsSync(envPath)).toBe(true);
    const stat = fs.statSync(envPath);
    // mode 0600 is 33152 in octal stat
    expect(stat.mode & 0o777).toBe(0o600);

    const gitignoreContent = fs.readFileSync(path.join(tempDir, '.gitignore'), 'utf-8');
    expect(gitignoreContent).toContain('.env.mcp');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

describe('RunbookInjector & Preflight', () => {
  it('should inject 5 real-world runbooks into targetDir', () => {
    const { RunbookInjector } = require('../src/core/runbooks.js');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-rb-'));

    const injected = RunbookInjector.inject(tempDir);
    expect(injected.length).toBe(5);
    expect(fs.existsSync(path.join(tempDir, 'runbooks', '01-troubleshoot.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'runbooks', '02-customer-inquiry.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'runbooks', '05-security-audit.md'))).toBe(true);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should run preflight healthcheck cleanly', () => {
    const { PreflightHealthCheck } = require('../src/core/healthcheck.js');
    const checks = PreflightHealthCheck.runAll(process.cwd());
    expect(checks.length).toBeGreaterThanOrEqual(3);
    expect(checks.some(c => c.name.includes('Git'))).toBe(true);
  });

  it('should NOT crash in global mode (undefined targetDir) — regression for path.join(undefined)', () => {
    const { PreflightHealthCheck } = require('../src/core/healthcheck.js');
    let checks;
    expect(() => { checks = PreflightHealthCheck.runAll(undefined); }).not.toThrow();
    expect(checks.length).toBeGreaterThanOrEqual(3);
    // Global mode must report the runbooks check without throwing
    expect(checks.some(c => c.name.includes('런북'))).toBe(true);
  });
});

describe('RollbackManager', () => {
  it('should cleanly remove generated files during rollback and preserve existing user rules', () => {
    const { RollbackManager } = require('../src/core/rollback.js');
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
    const { execSync } = require('node:child_process');
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
        const out = execSync(`HOME=${JSON.stringify(fakeHome)} bun ${JSON.stringify(scriptPath)}`, {
          cwd: process.cwd(),
          encoding: 'utf-8'
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
});

describe('Cross-Platform: GlobalPaths', () => {
  it('should resolve user home directory and global AX paths seamlessly', () => {
    const { GlobalPaths } = require('../src/core/paths.js');
    const home = GlobalPaths.getHomeDir();
    expect(home.length).toBeGreaterThan(0);

    const axHome = GlobalPaths.getAxHome();
    expect(axHome).toContain('.ax');
    expect(fs.existsSync(axHome)).toBe(true);

    const runbooksDir = GlobalPaths.getGlobalRunbooksDir();
    expect(runbooksDir).toContain('runbooks');

    const envPath = GlobalPaths.getGlobalEnvPath();
    expect(envPath).toContain('.env.mcp');

    const claudeMd = GlobalPaths.getGlobalClaudeMdPath();
    expect(claudeMd).toContain('CLAUDE.md');
  });
});
