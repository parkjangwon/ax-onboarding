import fs from 'node:fs';
import path from 'node:path';
import type { OrganizationAddon } from '../core/types.js';

export class AddonLoader {
  static loadFromFile(filePath: string): OrganizationAddon {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Addon file not found at: ${resolved}`);
    }
    const raw = fs.readFileSync(resolved, 'utf-8');
    const data = JSON.parse(raw);
    return this.validate(data);
  }

  static loadBuiltinExample(name: 'acme' | 'merchant'): OrganizationAddon {
    const filename = name === 'acme' 
      ? 'acme-enterprise-addon.json' 
      : 'sample-merchant-addon.json';
    const filePath = path.join(import.meta.dirname, 'examples', filename);
    return this.loadFromFile(filePath);
  }

  static autoDetectAddon(cwd = process.cwd()): OrganizationAddon | null {
    const candidates = [
      process.env.AX_ADDON_PATH,
      path.join(cwd, 'ax-addon.json'),
      path.join(cwd, '.ax', 'addon.json'),
      path.join(cwd, 'acme-addon.json')
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        try {
          return this.loadFromFile(candidate);
        } catch {
          // ignore parsing error and continue search
        }
      }
    }
    return null;
  }

  static validate(data: any): OrganizationAddon {
    if (!data.addonId || !data.name || !data.organization || !Array.isArray(data.groundRules)) {
      throw new Error('Invalid addon specification: missing required fields (addonId, name, organization, groundRules)');
    }
    return data as OrganizationAddon;
  }
}
