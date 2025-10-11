import path from 'path';
import fse from 'fs-extra';
import { globSync } from 'glob';
import cliProgress from 'cli-progress';

export interface SecurityResults {
  issues: number;
  duration: number;
  timestamp: Date;
}

export class SecurityScanner {
  private projectRoot: string;
  private commandExecutor: any; // Reference to CommandExecutor

  constructor(projectRoot: string, commandExecutor: any) {
    this.projectRoot = projectRoot;
    this.commandExecutor = commandExecutor;
  }

  async runSecurityChecks(): Promise<SecurityResults> {
    const startTime = Date.now();
    let issues = 0;

    console.log('INFO: Starting security analysis...');

    // Check if we have a package.json and package-lock.json in the project root
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageLockPath = path.join(this.projectRoot, 'package-lock.json');
    const yarnLockPath = path.join(this.projectRoot, 'yarn.lock');
    const pnpmLockPath = path.join(this.projectRoot, 'pnpm-lock.yaml');

    const hasPackageJson = await fse.pathExists(packageJsonPath);
    const hasPackageLock =
      (await fse.pathExists(packageLockPath)) ||
      (await fse.pathExists(yarnLockPath)) ||
      (await fse.pathExists(pnpmLockPath));

    if (!hasPackageJson) {
      console.log('WARNING: No package.json found in project root - skipping dependency audit');
    } else if (!hasPackageLock) {
      console.log(
        'WARNING: No lockfile (package-lock.json, yarn.lock, or pnpm-lock.yaml) found - skipping dependency audit'
      );
    } else {
      // Dependency audits - only run if we have the necessary files
      const rootAudit = await this.commandExecutor.runCommand(
        'npm audit --audit-level moderate',
        'NPM security audit'
      );
      if (!rootAudit) {issues++;}
    }

    const blockchainPath = path.join(this.projectRoot, 'blockchain');
    if (await fse.pathExists(blockchainPath)) {
      const blockchainPackageJson = path.join(blockchainPath, 'package.json');
      const blockchainLock = path.join(blockchainPath, 'package-lock.json');

      if ((await fse.pathExists(blockchainPackageJson)) && (await fse.pathExists(blockchainLock))) {
        const blockchainAudit = await this.commandExecutor.runCommand(
          'cd blockchain && npm audit --audit-level moderate',
          'Blockchain dependency audit'
        );
        if (!blockchainAudit) {issues++;}
      } else {
        console.log(
          'INFO: Blockchain directory exists but no package.json/lockfile - skipping blockchain audit'
        );
      }
    }

    // Secret detection
    const secretIssues = await this.checkForExposedSecrets();
    issues += secretIssues;

    const duration = (Date.now() - startTime) / 1000;
    return {
      issues,
      duration,
      timestamp: new Date(),
    };
  }

  private async checkForExposedSecrets(): Promise<number> {
    console.log('INFO: Checking for exposed secrets...');

    const patterns = [
      'PRIVATE_KEY.*[0-9a-fA-F]{32,}',
      'SECRET.*[a-zA-Z0-9_-]{20,}',
      'PASSWORD.*[a-zA-Z0-9_-]{8,}',
    ];

    // Only scan relevant file types and directories
    const includePatterns = [
      '**/*.{js,ts,json,env,config,yml,yaml,toml}',
      'contracts/**/*.{sol}',
      'scripts/**/*',
      'src/**/*',
      'lib/**/*',
      'config/**/*',
      '.env*',
      'hardhat.config.*',
      'truffle-config.*',
      'foundry.toml',
    ];

    const excludeDirs = [
      'node_modules',
      '.git',
      'logs',
      'docs',
      '.next',
      'dist',
      'build',
      'cache',
      'artifacts',
      'coverage',
      'tmp',
      'temp',
    ];

    const excludeFiles = [
      '*.md',
      '*.log',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '*.min.js',
      '*.min.css',
    ];

    const excludePatterns = [
      // QA agent source files (don't scan our own security code)
      'qa-agent.ts',
      'qa-agent.js',
      // Common legitimate patterns
      'regex',
      'pattern',
      'example',
      'placeholder',
      'template',
      'mock',
      'test',
      'spec',
      // Security-related code
      'security',
      'audit',
      'scan',
      'detect',
      'check',
    ];

    let issues = 0;
    let filesScanned = 0;
    let totalFiles = 0;

    // First pass: count total files to scan
    for (const includePattern of includePatterns) {
      try {
        const files = globSync(includePattern, {
          cwd: this.projectRoot,
          ignore: [...excludeDirs.map(dir => `${dir}/**`), ...excludeFiles],
          nodir: true,
          absolute: false,
        });
        totalFiles += files.length;
      } catch (error) {
        console.log(`WARNING: Failed to count files for pattern ${includePattern}: ${error}`);
        // Skip invalid glob patterns
      }
    }

    // Create progress bar
    const progressBar = new cliProgress.SingleBar({
      format: '🔍 Scanning for secrets | {bar} | {percentage}% | {value}/{total} files',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    });

    progressBar.start(totalFiles, 0);

    // Use more specific glob patterns instead of scanning everything
    for (const includePattern of includePatterns) {
      try {
        const files = globSync(includePattern, {
          cwd: this.projectRoot,
          ignore: [...excludeDirs.map(dir => `${dir}/**`), ...excludeFiles],
          nodir: true,
          absolute: false,
        });

        for (const file of files) {
          if (filesScanned > 1000) {
            console.log(
              'WARNING: Secret scan limit reached (1000 files). Consider reviewing large codebases manually.'
            );
            break;
          }

          filesScanned++;
          progressBar.update(filesScanned);

          try {
            const content = await fse.readFile(path.join(this.projectRoot, file), 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (
                new RegExp(patterns.join('|')).test(line) &&
                !line.includes('process.env') &&
                !line.includes('import.meta.env') &&
                !line.includes('your_') &&
                !line.includes('_here') &&
                !line.includes('placeholder') &&
                !line.includes('example') &&
                !excludePatterns.some(excl => line.toLowerCase().includes(excl.toLowerCase()))
              ) {
                // Additional check: skip lines that are clearly regex patterns or security code
                if (
                  line.includes('const patterns = [') ||
                  line.includes('RegExp(') ||
                  line.includes('regex') ||
                  line.includes('pattern') ||
                  file.includes('qa-agent')
                ) {
                  continue; // Skip this line - it's legitimate security code
                }
                console.log(`ERROR: Potential exposed secret found in ${file}:${i + 1}`);
                issues++;
              }
            }
          } catch (error) {
            console.log(`WARNING: Failed to scan file ${file}: ${error}`);
            // Skip binary files or files that can't be read
          }
        }

        if (filesScanned > 1000) {break;}
      } catch (error) {
        console.log(`WARNING: Failed to scan files for pattern ${includePattern}: ${error}`);
        // Skip invalid glob patterns
      }
    }

    progressBar.stop();
    console.log(`INFO: Secret scan completed: ${filesScanned} files scanned`);

    if (issues === 0) {
      console.log('SUCCESS: No exposed secrets detected');
    }

    return issues;
  }
}
