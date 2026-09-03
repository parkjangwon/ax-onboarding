import { execSync } from 'node:child_process';

export interface DiscoveredSkill {
  packageId: string;
  url: string;
  installs?: string;
  installCommand: string;
}

export class SkillFinder {
  /**
   * Search for agent skills using skills.sh (Vercel Labs skills CLI)
   */
  static search(query: string, maxResults = 3): DiscoveredSkill[] {
    try {
      const output = execSync(`npx skills find "${query}" 2>/dev/null`, {
        encoding: 'utf-8',
        timeout: 10000
      });

      return this.parseOutput(output).slice(0, maxResults);
    } catch (err) {
      // Fallback: If offline or npx fails, return empty array
      return [];
    }
  }

  static parseOutput(rawText: string): DiscoveredSkill[] {
    const lines = rawText.split('\n');
    const results: DiscoveredSkill[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Match pattern like: owner/repo@skill-name 14.5K installs
      if (line.includes('@') && !line.startsWith('└') && !line.startsWith('Install with')) {
        const parts = line.split(/\s+/);
        const packageId = parts[0];
        const installs = parts.slice(1).join(' ');

        // Check next line for URL
        let url = `https://skills.sh/${packageId.replace('@', '/')}`;
        if (i + 1 < lines.length && lines[i + 1].includes('https://skills.sh/')) {
          url = lines[i + 1].replace(/[└\s]/g, '');
        }

        results.push({
          packageId,
          url,
          installs: installs || undefined,
          installCommand: `npx skills add ${packageId} -y`
        });
      }
    }

    return results;
  }
}
