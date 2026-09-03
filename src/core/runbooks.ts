import fs from 'node:fs';
import path from 'node:path';

export class RunbookInjector {
  /**
   * Injects production runbooks into the target project directory under <targetDir>/runbooks/
   */
  static inject(targetDir: string): string[] {
    const templatesDir = path.join(import.meta.dirname, '..', '..', 'templates', 'runbooks');
    const destDir = path.join(targetDir, 'runbooks');

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const createdFiles: string[] = [];
    if (fs.existsSync(templatesDir)) {
      const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const srcPath = path.join(templatesDir, file);
        const destPath = path.join(destDir, file);
        fs.copyFileSync(srcPath, destPath);
        createdFiles.push(destPath);
      }
    }

    return createdFiles;
  }
}
