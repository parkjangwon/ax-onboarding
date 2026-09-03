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
    expect(fs.existsSync(claudeMd)).toBe(true);
    expect(fs.existsSync(agentsMd)).toBe(true);

    const content = fs.readFileSync(claudeMd, 'utf-8');
    expect(content).toContain('Ground Rules');
    expect(content).toContain('Day-1 Quick Win Guide');

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
