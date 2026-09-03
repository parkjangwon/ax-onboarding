import fs from 'node:fs';
import path from 'node:path';
import type { RoleArchetype, RoleCategory } from './types.js';

export class ArchetypeManager {
  private static archetypes: Map<string, RoleArchetype> = new Map();

  static loadAll(dir?: string): Map<string, RoleArchetype> {
    const targetDir = dir || path.join(import.meta.dirname, '..', 'archetypes');
    const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.json'));

    this.archetypes.clear();
    for (const file of files) {
      const fullPath = path.join(targetDir, file);
      const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      this.archetypes.set(content.id, content as RoleArchetype);
    }
    return this.archetypes;
  }

  static get(id: string): RoleArchetype | undefined {
    if (this.archetypes.size === 0) {
      this.loadAll();
    }
    return this.archetypes.get(id);
  }

  static matchByKeywords(query: string): RoleArchetype {
    if (this.archetypes.size === 0) {
      this.loadAll();
    }

    const lower = query.toLowerCase();
    if (lower.includes('개발') || lower.includes('엔지니어') || lower.includes('코딩') || lower.includes('인프라') || lower.includes('devops') || lower.includes('tech')) {
      return this.archetypes.get('tech-engineer')!;
    }
    if (lower.includes('쇼핑몰') || lower.includes('스마트스토어') || lower.includes('쿠팡') || lower.includes('상인') || lower.includes('판매') || lower.includes('주문')) {
      return this.archetypes.get('commerce-merchant')!;
    }
    if (lower.includes('요리') || lower.includes('식당') || lower.includes('카페') || lower.includes('셰프') || lower.includes('f&b') || lower.includes('외식')) {
      return this.archetypes.get('culinary-fnb')!;
    }
    // Default to office-general
    return this.archetypes.get('office-general')!;
  }
}
