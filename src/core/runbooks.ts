import fs from 'node:fs';
import path from 'node:path';
import { GlobalPaths } from './paths.js';

export class RunbookInjector {
  /**
   * Injects production runbooks into global (~/.ax/runbooks/) or target directory
   */
  static inject(targetDir?: string): string[] {
    const templatesDir = path.join(import.meta.dirname, '..', '..', 'templates', 'runbooks');
    const destDir = targetDir ? path.join(targetDir, 'runbooks') : GlobalPaths.getGlobalRunbooksDir();

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const createdFiles: string[] = [];
    if (fs.existsSync(templatesDir)) {
      const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const srcPath = path.join(templatesDir, file);
        const destPath = path.join(destDir, file);
        // Do not overwrite user-owned runbooks
        if (fs.existsSync(destPath)) {
          continue;
        }
        fs.copyFileSync(srcPath, destPath);
        createdFiles.push(destPath);
      }
    }

    return createdFiles;
  }
}
