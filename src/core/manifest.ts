import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Global install manifest (~/.ax/.manifest.json).
 * Records which local target directories were provisioned so that a later
 * no-argument rollback can clean them too (the CLI does not persist the
 * scope choice between invocations).
 */
export interface AxManifest {
  createdAt: string;
  updatedAt: string;
  /** Absolute paths of locally-provisioned project directories */
  localTargets: string[];
}

export class ManifestManager {
  static getManifestPath(): string {
    return path.join(os.homedir(), '.ax', '.manifest.json');
  }

  static read(): AxManifest | null {
    try {
      const data = JSON.parse(fs.readFileSync(this.getManifestPath(), 'utf-8'));
      if (!Array.isArray(data.localTargets)) return null;
      return data as AxManifest;
    } catch {
      return null;
    }
  }

  static recordLocalTarget(targetDir: string): void {
    const abs = path.resolve(targetDir);
    const manifest = this.read() || {
      createdAt: new Date().toISOString(),
      updatedAt: '',
      localTargets: []
    };
    if (!manifest.localTargets.includes(abs)) {
      manifest.localTargets.push(abs);
    }
    manifest.updatedAt = new Date().toISOString();
    this.write(manifest);
  }

  static removeLocalTarget(targetDir: string): void {
    const abs = path.resolve(targetDir);
    const manifest = this.read();
    if (!manifest) return;
    manifest.localTargets = manifest.localTargets.filter(t => t !== abs);
    manifest.updatedAt = new Date().toISOString();
    this.write(manifest);
  }

  static write(manifest: AxManifest): void {
    const manifestPath = this.getManifestPath();
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  static delete(): void {
    try {
      fs.rmSync(this.getManifestPath(), { force: true });
    } catch {
      // already gone
    }
  }
}
