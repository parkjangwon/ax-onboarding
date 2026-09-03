import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export class RollbackManager {
  /**
   * Restores ~/.claude.json from the latest timestamped backup if available,
   * and removes ONLY the files/directories that ax-onboarding created.
   * User-owned custom files under ~/.ax are preserved.
   */
  static rollback(targetDir?: string): { restoredFiles: string[]; deletedFiles: string[] } {
    const { GlobalPaths } = require('./paths.js');
    const restoredFiles: string[] = [];
    const deletedFiles: string[] = [];

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
      ];
      for (const artifact of knownArtifacts) {
        if (fs.existsSync(artifact)) {
          fs.rmSync(artifact, { recursive: true, force: true });
          deletedFiles.push(artifact);
        }
      }
      // Remove ~/.ax only if it is now empty (nothing user-owned left)
      const remaining = fs.readdirSync(globalAxHome).filter(f => !f.startsWith('.manifest'));
      if (remaining.length === 0) {
        fs.rmSync(globalAxHome, { recursive: true, force: true });
        deletedFiles.push(globalAxHome);
      }
    }

    // 3. Remove @~/.ax reference lines from global ~/.claude/CLAUDE.md
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

    // 4. Clean targetDir files if targetDir specified
    if (targetDir) {
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

    return { restoredFiles, deletedFiles };
  }
}
