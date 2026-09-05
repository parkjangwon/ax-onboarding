import fs from 'node:fs';
import path from 'node:path';
import type { OrganizationAddon } from '../core/types.js';

/**
 * Loads organization addons from whitelisted, boundary-checked locations only:
 * the bundled examples directory, or well-known filenames inside the project
 * root. Arbitrary caller-supplied file paths are intentionally not supported.
 */
export class AddonLoader {
  private static readonly BUILTIN_EXAMPLES: Record<'acme' | 'merchant', string> = {
    acme: 'acme-enterprise-addon.json',
    merchant: 'sample-merchant-addon.json'
  };

  /** Well-known addon file locations, relative to the project root */
  private static readonly AUTO_DETECT_LOCATIONS = [
    'ax-addon.json',
    '.ax/addon.json',
    'acme-addon.json'
  ];

  static loadBuiltinExample(name: 'acme' | 'merchant'): OrganizationAddon {
    const examplesDir = path.join(import.meta.dirname, 'examples');
    return this.loadFromDirectory(examplesDir, this.BUILTIN_EXAMPLES[name]);
  }

  static autoDetectAddon(cwd = process.cwd()): OrganizationAddon | null {
    const root = path.resolve(cwd);
    for (const location of this.AUTO_DETECT_LOCATIONS) {
      try {
        return this.loadFromDirectory(root, location);
      } catch {
        // missing or invalid addon in this location — keep searching
      }
    }
    return null;
  }

  /**
   * Reads an addon file identified by a plain relative basename inside `dir`.
   * The basename is whitelisted and the resolved target is boundary-checked
   * so the read can never escape the allowed root directory.
   */
  static loadFromDirectory(dir: string, basename: string): OrganizationAddon {
    if (!/^[A-Za-z0-9][A-Za-z0-9./_-]*\.json$/.test(basename) || basename.includes('..')) {
      throw new Error(`Invalid addon file name: ${basename}`);
    }
    const root = path.resolve(dir);
    const target = path.resolve(root, basename);
    if (target !== root && !target.startsWith(root + path.sep)) {
      throw new Error(`Addon file escapes the allowed directory: ${target}`);
    }
    if (!fs.existsSync(target)) {
      throw new Error(`Addon file not found at: ${target}`);
    }
    const data = JSON.parse(fs.readFileSync(target, 'utf-8'));
    return this.validate(data);
  }

  static validate(data: any): OrganizationAddon {
    if (!data.addonId || !data.name || !data.organization || !Array.isArray(data.groundRules)) {
      throw new Error('Invalid addon specification: missing required fields (addonId, name, organization, groundRules)');
    }
    return data as OrganizationAddon;
  }
}
