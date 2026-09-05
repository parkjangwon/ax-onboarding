import fs from 'node:fs';
import path from 'node:path';
import { ManifestManager } from './manifest.js';

export class RollbackManager {
  /**
   * Restores ~/.claude.json from the latest timestamped backup if available,
   * and removes ONLY the files/directories that ax-onboarding created.
   * User-owned custom files under ~/.ax are preserved.
   *
   * Without targetDir, also cleans every locally-provisioned project directory
   * recorded in the global manifest (~/.ax/.manifest.json).
   */
  static rollback(targetDir?: string): { restoredFiles: string[]; deletedFiles: string[] } {
    const { GlobalPaths } = require('./paths.js');
    const restoredFiles: string[] = [];
    const deletedFiles: string[] = [];

    // 0. Read the manifest first — it lives inside ~/.ax which gets cleaned below.
    const manifest = ManifestManager.read();

    // 1. Restore ~/.claude.json from the LATEST timestamped backup
    const claudeJsonPath = GlobalPaths.getClaudeJsonPath();
    const backupDir = path.dirname(claudeJsonPath);
    const backupPrefix = `${path.basename(claudeJsonPath)}.bak_axonboard`;

    if (fs.existsSync(backupDir)) {
      const backups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith(backupPrefix))
        .sort(); // lexicographic = chronological for timestamps
      if (backups.length > 0) {
        const latestBackup = path.join(backupDir, backups[backups.length - 1]);
        fs.copyFileSync(latestBackup, claudeJsonPath);
        restoredFiles.push(claudeJsonPath);
        // Clean up ALL ax-onboarding backups (they are all stale after restore)
        for (const b of backups) {
          const bp = path.join(backupDir, b);
          fs.unlinkSync(bp);
          deletedFiles.push(bp);
        }
      }
    }

    // 2. Clean Global ~/.ax — remove ONLY known ax-onboarding artifacts,
    //    preserving any user-owned custom files.
    const globalAxHome = GlobalPaths.getAxHome();
    if (fs.existsSync(globalAxHome)) {
      const knownArtifacts: string[] = [
        path.join(globalAxHome, 'CLAUDE.md'),   // claude-code adapter constitution
        path.join(globalAxHome, 'AGENTS.md'),   // antigravity adapter constitution
        path.join(globalAxHome, 'runbooks'),    // injected runbooks dir
        path.join(globalAxHome, '.env.mcp'),    // global credentials file
        path.join(globalAxHome, '.cache')       // engine repo cache (see uninstall.sh)
      ];
      for (const artifact of knownArtifacts) {
        if (fs.existsSync(artifact)) {
          fs.rmSync(artifact, { recursive: true, force: true });
          deletedFiles.push(artifact);
        }
      }
    }

    // 3. Clean locally-provisioned targets: explicit targetDir, plus every
    //    directory recorded in the manifest (needed because the CLI does not
    //    persist the scope choice between runs).
    if (targetDir) {
      this.cleanupLocalTarget(path.resolve(targetDir), deletedFiles, restoredFiles);
      ManifestManager.removeLocalTarget(path.resolve(targetDir));
    }
    if (manifest) {
      for (const recorded of manifest.localTargets) {
        if (targetDir && path.resolve(recorded) === path.resolve(targetDir)) continue;
        if (fs.existsSync(recorded)) {
          this.cleanupLocalTarget(recorded, deletedFiles, restoredFiles);
        }
      }
    }
    // Remove the manifest itself (also cleans up a corrupt/unreadable manifest)
    ManifestManager.delete();

    // 4. Remove @~/.ax reference lines from global ~/.claude/CLAUDE.md
    const globalClaudeMd = GlobalPaths.getGlobalClaudeMdPath();
    if (fs.existsSync(globalClaudeMd)) {
      const content = fs.readFileSync(globalClaudeMd, 'utf-8');
      const filtered = content.split('\n').filter(line =>
        !line.includes('.ax/CLAUDE.md') && !line.includes('AX Onboarding Rule Reference')
      ).join('\n').trim();
      if (filtered.length === 0) {
        fs.unlinkSync(globalClaudeMd);
        deletedFiles.push(globalClaudeMd);
      } else {
        fs.writeFileSync(globalClaudeMd, filtered + '\n', 'utf-8');
        restoredFiles.push(globalClaudeMd);
      }
    }

    // 5. Remove ~/.ax only if it is now empty (nothing user-owned left)
    if (fs.existsSync(globalAxHome)) {
      const remaining = fs.readdirSync(globalAxHome);
      if (remaining.length === 0) {
        fs.rmSync(globalAxHome, { recursive: true, force: true });
        deletedFiles.push(globalAxHome);
      }
    }

    return { restoredFiles, deletedFiles };
  }

  /**
   * Removes tool-generated files from a locally-provisioned project directory,
   * preserving user-owned rules in CLAUDE.md / AGENTS.md.
   */
  private static cleanupLocalTarget(
    targetDir: string,
    deletedFiles: string[],
    restoredFiles: string[]
  ): void {
    // Remove local .ax directory (contains only tool-generated constitution files)
    const localAxDir = path.join(targetDir, '.ax');
    if (fs.existsSync(localAxDir)) {
      fs.rmSync(localAxDir, { recursive: true, force: true });
      deletedFiles.push(localAxDir);
    }

    // Safely unlink or clean references in CLAUDE.md and AGENTS.md
    const ruleFiles = [
      path.join(targetDir, 'CLAUDE.md'),
      path.join(targetDir, 'AGENTS.md')
    ];

    for (const f of ruleFiles) {
      if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, 'utf-8');
        const filtered = content
          .split('\n')
          .filter(line =>
            !line.includes('.ax/CLAUDE.md') &&
            !line.includes('.ax/AGENTS.md') &&
            !line.includes('AX Onboarding Rule Reference') &&
            !line.includes('AX Onboarding Contract Reference')
          )
          .join('\n')
          .trim();

        if (filtered.length === 0) {
          fs.unlinkSync(f);
          deletedFiles.push(f);
        } else {
          fs.writeFileSync(f, filtered + '\n', 'utf-8');
          restoredFiles.push(f);
        }
      }
    }

    const envFile = path.join(targetDir, '.env.mcp');
    if (fs.existsSync(envFile)) {
      fs.unlinkSync(envFile);
      deletedFiles.push(envFile);
    }

    const runbooksDir = path.join(targetDir, 'runbooks');
    if (fs.existsSync(runbooksDir)) {
      fs.rmSync(runbooksDir, { recursive: true, force: true });
      deletedFiles.push(runbooksDir);
    }
  }
}
