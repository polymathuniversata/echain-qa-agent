import { promises as fs } from 'fs';
import path from 'path';
import fse from 'fs-extra';

export class GitHooksManager {
  private projectRoot: string;
  private commandExecutor: any; // Reference to CommandExecutor

  constructor(projectRoot: string, commandExecutor: any) {
    this.projectRoot = projectRoot;
    this.commandExecutor = commandExecutor;
  }

  async setupHooks(): Promise<void> {
    console.log('INFO: Setting up git hooks...');

    const hooksDir = path.join(this.projectRoot, '.git', 'hooks');
    await fse.ensureDir(hooksDir);

    const platform = process.platform;
    const isWindows = platform === 'win32';

    // Generate hooks based on platform
    if (isWindows) {
      await this.generateWindowsHooks(hooksDir);
    } else {
      await this.generateUnixHooks(hooksDir);
    }

    console.log('SUCCESS: Git hooks setup completed');
  }

  async checkHooks(): Promise<boolean> {
    console.log('INFO: Checking git hooks status...');

    const hooksDir = path.join(this.projectRoot, '.git', 'hooks');
    const preCommitHook = path.join(hooksDir, 'pre-commit');
    const prePushHook = path.join(hooksDir, 'pre-push');

    const preCommitExists = await fse.pathExists(preCommitHook);
    const prePushExists = await fse.pathExists(prePushHook);

    if (!preCommitExists && !prePushExists) {
      console.log('WARNING: No QA hooks found');
      return false;
    }

    if (preCommitExists) {
      // Check if it's executable and contains QA logic
      try {
        const content = await fse.readFile(preCommitHook, 'utf-8');
        if (content.includes('QA checks')) {
          console.log('SUCCESS: Pre-commit hook is properly configured');
        } else {
          console.log('WARNING: Pre-commit hook exists but may not be QA hook');
        }
      } catch {
        console.log('WARNING: Cannot read pre-commit hook');
      }
    }

    if (prePushExists) {
      try {
        const content = await fse.readFile(prePushHook, 'utf-8');
        if (content.includes('QA checks')) {
          console.log('SUCCESS: Pre-push hook is properly configured');
        } else {
          console.log('WARNING: Pre-push hook exists but may not be QA hook');
        }
      } catch {
        console.log('WARNING: Cannot read pre-push hook');
      }
    }

    return true;
  }

  async removeHooks(): Promise<void> {
    console.log('INFO: Removing git hooks...');

    const hooksDir = path.join(this.projectRoot, '.git', 'hooks');
    const preCommitHook = path.join(hooksDir, 'pre-commit');
    const prePushHook = path.join(hooksDir, 'pre-push');

    let removed = false;

    if (await fse.pathExists(preCommitHook)) {
      try {
        const content = await fse.readFile(preCommitHook, 'utf-8');
        if (content.includes('QA checks')) {
          await fs.unlink(preCommitHook);
          console.log('SUCCESS: Pre-commit hook removed');
          removed = true;
        } else {
          console.log('WARNING: Pre-commit hook exists but is not a QA hook - not removing');
        }
      } catch {
        console.log('ERROR: Failed to remove pre-commit hook');
      }
    }

    if (await fse.pathExists(prePushHook)) {
      try {
        const content = await fse.readFile(prePushHook, 'utf-8');
        if (content.includes('QA checks')) {
          await fs.unlink(prePushHook);
          console.log('SUCCESS: Pre-push hook removed');
          removed = true;
        } else {
          console.log('WARNING: Pre-push hook exists but is not a QA hook - not removing');
        }
      } catch {
        console.log('ERROR: Failed to remove pre-push hook');
      }
    }

    if (!removed) {
      console.log('INFO: No QA hooks found to remove');
    } else {
      console.log('SUCCESS: Git hooks removal completed');
    }
  }

  private async generateUnixHooks(_hooksDir: string): Promise<void> {
    const setupScript = path.join(__dirname, '..', 'scripts', 'setup-hooks.sh');
    if (!(await fse.pathExists(setupScript))) {
      throw new Error('Setup script not found');
    }

    const success = await this.commandExecutor.runCommand(
      `bash "${setupScript}"`,
      'Git hooks setup'
    );
    if (!success) {
      throw new Error('Failed to setup git hooks');
    }
  }

  private async generateWindowsHooks(hooksDir: string): Promise<void> {
    // Generate PowerShell-based hooks for Windows
    const preCommitHook = path.join(hooksDir, 'pre-commit');
    const prePushHook = path.join(hooksDir, 'pre-push');

    // Pre-commit hook (PowerShell)
    const preCommitContent = `# Pre-commit hook to run QA checks before commits
Write-Host "🛡️ Running QA checks before commit..." -ForegroundColor Blue

$projectRoot = git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not in a git repository" -ForegroundColor Red
    exit 1
}

if (Test-Path "$projectRoot/package.json") {
    $qaAgentAvailable = $false
    if (Test-Path "$projectRoot/node_modules/@echain/qa-agent") {
        $qaAgentAvailable = $true
    } elseif (Get-Command echain-qa -ErrorAction SilentlyContinue) {
        $qaAgentAvailable = $true
    }

    if ($qaAgentAvailable) {
        Write-Host "🔍 Running QA agent checks..." -ForegroundColor Yellow

        $command = $null
        if (Get-Command echain-qa -ErrorAction SilentlyContinue) {
            $command = "echain-qa run --dry-run --verbose"
        } elseif (Test-Path "$projectRoot/node_modules/.bin/echain-qa") {
            $command = "& '$projectRoot/node_modules/.bin/echain-qa' run --dry-run --verbose"
        }

        if ($command) {
            try {
                Invoke-Expression $command
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "❌ QA checks failed. Please fix issues before committing." -ForegroundColor Red
                    exit 1
                }
                Write-Host "✅ QA checks passed" -ForegroundColor Green
            } catch {
                Write-Host "❌ QA checks failed. Please fix issues before committing." -ForegroundColor Red
                exit 1
            }
        }
    } else {
        Write-Host "⚠️  QA agent not found. Install with: npm install --save-dev @echain/qa-agent" -ForegroundColor Yellow
    }
}

exit 0`;

    // Pre-push hook (PowerShell)
    const prePushContent = `# Pre-push hook to run comprehensive QA checks before pushing
Write-Host "🛡️ Running comprehensive QA checks before push..." -ForegroundColor Blue

$projectRoot = git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not in a git repository" -ForegroundColor Red
    exit 1
}

if (Test-Path "$projectRoot/package.json") {
    $qaAgentAvailable = $false
    if (Test-Path "$projectRoot/node_modules/@echain/qa-agent") {
        $qaAgentAvailable = $true
    } elseif (Get-Command echain-qa -ErrorAction SilentlyContinue) {
        $qaAgentAvailable = $true
    }

    if ($qaAgentAvailable) {
        Write-Host "🔍 Running comprehensive QA agent checks..." -ForegroundColor Yellow

        $command = $null
        if (Get-Command echain-qa -ErrorAction SilentlyContinue) {
            $command = "echain-qa run --verbose"
        } elseif (Test-Path "$projectRoot/node_modules/.bin/echain-qa") {
            $command = "& '$projectRoot/node_modules/.bin/echain-qa' run --verbose"
        }

        if ($command) {
            try {
                Invoke-Expression $command
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "❌ QA checks failed. Please fix critical issues before pushing." -ForegroundColor Red
                    exit 1
                }
                Write-Host "✅ All QA checks passed - ready for push!" -ForegroundColor Green
            } catch {
                Write-Host "❌ QA checks failed. Please fix critical issues before pushing." -ForegroundColor Red
                exit 1
            }
        }
    } else {
        Write-Host "⚠️  QA agent not found. Install with: npm install --save-dev @echain/qa-agent" -ForegroundColor Yellow
    }
}

exit 0`;

    // Write hooks
    await fse.writeFile(preCommitHook, preCommitContent);
    await fse.writeFile(prePushHook, prePushContent);

    // Make executable (Windows doesn't use chmod, but Git for Windows can handle it)
    try {
      await this.commandExecutor.runCommand(
        `chmod +x "${preCommitHook}"`,
        'Make pre-commit executable'
      );
      await this.commandExecutor.runCommand(
        `chmod +x "${prePushHook}"`,
        'Make pre-push executable'
      );
    } catch {
      // On Windows, chmod might not be available, but Git hooks should still work
      console.log('WARNING: Could not set executable permissions on hooks (expected on Windows)');
    }

    console.log('SUCCESS: Windows PowerShell hooks installed');
  }
}
