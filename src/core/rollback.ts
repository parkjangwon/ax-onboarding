import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export class RollbackManager {
  /**
   * Restores ~/.claude.json from backup if available, and cleans generated files in targetDir
   */
  static rollback(targetDir?: string): { restoredFiles: string[]; deletedFiles: string[] } {
    const { GlobalPaths } = require('./paths.js');
    const restoredFiles: string[] = [];
    const deletedFiles: string[] = [];

    // 1. Restore ~/.claude.json
    const claudeJsonPath = GlobalPaths.getClaudeJsonPath();
    const backupPath = `${claudeJsonPath}.bak_axonboard`;

    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, claudeJsonPath);
      fs.unlinkSync(backupPath);
      restoredFiles.push(claudeJsonPath);
    }

    // 2. Clean Global ~/.ax files
    const globalAxHome = GlobalPaths.getAxHome();
    if (fs.existsSync(globalAxHome)) {
      fs.rmSync(globalAxHome, { recursive: true, force: true });
      deletedFiles.push(globalAxHome);
    }

    // 3. Remove @~/.ax line from global ~/.claude/CLAUDE.md
    const globalClaudeMd = GlobalPaths.getGlobalClaudeMdPath();
    if (fs.existsSync(globalClaudeMd)) {
      let content = fs.readFileSync(globalClaudeMd, 'utf-8');
      const filtered = content.split('\n').filter(line => !line.includes('.ax/CLAUDE.md')).join('\n');
      fs.writeFileSync(globalClaudeMd, filtered, 'utf-8');
      restoredFiles.push(globalClaudeMd);
    }

    // 4. Clean targetDir files if targetDir specified
    if (targetDir) {
      // Remove local .ax directory
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
            .filter(line => !line.includes('.ax/CLAUDE.md') && !line.includes('.ax/AGENTS.md') && !line.includes('AX Onboarding Rule Reference') && !line.includes('AX Onboarding Contract Reference'))
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
