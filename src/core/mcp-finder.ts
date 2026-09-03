import { execSync } from 'node:child_process';

export interface DiscoveredMcp {
  id: string;
  name: string;
  description: string;
  useCount?: number;
  installCommand: string;
}

export class McpFinder {
  /**
   * Search for MCP servers using Smithery CLI (@smithery/cli)
   */
  static search(query: string, maxResults = 3): DiscoveredMcp[] {
    try {
      const output = execSync(`npx -y @smithery/cli mcp search "${query}" 2>/dev/null`, {
        encoding: 'utf-8',
        timeout: 10000
      });

      return this.parseOutput(output).slice(0, maxResults);
    } catch {
      return [];
    }
  }

  static parseOutput(rawText: string): DiscoveredMcp[] {
    const results: DiscoveredMcp[] = [];
    const lines = rawText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) continue;

      try {
        const item = JSON.parse(trimmed);
        if (item.qualifiedName || item.name) {
          const id = item.qualifiedName || item.name;
          results.push({
            id,
            name: item.name || id,
            description: item.description || '',
            useCount: item.useCount,
            installCommand: `npx -y @smithery/cli mcp add "${id}" --client claude-code`
          });
        }
      } catch {
        // ignore malformed lines
      }
    }

    return results;
  }
}
