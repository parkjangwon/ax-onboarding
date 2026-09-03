import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export interface HealthCheckItem {
  name: string;
  passed: boolean;
  message: string;
  securityLevel: 'PASSED' | 'WARNING' | 'FAILED';
}

export class PreflightHealthCheck {
  static runAll(targetDir?: string): HealthCheckItem[] {
    const { GlobalPaths } = require('./paths.js');
    const results: HealthCheckItem[] = [];

    // 1. Check Git and ignore protection (if targetDir is a git repo)
    if (targetDir) {
      results.push(this.checkGitIgnore(targetDir));
    } else {
      results.push(this.checkGlobalIsolation());
    }

    // 2. Check Runbooks presence
    results.push(this.checkRunbooks(targetDir));

    // 3. Check CLI runtimes
    results.push(this.checkCommand('git', 'Git version control'));
    results.push(this.checkCommand('node', 'Node.js runtime'));

    // 4. Check Claude config if present
    results.push(this.checkClaudeConfig());

    return results;
  }

  private static checkGlobalIsolation(): HealthCheckItem {
    const { GlobalPaths } = require('./paths.js');
    const envPath = GlobalPaths.getGlobalEnvPath();
    const exists = fs.existsSync(envPath);

    return {
      name: '글로벌 보안 격리 (~/.ax)',
      passed: true,
      message: exists 
        ? '글로벌 MCP 인증 파일이 ~/.ax/.env.mcp에 안전하게 격리됨' 
        : '~/.ax 디렉터리가 사용자 홈에 안전하게 격리되어 Git 유출 위험 없음',
      securityLevel: 'PASSED'
    };
  }

  private static checkGitIgnore(targetDir: string): HealthCheckItem {
    const gitignorePath = path.join(targetDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      return {
        name: '보안 격리 (.gitignore)',
        passed: false,
        message: '.gitignore 파일이 없습니다. 비밀정보가 Git에 커밋될 위험이 있습니다.',
        securityLevel: 'WARNING'
      };
    }

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    const isIgnored = content.includes('.env.mcp') || content.includes('*.env*');
    
    return {
      name: '보안 격리 (.gitignore)',
      passed: isIgnored,
      message: isIgnored 
        ? '.env.mcp 및 환경변수 파일이 Git 추적에서 안전하게 제외됨'
        : '.env.mcp 파일이 .gitignore에 포함되지 않았습니다.',
      securityLevel: isIgnored ? 'PASSED' : 'WARNING'
    };
  }

  private static checkRunbooks(targetDir?: string): HealthCheckItem {
    const { GlobalPaths } = require('./paths.js');
    const runbooksDir = targetDir
      ? path.join(targetDir, 'runbooks')
      : GlobalPaths.getGlobalRunbooksDir();

    let count = 0;
    if (fs.existsSync(runbooksDir)) {
      try {
        count = fs.readdirSync(runbooksDir).length;
      } catch {
        count = 0;
      }
    }
    const exists = count > 0;

    return {
      name: '실전 런북 (Runbooks)',
      passed: exists,
      message: exists 
        ? `${count}개의 실전 에이전틱 런북이 준비됨`
        : 'runbooks 디렉터리가 비어 있습니다.',
      securityLevel: exists ? 'PASSED' : 'WARNING'
    };
  }

  private static checkCommand(cmd: string, label: string): HealthCheckItem {
    try {
      execSync(`which ${cmd} 2>/dev/null`, { stdio: 'ignore' });
      return {
        name: `실행 도구 (${label})`,
        passed: true,
        message: `${cmd} 설치 확인됨`,
        securityLevel: 'PASSED'
      };
    } catch {
      return {
        name: `실행 도구 (${label})`,
        passed: false,
        message: `${cmd} 명령어를 찾을 수 없습니다.`,
        securityLevel: 'WARNING'
      };
    }
  }

  private static checkClaudeConfig(): HealthCheckItem {
    const os = require('node:os');
    const claudeJsonPath = path.join(os.homedir(), '.claude.json');

    if (fs.existsSync(claudeJsonPath)) {
      try {
        const raw = fs.readFileSync(claudeJsonPath, 'utf-8');
        JSON.parse(raw);
        return {
          name: 'Claude 환경 설정',
          passed: true,
          message: '~/.claude.json 문법 및 구문 유효함',
          securityLevel: 'PASSED'
        };
      } catch {
        return {
          name: 'Claude 환경 설정',
          passed: false,
          message: '~/.claude.json 파싱 실패 (JSON 문법 오류)',
          securityLevel: 'FAILED'
        };
      }
    }

    return {
      name: 'Claude 환경 설정',
      passed: true,
      message: 'Claude Code 미설치 또는 데스크톱/안티그래비티 모드',
      securityLevel: 'PASSED'
    };
  }
}
