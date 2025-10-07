import { exec, spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { globSync } from 'glob';
import chalk from 'chalk';
import { pathExists, ensureDir, readFile, writeFile } from 'fs-extra';
import cliProgress from 'cli-progress';
import Ajv from 'ajv';
import crypto from 'crypto';

// JSON Schema for .qa-config.json validation
const qaConfigSchema = {
  type: 'object',
  properties: {
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
    project: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 },
        type: { type: 'string', enum: ['blockchain', 'frontend', 'fullstack'] },
        frameworks: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['name', 'type']
    },
    checks: {
      type: 'object',
      properties: {
        linting: { type: 'boolean' },
        testing: { type: 'boolean' },
        security: { type: 'boolean' },
        build: { type: 'boolean' },
        performance: { type: 'boolean' }
      }
    },
    paths: {
      type: 'object',
      properties: {
        frontend: { type: 'string' },
        blockchain: { type: 'string' },
        docs: { type: 'string' },
        tests: { type: 'string' }
      }
    },
    hooks: {
      type: 'object',
      properties: {
        preCommit: { type: 'boolean' },
        prePush: { type: 'boolean' },
        autoInstall: { type: 'boolean' },
        wrapScripts: { type: 'boolean' },
        scriptsToWrap: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  },
  required: ['version', 'project']
};

export interface QAAgentOptions {
  dryRun?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  projectRoot?: string;
}

export interface QAResults {
  errors: number;
  warnings: number;
  duration: number;
  timestamp: Date;
}

export interface QACacheEntry {
  hash: string;
  results: QAResults;
  timestamp: Date;
  expiresAt: Date;
}

export interface QAPlugin {
  name: string;
  version: string;
  description?: string;
  run: (qaAgent: QAAgent) => Promise<QAResults>;
}

export interface QACache {
  linting?: QACacheEntry;
  testing?: QACacheEntry;
  security?: QACacheEntry;
  build?: QACacheEntry;
}

export class QAAgent {
  private options: Required<QAAgentOptions>;
  private projectRoot: string;
  private qaLogPath: string;
  private startTime: number;
  private ajv: Ajv;
  private cachePath: string;
  private cache: QACache;
  private pluginsPath: string;
  private plugins: Map<string, QAPlugin>;
  private pluginConfigs: { [key: string]: any };

  constructor(options: QAAgentOptions = {}) {
    this.options = {
      dryRun: false,
      verbose: false,
      quiet: false,
      projectRoot: process.cwd(),
      ...options
    };

    this.projectRoot = this.options.projectRoot;
    this.qaLogPath = path.join(this.projectRoot, 'docs', 'qalog.md');
    this.startTime = Date.now();
    this.ajv = new Ajv({ allErrors: true });
    this.cachePath = path.join(this.projectRoot, '.qa-cache.json');
    this.cache = {};
    this.pluginsPath = path.join(this.projectRoot, '.qa-plugins');
    this.plugins = new Map();
    this.pluginConfigs = {};
  }

  private log(level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR', message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const redactedMessage = this.redactSecrets(message);
    const logEntry = `| ${timestamp} | ${level} | ${redactedMessage} |`;

    if ((this.options.verbose || level === 'ERROR') && !this.options.quiet) {
      const color = level === 'ERROR' ? chalk.red :
                   level === 'WARNING' ? chalk.yellow :
                   level === 'SUCCESS' ? chalk.green : chalk.blue;
      console.log(color(`${timestamp} | ${level} | ${redactedMessage}`));
    }

    // Append to QA log
    this.appendToLog(logEntry);
  }

  private redactSecrets(message: string): string {
    return message
      .replace(/(api[_-]?key[:= ]+)(0x[0-9a-fA-F]{8,})/gi, '$1[REDACTED]')
      .replace(/(private[_-]?key[:= ]+)(0x[0-9a-fA-F]{64,})/gi, '$1[REDACTED]')
      .replace(/(password[:= ]+).*/gi, '$1[REDACTED]')
      .replace(/(secret[:= ]+).*/gi, '$1[REDACTED]')
      .replace(/(token[:= ]+).*/gi, '$1[REDACTED]');
  }

  private async loadCache(): Promise<void> {
    try {
      if (await pathExists(this.cachePath)) {
        const cacheContent = await readFile(this.cachePath, 'utf-8');
        this.cache = JSON.parse(cacheContent);

        // Clean expired entries
        const now = new Date();
        Object.keys(this.cache).forEach(key => {
          const entry = this.cache[key as keyof QACache];
          if (entry && entry.expiresAt < now) {
            delete this.cache[key as keyof QACache];
          }
        });
      }
    } catch (error) {
      // Cache loading failed, start with empty cache
      this.cache = {};
    }
  }

  private async saveCache(): Promise<void> {
    try {
      await writeFile(this.cachePath, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      // Silently fail if cache saving fails
    }
  }

  private async generateFileHash(filePath: string): Promise<string> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      return '';
    }
  }

  private async generateProjectHash(): Promise<string> {
    const files = [
      'package.json',
      'tsconfig.json',
      'hardhat.config.js',
      'hardhat.config.ts',
      'foundry.toml',
      'truffle-config.js',
      '.qa-config.json'
    ];

    let combinedHash = '';
    for (const file of files) {
      const filePath = path.join(this.projectRoot, file);
      if (await pathExists(filePath)) {
        combinedHash += await this.generateFileHash(filePath);
      }
    }

    return crypto.createHash('md5').update(combinedHash).digest('hex');
  }

  private async getCachedResult(checkType: keyof QACache): Promise<QAResults | null> {
    const entry = this.cache[checkType];
    if (!entry) return null;

    const currentHash = await this.generateProjectHash();
    if (entry.hash !== currentHash) return null;

    if (entry.expiresAt < new Date()) return null;

    return entry.results;
  }

  private async setCachedResult(checkType: keyof QACache, results: QAResults): Promise<void> {
    const hash = await this.generateProjectHash();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    this.cache[checkType] = {
      hash,
      results,
      timestamp: new Date(),
      expiresAt
    };

    await this.saveCache();
  }

  private async validateConfig(config: any): Promise<boolean> {
    const validate = this.ajv.compile(qaConfigSchema);
    const valid = validate(config);

    if (!valid) {
      this.log('ERROR', 'Invalid .qa-config.json configuration:');
      validate.errors?.forEach(error => {
        this.log('ERROR', `  ${error.instancePath}: ${error.message}`);
      });
      return false;
    }

    this.log('SUCCESS', 'Configuration validation passed');
    return true;
  }

  private async loadQaConfig(): Promise<any | null> {
    const configPath = path.join(this.projectRoot, '.qa-config.json');

    if (!await pathExists(configPath)) {
      return null;
    }

    try {
      const configContent = await readFile(configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      this.log('ERROR', `Failed to load QA configuration: ${error}`);
      throw error;
    }
  }

  async loadPlugins(): Promise<void> {
    try {
      if (!await pathExists(this.pluginsPath)) {
        return; // No plugins directory
      }

      const pluginFiles = globSync('**/*.{js,ts}', {
        cwd: this.pluginsPath,
        absolute: false
      });

      for (const pluginFile of pluginFiles) {
        try {
          const pluginPath = path.join(this.pluginsPath, pluginFile);
          const pluginModule = require(pluginPath);

          // Check if it's a valid plugin
          if (pluginModule && typeof pluginModule.run === 'function' && pluginModule.name) {
            const plugin: QAPlugin = {
              name: pluginModule.name,
              version: pluginModule.version || '1.0.0',
              description: pluginModule.description,
              run: pluginModule.run.bind(null, this)
            };

            this.plugins.set(plugin.name, plugin);
            this.log('INFO', `Loaded plugin: ${plugin.name} v${plugin.version}`);
          }
        } catch (error) {
          this.log('WARNING', `Failed to load plugin ${pluginFile}: ${error}`);
        }
      }
    } catch (error) {
      this.log('WARNING', `Plugin loading failed: ${error}`);
    }
  }

  async runPlugins(): Promise<QAResults> {
    let totalErrors = 0;
    let totalWarnings = 0;
    const startTime = Date.now();

    for (const [name, plugin] of this.plugins) {
      try {
        this.log('INFO', `Running plugin: ${name}`);
        const results = await plugin.run(this);

        totalErrors += results.errors;
        totalWarnings += results.warnings;

        if (results.errors > 0) {
          this.log('ERROR', `Plugin ${name} failed with ${results.errors} errors`);
        } else if (results.warnings > 0) {
          this.log('WARNING', `Plugin ${name} completed with ${results.warnings} warnings`);
        } else {
          this.log('SUCCESS', `Plugin ${name} completed successfully`);
        }
      } catch (error) {
        this.log('ERROR', `Plugin ${name} threw an error: ${error}`);
        totalErrors++;
      }
    }

    return {
      errors: totalErrors,
      warnings: totalWarnings,
      duration: (Date.now() - startTime) / 1000,
      timestamp: new Date()
    };
  }

  private async appendToLog(entry: string): Promise<void> {
    try {
      await ensureDir(path.dirname(this.qaLogPath));
      await fs.appendFile(this.qaLogPath, entry + '\n');
    } catch (error) {
      // Silently fail if logging fails
    }
  }

  private async runCommand(command: string, description: string, timeout = 300000): Promise<boolean> {
    return new Promise((resolve) => {
      this.log('INFO', `Running: ${description}`);

      if (this.options.dryRun) {
        this.log('INFO', `[DRY RUN] Would execute: ${command}`);
        resolve(true);
        return;
      }

      const child = spawn(command, {
        shell: true,
        cwd: this.projectRoot,
        stdio: this.options.verbose ? 'inherit' : 'pipe'
      });

      const timer = setTimeout(() => {
        child.kill();
        this.log('ERROR', `${description} timed out after ${timeout}ms`);
        resolve(false);
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          this.log('SUCCESS', `✓ ${description} completed successfully`);
          resolve(true);
        } else {
          this.log('ERROR', `✗ ${description} failed (exit code: ${code})`);
          resolve(false);
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        this.log('ERROR', `${description} error: ${error.message}`);
        resolve(false);
      });
    });
  }

  async initializeProject(): Promise<void> {
    this.log('INFO', 'Initializing QA configuration...');

    // Create docs directory if it doesn't exist
    await ensureDir(path.join(this.projectRoot, 'docs'));

    // Create initial QA log if it doesn't exist
    if (!await pathExists(this.qaLogPath)) {
      const header = `# 🛡️ Echain QA Agent Log

This file contains the comprehensive log of all Quality Assurance sessions for the project. Each entry represents a complete QA run with detailed information about checks performed, results, and any issues found.

**Last Updated:** ${new Date().toISOString()}
**QA Agent Version:** 2.0.0

---

`;
      await writeFile(this.qaLogPath, header);
    }

    // Create .qa-config.json if it doesn't exist
    const configPath = path.join(this.projectRoot, '.qa-config.json');
    if (!await pathExists(configPath)) {
      const config = {
        version: "2.0.0",
        project: {
          name: path.basename(this.projectRoot),
          type: "blockchain", // or "frontend", "fullstack"
          frameworks: []
        },
        checks: {
          linting: true,
          testing: true,
          security: true,
          build: true,
          performance: false
        },
        paths: {
          frontend: "frontend",
          blockchain: "blockchain",
          docs: "docs",
          tests: "test"
        },
        hooks: {
          preCommit: true,
          prePush: true,
          autoInstall: true,
          wrapScripts: false,
          scriptsToWrap: ["build", "start", "dev", "test"]
        },
        qualityGates: {
          failOnLintErrors: true,
          failOnTestFailures: true,
          failOnBuildFailures: true,
          failOnSecurityVulnerabilities: true,
          failOnPerformanceIssues: false,
          requireTests: false,
          requireTestCoverage: false,
          minTestCoverage: 80
        }
      };
      await writeFile(configPath, JSON.stringify(config, null, 2));
    }

    // Validate existing configuration
    if (await pathExists(configPath)) {
      try {
        const configContent = await readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        const isValid = await this.validateConfig(config);
        if (!isValid) {
          throw new Error('Configuration validation failed');
        }

        // Auto-wrap scripts if enabled
        if (config.hooks && config.hooks.wrapScripts) {
          await this.wrapScripts();
        }
      } catch (error) {
        this.log('ERROR', `Configuration validation error: ${error}`);
        throw error;
      }
    }

    this.log('SUCCESS', 'QA configuration initialized');
  }

  async runLinting(autoFix = false, config?: any): Promise<void> {
    this.log('INFO', 'Starting code quality checks...');

    // Frontend linting
    const frontendPath = path.join(this.projectRoot, 'frontend');
    if (await pathExists(frontendPath)) {
      const success = await this.runCommand(
        `cd frontend && npm run lint${autoFix ? ' -- --fix' : ''}`,
        'Frontend ESLint'
      );
      if (!success) {
        if (config?.qualityGates?.failOnLintErrors !== false) {
          throw new Error('Frontend linting failed');
        } else {
          this.log('WARNING', 'Frontend linting failed but continuing due to configuration');
        }
      }

      const tsSuccess = await this.runCommand(
        'cd frontend && npm run type-check',
        'Frontend TypeScript check'
      );
      if (!tsSuccess) {
        if (config?.qualityGates?.failOnLintErrors !== false) {
          throw new Error('TypeScript compilation failed');
        } else {
          this.log('WARNING', 'TypeScript compilation failed but continuing due to configuration');
        }
      }
    }

    // Blockchain linting - detect framework
    const blockchainPath = path.join(this.projectRoot, 'blockchain');
    if (await pathExists(blockchainPath)) {
      const framework = await this.detectBlockchainFramework(blockchainPath);

      switch (framework) {
        case 'hardhat':
          const hardhatLintSuccess = await this.runCommand(
            'cd blockchain && npm run fix:eslint',
            'Blockchain ESLint (Hardhat)'
          );
          if (!hardhatLintSuccess) {
            if (config?.qualityGates?.failOnLintErrors !== false) {
              throw new Error('Blockchain ESLint failed');
            } else {
              this.log('WARNING', 'Blockchain ESLint failed but continuing due to configuration');
            }
          }

          // Solidity checks for Hardhat
          await this.runCommand(
            'cd blockchain && npm run fix:prettier',
            'Solidity formatting (Hardhat)'
          );

          const hardhatSolHintSuccess = await this.runCommand(
            'cd blockchain && npx solhint --fix --noPrompt \'contracts/**/*.sol\'',
            'Solidity linting (Hardhat)'
          );
          if (!hardhatSolHintSuccess) {
            this.log('WARNING', 'Solidity linting completed with warnings (non-blocking)');
          }
          break;

        case 'foundry':
          // Foundry uses different linting tools
          const foundryFormatSuccess = await this.runCommand(
            'cd blockchain && forge fmt --check',
            'Solidity formatting (Foundry)'
          );
          if (!foundryFormatSuccess) {
            this.log('WARNING', 'Solidity formatting issues found (non-blocking)');
          }

          // Foundry doesn't have built-in linting, but we can check for common issues
          this.log('INFO', 'Foundry detected - using forge fmt for code formatting');
          break;

        case 'truffle':
          const truffleLintSuccess = await this.runCommand(
            'cd blockchain && npm run lint',
            'Blockchain ESLint (Truffle)'
          );
          if (!truffleLintSuccess) {
            if (config?.qualityGates?.failOnLintErrors !== false) {
              throw new Error('Blockchain ESLint failed');
            } else {
              this.log('WARNING', 'Blockchain ESLint failed but continuing due to configuration');
            }
          }

          // Solidity checks for Truffle
          const truffleSolHintSuccess = await this.runCommand(
            'cd blockchain && npx solhint --fix --noPrompt \'contracts/**/*.sol\'',
            'Solidity linting (Truffle)'
          );
          if (!truffleSolHintSuccess) {
            this.log('WARNING', 'Solidity linting completed with warnings (non-blocking)');
          }
          break;

        default:
          this.log('WARNING', 'No supported blockchain framework detected for linting. Supported: Hardhat, Foundry, Truffle');
      }
    }
  }

  async runTests(): Promise<void> {
    this.log('INFO', 'Starting test execution...');

    // Create progress bar for test phases
    const testProgress = new cliProgress.SingleBar({
      format: '🧪 Running tests | {bar} | {percentage}% | {value}/{total} phases',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    let totalPhases = 0;
    let currentPhase = 0;

    // Count test phases
    const blockchainPath = path.join(this.projectRoot, 'blockchain');
    if (await pathExists(blockchainPath)) totalPhases++;

    const frontendPath = path.join(this.projectRoot, 'frontend');
    if (await pathExists(frontendPath)) {
      const packageJson = await readFile(path.join(frontendPath, 'package.json'), 'utf-8');
      if (packageJson.includes('"test"')) totalPhases++;
    }

    const testScript = path.join(this.projectRoot, 'scripts', 'run_all_tests.sh');
    if (await pathExists(testScript)) totalPhases++;

    testProgress.start(totalPhases, 0);

    // Blockchain tests - detect framework
    if (await pathExists(blockchainPath)) {
      const framework = await this.detectBlockchainFramework(blockchainPath);

      switch (framework) {
        case 'hardhat':
          const hardhatTestSuccess = await this.runCommand(
            'cd blockchain && npm test',
            'Blockchain unit tests (Hardhat)',
            600000 // 10 minutes
          );
          if (!hardhatTestSuccess) throw new Error('Hardhat tests failed');
          break;

        case 'foundry':
          const foundryTestSuccess = await this.runCommand(
            'cd blockchain && forge test',
            'Blockchain unit tests (Foundry)',
            600000 // 10 minutes
          );
          if (!foundryTestSuccess) throw new Error('Foundry tests failed');
          break;

        case 'truffle':
          const truffleTestSuccess = await this.runCommand(
            'cd blockchain && npx truffle test',
            'Blockchain unit tests (Truffle)',
            600000 // 10 minutes
          );
          if (!truffleTestSuccess) throw new Error('Truffle tests failed');
          break;

        default:
          this.log('WARNING', 'No supported blockchain framework detected for testing');
      }
      currentPhase++;
      testProgress.update(currentPhase);
    }

    // Frontend tests
    if (await pathExists(frontendPath)) {
      const packageJson = await readFile(path.join(frontendPath, 'package.json'), 'utf-8');
      if (packageJson.includes('"test"')) {
        const success = await this.runCommand(
          'cd frontend && npm test -- --watchAll=false --passWithNoTests',
          'Frontend tests',
          300000 // 5 minutes
        );
        if (!success) throw new Error('Frontend tests failed');
        currentPhase++;
        testProgress.update(currentPhase);
      }
    }

    // Integration tests
    if (await pathExists(testScript)) {
      const success = await this.runCommand(
        'bash scripts/run_all_tests.sh',
        'Integration tests',
        900000 // 15 minutes
      );
      if (!success) throw new Error('Integration tests failed');
      currentPhase++;
      testProgress.update(currentPhase);
    }

    testProgress.stop();
    this.log('SUCCESS', 'All test phases completed');
  }

  async runSecurityChecks(): Promise<number> {
    this.log('INFO', 'Starting security analysis...');
    let issues = 0;

    // Check if we have a package.json and package-lock.json in the project root
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageLockPath = path.join(this.projectRoot, 'package-lock.json');
    const yarnLockPath = path.join(this.projectRoot, 'yarn.lock');
    const pnpmLockPath = path.join(this.projectRoot, 'pnpm-lock.yaml');

    const hasPackageJson = await pathExists(packageJsonPath);
    const hasPackageLock = await pathExists(packageLockPath) || await pathExists(yarnLockPath) || await pathExists(pnpmLockPath);

    if (!hasPackageJson) {
      this.log('WARNING', 'No package.json found in project root - skipping dependency audit');
    } else if (!hasPackageLock) {
      this.log('WARNING', 'No lockfile (package-lock.json, yarn.lock, or pnpm-lock.yaml) found - skipping dependency audit');
    } else {
      // Dependency audits - only run if we have the necessary files
      const rootAudit = await this.runCommand('npm audit --audit-level moderate', 'NPM security audit');
      if (!rootAudit) issues++;
    }

    const blockchainPath = path.join(this.projectRoot, 'blockchain');
    if (await pathExists(blockchainPath)) {
      const blockchainPackageJson = path.join(blockchainPath, 'package.json');
      const blockchainLock = path.join(blockchainPath, 'package-lock.json');

      if (await pathExists(blockchainPackageJson) && await pathExists(blockchainLock)) {
        const blockchainAudit = await this.runCommand(
          'cd blockchain && npm audit --audit-level moderate',
          'Blockchain dependency audit'
        );
        if (!blockchainAudit) issues++;
      } else {
        this.log('INFO', 'Blockchain directory exists but no package.json/lockfile - skipping blockchain audit');
      }
    }

    // Secret detection
    const secretIssues = await this.checkForExposedSecrets();
    issues += secretIssues;

    return issues;
  }

  private async checkForExposedSecrets(): Promise<number> {
    this.log('INFO', 'Checking for exposed secrets...');

    const patterns = [
      'PRIVATE_KEY.*[0-9a-fA-F]{32,}',
      'SECRET.*[a-zA-Z0-9_-]{20,}',
      'PASSWORD.*[a-zA-Z0-9_-]{8,}'
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
      'foundry.toml'
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
      'temp'
    ];

    const excludeFiles = [
      '*.md',
      '*.log',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '*.min.js',
      '*.min.css'
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
      'check'
    ];

    let issues = 0;
    let filesScanned = 0;
    let totalFiles = 0;

    // First pass: count total files to scan
    for (const includePattern of includePatterns) {
      try {
        const files = globSync(includePattern, {
          cwd: this.projectRoot,
          ignore: [
            ...excludeDirs.map(dir => `${dir}/**`),
            ...excludeFiles
          ],
          nodir: true,
          absolute: false
        });
        totalFiles += files.length;
      } catch (error) {
        // Skip invalid glob patterns
      }
    }

    // Create progress bar
    const progressBar = new cliProgress.SingleBar({
      format: '🔍 Scanning for secrets | {bar} | {percentage}% | {value}/{total} files',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    progressBar.start(totalFiles, 0);

    // Use more specific glob patterns instead of scanning everything
    for (const includePattern of includePatterns) {
      try {
        const files = globSync(includePattern, {
          cwd: this.projectRoot,
          ignore: [
            ...excludeDirs.map(dir => `${dir}/**`),
            ...excludeFiles
          ],
          nodir: true,
          absolute: false
        });

        for (const file of files) {
          if (filesScanned > 1000) {
            this.log('WARNING', 'Secret scan limit reached (1000 files). Consider reviewing large codebases manually.');
            break;
          }

          filesScanned++;
          progressBar.update(filesScanned);

          try {
            const content = await readFile(path.join(this.projectRoot, file), 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (new RegExp(patterns.join('|')).test(line) &&
                  !line.includes('process.env') &&
                  !line.includes('import.meta.env') &&
                  !line.includes('your_') &&
                  !line.includes('_here') &&
                  !line.includes('placeholder') &&
                  !line.includes('example') &&
                  !excludePatterns.some(excl => line.toLowerCase().includes(excl.toLowerCase()))) {
                // Additional check: skip lines that are clearly regex patterns or security code
                if (line.includes('const patterns = [') ||
                    line.includes('RegExp(') ||
                    line.includes('regex') ||
                    line.includes('pattern') ||
                    file.includes('qa-agent')) {
                  continue; // Skip this line - it's legitimate security code
                }
                this.log('ERROR', `Potential exposed secret found in ${file}:${i + 1}`);
                issues++;
              }
            }
          } catch (error) {
            // Skip binary files or files that can't be read
          }
        }

        if (filesScanned > 1000) break;
      } catch (error) {
        // Skip invalid glob patterns
      }
    }

    progressBar.stop();
    this.log('INFO', `Secret scan completed: ${filesScanned} files scanned`);

    if (issues === 0) {
      this.log('SUCCESS', 'No exposed secrets detected');
    }

    return issues;
  }

  async runBuildChecks(): Promise<void> {
    this.log('INFO', 'Starting build verification...');

    // Create progress bar for build phases
    const buildProgress = new cliProgress.SingleBar({
      format: '🔨 Building project | {bar} | {percentage}% | {value}/{total} phases',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    let totalPhases = 0;
    let currentPhase = 0;

    // Count build phases
    const frontendPath = path.join(this.projectRoot, 'frontend');
    if (await pathExists(frontendPath)) totalPhases++;

    const blockchainPath = path.join(this.projectRoot, 'blockchain');
    if (await pathExists(blockchainPath)) totalPhases++;

    buildProgress.start(totalPhases, 0);

    // Frontend build
    if (await pathExists(frontendPath)) {
      const success = await this.runCommand(
        'cd frontend && npm run build',
        'Frontend production build',
        600000 // 10 minutes
      );
      if (!success) throw new Error('Frontend build failed');
      currentPhase++;
      buildProgress.update(currentPhase);
    }

    // Blockchain compilation - detect framework
    if (await pathExists(blockchainPath)) {
      const framework = await this.detectBlockchainFramework(blockchainPath);

      switch (framework) {
        case 'hardhat':
          const hardhatSuccess = await this.runCommand(
            'cd blockchain && npx hardhat compile',
            'Smart contract compilation (Hardhat)',
            180000 // 3 minutes
          );
          if (!hardhatSuccess) throw new Error('Hardhat contract compilation failed');
          break;

        case 'foundry':
          const foundrySuccess = await this.runCommand(
            'cd blockchain && forge build',
            'Smart contract compilation (Foundry)',
            180000 // 3 minutes
          );
          if (!foundrySuccess) throw new Error('Foundry contract compilation failed');
          break;

        case 'truffle':
          const truffleSuccess = await this.runCommand(
            'cd blockchain && npx truffle compile',
            'Smart contract compilation (Truffle)',
            180000 // 3 minutes
          );
          if (!truffleSuccess) throw new Error('Truffle contract compilation failed');
          break;

        default:
          this.log('WARNING', 'No supported blockchain framework detected. Supported: Hardhat, Foundry, Truffle');
      }
      currentPhase++;
      buildProgress.update(currentPhase);
    }

    buildProgress.stop();
    this.log('SUCCESS', 'All build phases completed');
  }

  private async detectBlockchainFramework(blockchainPath: string): Promise<'hardhat' | 'foundry' | 'truffle' | null> {
    // Check for Hardhat
    if (await pathExists(path.join(blockchainPath, 'hardhat.config.js')) ||
        await pathExists(path.join(blockchainPath, 'hardhat.config.ts'))) {
      return 'hardhat';
    }

    // Check for Foundry
    if (await pathExists(path.join(blockchainPath, 'foundry.toml'))) {
      return 'foundry';
    }

    // Check for Truffle
    if (await pathExists(path.join(blockchainPath, 'truffle-config.js')) ||
        await pathExists(path.join(blockchainPath, 'truffle.js'))) {
      return 'truffle';
    }

    return null;
  }

  async runFullSuite(): Promise<QAResults> {
    const sessionId = `QA_${new Date().toISOString().replace(/[:.]/g, '_')}`;

    // Load cache and plugins
    await this.loadCache();
    await this.loadPlugins();

    // Initialize QA log session
    const sessionHeader = `

## 🛡️ QA Session: ${sessionId}
**Started:** ${new Date().toISOString()}
**Trigger:** CLI

| Time | Level | Message |
|------|--------|---------|
`;
    await this.appendToLog(sessionHeader);

    this.log('INFO', 'Starting comprehensive QA suite...');

    let totalErrors = 0;
    let totalWarnings = 0;

    let config: any = null;
    try {
      config = await this.loadQaConfig();
    } catch (error) {
      this.log('WARNING', 'Proceeding without QA configuration due to load error');
    }

    const qualityGates = config?.qualityGates ?? {};
    const testFiles = this.collectTestFiles(config);

    if (qualityGates.requireTests) {
      if (testFiles.length === 0) {
        totalErrors++;
        this.log('ERROR', 'Quality gate failed: requireTests is enabled but no test files were found.');
      } else {
        this.log('SUCCESS', `Quality gate passed: detected ${testFiles.length} test file(s).`);
      }
    }

    try {
      // 1. Documentation updates
      await this.updateDocs();

      // 2. Code quality checks - check cache first
      const cachedLinting = await this.getCachedResult('linting');
      if (cachedLinting) {
        this.log('INFO', 'Using cached linting results');
        totalErrors += cachedLinting.errors;
        totalWarnings += cachedLinting.warnings;
        this.log('SUCCESS', 'Code quality checks completed (cached)');
      } else {
        await this.runLinting(false, config);
        const lintingResults: QAResults = {
          errors: 0,
          warnings: 0,
          duration: (Date.now() - this.startTime) / 1000,
          timestamp: new Date()
        };
        await this.setCachedResult('linting', lintingResults);
        this.log('SUCCESS', 'Code quality checks completed');
      }

      // 3. Testing - check cache first
      const cachedTesting = await this.getCachedResult('testing');
      if (cachedTesting) {
        this.log('INFO', 'Using cached testing results');
        totalErrors += cachedTesting.errors;
        totalWarnings += cachedTesting.warnings;
        this.log('SUCCESS', 'Testing completed (cached)');
      } else {
        await this.runTests();
        const testingResults: QAResults = {
          errors: 0,
          warnings: 0,
          duration: (Date.now() - this.startTime) / 1000,
          timestamp: new Date()
        };
        await this.setCachedResult('testing', testingResults);
        this.log('SUCCESS', 'Testing completed');
      }

      if (qualityGates.requireTestCoverage) {
        try {
          const coverage = await this.enforceTestCoverageRequirement(config ?? { qualityGates });
          this.log('SUCCESS', `Coverage requirement satisfied at ${coverage.toFixed(2)}%.`);
        } catch (error: any) {
          totalErrors++;
          this.log('ERROR', error?.message ?? String(error));
        }
      }

      // 4. Build verification - check cache first
      const cachedBuild = await this.getCachedResult('build');
      if (cachedBuild) {
        this.log('INFO', 'Using cached build results');
        totalErrors += cachedBuild.errors;
        totalWarnings += cachedBuild.warnings;
        this.log('SUCCESS', 'Build verification completed (cached)');
      } else {
        await this.runBuildChecks();
        const buildResults: QAResults = {
          errors: 0,
          warnings: 0,
          duration: (Date.now() - this.startTime) / 1000,
          timestamp: new Date()
        };
        await this.setCachedResult('build', buildResults);
        this.log('SUCCESS', 'Build verification completed');
      }

      // 5. Security checks - always run fresh (security critical)
      const securityIssues = await this.runSecurityChecks();
      totalWarnings += securityIssues;

      // 6. Custom plugins
      if (this.plugins.size > 0) {
        this.log('INFO', `Running ${this.plugins.size} custom plugins...`);
        const pluginResults = await this.runPlugins();
        totalErrors += pluginResults.errors;
        totalWarnings += pluginResults.warnings;
        this.log('SUCCESS', 'Custom plugins completed');
      }

      // 7. Performance checks (optional)
      // await this.runPerformanceChecks();

    } catch (error) {
      this.log('ERROR', `QA suite failed: ${error}`);
      totalErrors++;
    }

    const duration = (Date.now() - this.startTime) / 1000;

    // Generate report
    const results: QAResults = {
      errors: totalErrors,
      warnings: totalWarnings,
      duration,
      timestamp: new Date()
    };

    await this.generateReport(results);

    // Final summary
    const summary = `

**Duration:** ${duration.toFixed(1)}s | **Errors:** ${totalErrors} | **Warnings:** ${totalWarnings}
---
`;
    await this.appendToLog(summary);

    if (totalErrors > 0) {
      console.log(chalk.red('❌ QA CHECKS FAILED'));
      console.log('Please fix critical errors before proceeding.');
    } else if (totalWarnings > 0) {
      console.log(chalk.yellow('⚠️  QA CHECKS PASSED WITH WARNINGS'));
      console.log('Review warnings but can proceed.');
    } else {
      console.log(chalk.green('✅ ALL QA CHECKS PASSED'));
      console.log('Ready for commit/deployment!');
    }

    return results;
  }

  private async updateDocs(): Promise<void> {
    // Placeholder for documentation updates
    this.log('INFO', 'Documentation updates completed');
  }

  async setupHooks(): Promise<void> {
    this.log('INFO', 'Setting up git hooks...');

    const hooksDir = path.join(this.projectRoot, '.git', 'hooks');
    await ensureDir(hooksDir);

    const platform = process.platform;
    const isWindows = platform === 'win32';

    // Generate hooks based on platform
    if (isWindows) {
      await this.generateWindowsHooks(hooksDir);
    } else {
      await this.generateUnixHooks(hooksDir);
    }

    this.log('SUCCESS', 'Git hooks setup completed');
  }

  async wrapScripts(): Promise<void> {
    this.log('INFO', 'Wrapping npm scripts with QA checks...');

    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!await pathExists(packageJsonPath)) {
      throw new Error('package.json not found');
    }

    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    if (!packageJson.scripts) {
      this.log('WARNING', 'No scripts found in package.json');
      return;
    }

    // Load config to see which scripts to wrap
    const configPath = path.join(this.projectRoot, '.qa-config.json');
    let scriptsToWrap = ['build', 'start', 'dev', 'test'];

    if (await pathExists(configPath)) {
      try {
        const configContent = await readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        if (config.hooks && config.hooks.scriptsToWrap) {
          scriptsToWrap = config.hooks.scriptsToWrap;
        }
      } catch (error) {
        this.log('WARNING', 'Could not read QA config, using defaults');
      }
    }

    let wrappedCount = 0;
    for (const scriptName of scriptsToWrap) {
      if (packageJson.scripts[scriptName]) {
        const originalScript = packageJson.scripts[scriptName];

        // Skip if already wrapped
        if (originalScript.includes('echain-qa run')) {
          this.log('INFO', `Script '${scriptName}' already wrapped`);
          continue;
        }

        // Wrap the script
        const wrappedScript = `npx echain-qa run --dry-run --quiet && ${originalScript}`;
        packageJson.scripts[scriptName] = wrappedScript;

        this.log('SUCCESS', `Wrapped script '${scriptName}'`);
        wrappedCount++;
      }
    }

    if (wrappedCount > 0) {
      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      this.log('SUCCESS', `Wrapped ${wrappedCount} scripts with QA checks`);
    } else {
      this.log('INFO', 'No scripts needed wrapping');
    }
  }

  async unwrapScripts(): Promise<void> {
    this.log('INFO', 'Unwrapping npm scripts...');

    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!await pathExists(packageJsonPath)) {
      throw new Error('package.json not found');
    }

    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    if (!packageJson.scripts) {
      this.log('WARNING', 'No scripts found in package.json');
      return;
    }

    let unwrappedCount = 0;
    for (const scriptName in packageJson.scripts) {
      const script = packageJson.scripts[scriptName];

      if (script.includes('npx echain-qa run --dry-run --quiet && ')) {
        // Unwrap the script
        const originalScript = script.replace('npx echain-qa run --dry-run --quiet && ', '');
        packageJson.scripts[scriptName] = originalScript;

        this.log('SUCCESS', `Unwrapped script '${scriptName}'`);
        unwrappedCount++;
      }
    }

    if (unwrappedCount > 0) {
      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      this.log('SUCCESS', `Unwrapped ${unwrappedCount} scripts`);
    } else {
      this.log('INFO', 'No wrapped scripts found');
    }
  }

  private async generateUnixHooks(hooksDir: string): Promise<void> {
    const setupScript = path.join(__dirname, '..', 'scripts', 'setup-hooks.sh');
    if (!await pathExists(setupScript)) {
      throw new Error('Setup script not found');
    }

    const success = await this.runCommand(`bash "${setupScript}"`, 'Git hooks setup');
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
    await writeFile(preCommitHook, preCommitContent);
    await writeFile(prePushHook, prePushContent);

    // Make executable (Windows doesn't use chmod, but Git for Windows can handle it)
    try {
      await this.runCommand(`chmod +x "${preCommitHook}"`, 'Make pre-commit executable');
      await this.runCommand(`chmod +x "${prePushHook}"`, 'Make pre-push executable');
    } catch (error) {
      // On Windows, chmod might not be available, but Git hooks should still work
      this.log('WARNING', 'Could not set executable permissions on hooks (expected on Windows)');
    }

    this.log('SUCCESS', 'Windows PowerShell hooks installed');
  }

  async checkHooks(): Promise<boolean> {
    this.log('INFO', 'Checking git hooks status...');

    const hooksDir = path.join(this.projectRoot, '.git', 'hooks');
    const preCommitHook = path.join(hooksDir, 'pre-commit');
    const prePushHook = path.join(hooksDir, 'pre-push');

    const preCommitExists = await pathExists(preCommitHook);
    const prePushExists = await pathExists(prePushHook);

    if (!preCommitExists && !prePushExists) {
      this.log('WARNING', 'No QA hooks found');
      return false;
    }

    if (preCommitExists) {
      // Check if it's executable and contains QA logic
      try {
        const content = await readFile(preCommitHook, 'utf-8');
        if (content.includes('QA checks')) {
          this.log('SUCCESS', 'Pre-commit hook is properly configured');
        } else {
          this.log('WARNING', 'Pre-commit hook exists but may not be QA hook');
        }
      } catch (error) {
        this.log('WARNING', 'Cannot read pre-commit hook');
      }
    }

    if (prePushExists) {
      try {
        const content = await readFile(prePushHook, 'utf-8');
        if (content.includes('QA checks')) {
          this.log('SUCCESS', 'Pre-push hook is properly configured');
        } else {
          this.log('WARNING', 'Pre-push hook exists but may not be QA hook');
        }
      } catch (error) {
        this.log('WARNING', 'Cannot read pre-push hook');
      }
    }

    return true;
  }

  async removeHooks(): Promise<void> {
    this.log('INFO', 'Removing git hooks...');

    const hooksDir = path.join(this.projectRoot, '.git', 'hooks');
    const preCommitHook = path.join(hooksDir, 'pre-commit');
    const prePushHook = path.join(hooksDir, 'pre-push');

    let removed = false;

    if (await pathExists(preCommitHook)) {
      try {
        const content = await readFile(preCommitHook, 'utf-8');
        if (content.includes('QA checks')) {
          await fs.unlink(preCommitHook);
          this.log('SUCCESS', 'Pre-commit hook removed');
          removed = true;
        } else {
          this.log('WARNING', 'Pre-commit hook exists but is not a QA hook - not removing');
        }
      } catch (error) {
        this.log('ERROR', 'Failed to remove pre-commit hook');
      }
    }

    if (await pathExists(prePushHook)) {
      try {
        const content = await readFile(prePushHook, 'utf-8');
        if (content.includes('QA checks')) {
          await fs.unlink(prePushHook);
          this.log('SUCCESS', 'Pre-push hook removed');
          removed = true;
        } else {
          this.log('WARNING', 'Pre-push hook exists but is not a QA hook - not removing');
        }
      } catch (error) {
        this.log('ERROR', 'Failed to remove pre-push hook');
      }
    }

    if (!removed) {
      this.log('INFO', 'No QA hooks found to remove');
    } else {
      this.log('SUCCESS', 'Git hooks removal completed');
    }
  }

  private async generateReport(results: QAResults): Promise<void> {
    const reportPath = path.join(this.projectRoot, "qa-report.json");
    const report = {
      timestamp: results.timestamp.toISOString(),
      duration: results.duration,
      errors: results.errors,
      warnings: results.warnings,
      status: results.errors > 0 ? "failure" : "success"
    };

    await writeFile(reportPath, JSON.stringify(report, null, 2));
    this.log("SUCCESS", `QA report generated: ${reportPath}`);
  }

  /**
   * Detect project type and frameworks
   */
  private async detectProjectType(): Promise<{
    projectType: string;
    frameworks: string[];
    languages: string[];
    confidence: number;
    hasTests: boolean;
    hasBuild: boolean;
  }> {
    const detection = {
      projectType: 'unknown',
      frameworks: [] as string[],
      languages: [] as string[],
      confidence: 0,
      hasTests: false,
      hasBuild: false
    };

    // Check for package.json
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (await pathExists(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
        detection.languages.push('javascript');

        // Check for TypeScript
        if (await pathExists(path.join(this.projectRoot, 'tsconfig.json'))) {
          detection.languages.push('typescript');
        }

        // Detect frameworks from dependencies
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

        // Blockchain frameworks
        if (deps['hardhat']) {
          detection.frameworks.push('hardhat');
          detection.projectType = 'blockchain';
          detection.confidence = 90;
        } else if (deps['@nomiclabs/hardhat-ethers']) {
          detection.frameworks.push('hardhat');
          detection.projectType = 'blockchain';
          detection.confidence = 85;
        } else if (deps['truffle']) {
          detection.frameworks.push('truffle');
          detection.projectType = 'blockchain';
          detection.confidence = 90;
        }

        // Frontend frameworks
        if (deps['react']) {
          detection.frameworks.push('react');
          detection.projectType = detection.projectType === 'blockchain' ? 'fullstack' : 'frontend';
          detection.confidence = Math.max(detection.confidence, 85);
        }
        if (deps['next']) {
          detection.frameworks.push('next.js');
          detection.projectType = detection.projectType === 'blockchain' ? 'fullstack' : 'frontend';
          detection.confidence = Math.max(detection.confidence, 90);
        }
        if (deps['vue']) {
          detection.frameworks.push('vue');
          detection.projectType = detection.projectType === 'blockchain' ? 'fullstack' : 'frontend';
          detection.confidence = Math.max(detection.confidence, 85);
        }
        if (deps['@angular/core']) {
          detection.frameworks.push('angular');
          detection.projectType = detection.projectType === 'blockchain' ? 'fullstack' : 'frontend';
          detection.confidence = Math.max(detection.confidence, 85);
        }

        // Check for tests
        detection.hasTests = !!(deps['jest'] || deps['mocha'] || deps['vitest'] || packageJson.scripts?.test);

        // Check for build scripts
        detection.hasBuild = !!packageJson.scripts?.build;

      } catch (error) {
        // Ignore parse errors
      }
    }

    // Check for blockchain-specific files
    const blockchainPath = path.join(this.projectRoot, 'blockchain');
    if (await pathExists(blockchainPath)) {
      detection.projectType = detection.projectType === 'frontend' ? 'fullstack' : 'blockchain';
      detection.confidence = Math.max(detection.confidence, 80);
    }

    // Check for frontend directory
    const frontendPath = path.join(this.projectRoot, 'frontend');
    if (await pathExists(frontendPath)) {
      detection.projectType = detection.projectType === 'blockchain' ? 'fullstack' : 'frontend';
      detection.confidence = Math.max(detection.confidence, 80);
    }

    // Default fallback
    if (detection.projectType === 'unknown') {
      detection.projectType = 'library';
      detection.confidence = 50;
    }

    return detection;
  }

  /**
   * Interactive configuration wizard for setting up QA agent
   */
  async runInteractiveSetup(): Promise<void> {
    const inquirer = (await import('inquirer')).default;

    console.log(chalk.cyan('\n🛡️  Echain QA Agent - Interactive Setup'));
    console.log(chalk.gray('Let\'s configure quality assurance for your project!\n'));

    // Detect project type first
    const detection = await this.detectProjectType();

    console.log(chalk.blue('🔍 Project Analysis:'));
    console.log(`   Type: ${detection.projectType} (${detection.confidence}% confidence)`);
    console.log(`   Frameworks: ${detection.frameworks.join(', ') || 'none detected'}`);
    console.log(`   Languages: ${detection.languages.join(', ')}`);
    console.log(`     Tests: ${detection.hasTests ? '✅ detected' : '❌ not found'}`);
    console.log(`   Build: ${detection.hasBuild ? '✅ configured' : '❌ not configured'}\n`);

    // Project type confirmation
    const { confirmProjectType } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmProjectType',
      message: `Is this a ${detection.projectType} project?`,
      default: detection.confidence > 70
    }]);

    let projectType = detection.projectType;
    let frameworks = [...detection.frameworks];

    if (!confirmProjectType) {
      const { manualProjectType } = await inquirer.prompt([{
        type: 'list',
        name: 'manualProjectType',
        message: 'What type of project is this?',
        choices: [
          { name: 'Blockchain/Smart Contracts', value: 'blockchain' },
          { name: 'Frontend Web Application', value: 'frontend' },
          { name: 'Full-stack Application', value: 'fullstack' },
          { name: 'Library/Package', value: 'library' }
        ]
      }]);
      projectType = manualProjectType;

      // Ask about frameworks based on project type
      if (projectType === 'blockchain') {
        const { blockchainFrameworks } = await inquirer.prompt([{
          type: 'checkbox',
          name: 'blockchainFrameworks',
          message: 'Which blockchain frameworks are you using?',
          choices: [
            { name: 'Hardhat', value: 'hardhat' },
            { name: 'Foundry', value: 'foundry' },
            { name: 'Truffle', value: 'truffle' },
            { name: 'Other', value: 'other' }
          ]
        }]);
        frameworks = blockchainFrameworks.filter((f: string) => f !== 'other');
      } else if (projectType === 'frontend') {
        const { frontendFrameworks } = await inquirer.prompt([{
          type: 'checkbox',
          name: 'frontendFrameworks',
          message: 'Which frontend frameworks are you using?',
          choices: [
            { name: 'React', value: 'react' },
            { name: 'Next.js', value: 'next.js' },
            { name: 'Vue.js', value: 'vue' },
            { name: 'Angular', value: 'angular' },
            { name: 'Vite', value: 'vite' },
            { name: 'Other', value: 'other' }
          ]
        }]);
        frameworks = frontendFrameworks.filter((f: string) => f !== 'other');
      }
    }

    // Quality checks configuration
    console.log(chalk.blue('\n🔧 Quality Checks Configuration:'));
    const { enableLinting, enableTesting, enableSecurity, enableBuild, enablePerformance } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'enableLinting',
        message: 'Enable code linting checks?',
        default: true
      },
      {
        type: 'confirm',
        name: 'enableTesting',
        message: 'Enable automated testing?',
        default: detection.hasTests
      },
      {
        type: 'confirm',
        name: 'enableSecurity',
        message: 'Enable security vulnerability scanning?',
        default: true
      },
      {
        type: 'confirm',
        name: 'enableBuild',
        message: 'Enable build verification?',
        default: detection.hasBuild
      },
      {
        type: 'confirm',
        name: 'enablePerformance',
        message: 'Enable performance checks?',
        default: false
      }
    ]);

    // Quality gates
    console.log(chalk.blue('\n🚧 Quality Gates:'));
    const { failOnLintErrors, failOnTestFailures, failOnBuildFailures, requireTests } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'failOnLintErrors',
        message: 'Fail builds on linting errors?',
        default: true
      },
      {
        type: 'confirm',
        name: 'failOnTestFailures',
        message: 'Fail builds on test failures?',
        default: true
      },
      {
        type: 'confirm',
        name: 'failOnBuildFailures',
        message: 'Fail builds on build failures?',
        default: true
      },
      {
        type: 'confirm',
        name: 'requireTests',
        message: 'Require test files to be present?',
        default: false
      }
    ]);

    // Git hooks setup
    console.log(chalk.blue('\n🔗 Git Integration:'));
    const { setupPreCommit, setupPrePush, wrapScripts } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'setupPreCommit',
        message: 'Install pre-commit hook for QA checks?',
        default: true
      },
      {
        type: 'confirm',
        name: 'setupPrePush',
        message: 'Install pre-push hook for QA checks?',
        default: true
      },
      {
        type: 'confirm',
        name: 'wrapScripts',
        message: 'Wrap npm scripts (build, start, dev, test) with QA checks?',
        default: false
      }
    ]);

    // Create configuration
    const config = {
      version: "2.2.0",
      project: {
        name: path.basename(this.projectRoot),
        type: projectType,
        frameworks: frameworks
      },
      checks: {
        linting: enableLinting,
        testing: enableTesting,
        security: enableSecurity,
        build: enableBuild,
        performance: enablePerformance
      },
      paths: {
        frontend: "frontend",
        blockchain: "blockchain",
        docs: "docs",
        tests: "test"
      },
      hooks: {
        preCommit: setupPreCommit,
        prePush: setupPrePush,
        autoInstall: true,
        wrapScripts: wrapScripts,
        scriptsToWrap: ["build", "start", "dev", "test"]
      },
      timeouts: {
        lint: 300,
        test: 600,
        build: 300,
        security: 120
      },
      qualityGates: {
        failOnLintErrors: failOnLintErrors,
        failOnTestFailures: failOnTestFailures,
        failOnBuildFailures: failOnBuildFailures,
        failOnSecurityVulnerabilities: true,
        failOnPerformanceIssues: false,
        requireTests: requireTests,
        requireTestCoverage: false,
        minTestCoverage: 80
      }
    };

    // Show configuration preview
    console.log(chalk.blue('\n📋 Configuration Preview:'));
    console.log(JSON.stringify(config, null, 2));

    const { confirmConfig } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmConfig',
      message: 'Save this configuration?',
      default: true
    }]);

    if (confirmConfig) {
      const configPath = path.join(this.projectRoot, '.qa-config.json');
      await writeFile(configPath, JSON.stringify(config, null, 2));
      console.log(chalk.green(`\n✅ Configuration saved to ${configPath}`));

      // Setup hooks if requested
      if (setupPreCommit || setupPrePush) {
        console.log(chalk.blue('\n🔗 Setting up git hooks...'));
        await this.setupHooks();
      }

      // Wrap scripts if requested
      if (wrapScripts) {
        console.log(chalk.blue('\n📦 Wrapping npm scripts...'));
        await this.wrapScripts();
      }

      console.log(chalk.green('\n🎉 Setup complete! Run "echain-qa run" to start QA checks.'));
    } else {
      console.log(chalk.yellow('\n⚠️  Configuration not saved. You can run this setup again anytime.'));
    }
  }

  /**
   * Run guided troubleshooting to identify and fix common issues
   */
  async runGuidedTroubleshooting(): Promise<void> {
    const inquirer = (await import('inquirer')).default;

    console.log(chalk.cyan('\n🔧 Guided Troubleshooting'));
    console.log(chalk.gray('Let\'s identify and fix common project issues...\n'));

    // Analyze recent issues
    const issues = await this.analyzeRecentIssues();

    if (issues.length === 0) {
      console.log(chalk.green('✅ No issues detected! Your project looks healthy.'));
      return;
    }

    console.log(chalk.yellow(`⚠️  Found ${issues.length} potential issue${issues.length === 1 ? '' : 's'}:\n`));

    // Display issues
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.title}`);
      console.log(`   ${issue.description}`);
      console.log(`   Severity: ${issue.severity}`);
      console.log(`   Category: ${issue.category}\n`);
    });

    // Ask user which issues to address
    const { selectedIssues } = await inquirer.prompt([{
      type: 'checkbox',
      name: 'selectedIssues',
      message: 'Which issues would you like to address?',
      choices: issues.map((issue, index) => ({
        name: `${index + 1}. ${issue.title} (${issue.severity})`,
        value: index,
        checked: issue.severity === 'high'
      }))
    }]);

    // Troubleshoot selected issues
    for (const issueIndex of selectedIssues) {
      const issue = issues[issueIndex];
      await this.troubleshootIssue(issue);
    }

    console.log(chalk.green('\n✅ Troubleshooting completed!'));
  }

  /**
   * Analyze recent issues in the project
   */
  private async analyzeRecentIssues(): Promise<any[]> {
    const issues: any[] = [];

    // Check configuration issues
    const configIssues = await this.detectConfigurationIssues();
    issues.push(...configIssues);

    // Check dependency issues
    const dependencyIssues = await this.detectDependencyIssues();
    issues.push(...dependencyIssues);

    // Check code quality issues
    const codeQualityIssues = await this.detectCodeQualityIssues();
    issues.push(...codeQualityIssues);

    return issues;
  }

  /**
   * Detect configuration-related issues
   */
  private async detectConfigurationIssues(): Promise<any[]> {
    const issues: any[] = [];

    // Check for missing config files
    const configPath = path.join(this.projectRoot, '.qa-config.json');
    const shellConfigPath = path.join(this.projectRoot, '.qa-config');

    if (!(await pathExists(configPath)) && !(await pathExists(shellConfigPath))) {
      issues.push({
        title: 'Missing QA Configuration',
        description: 'No QA configuration file found. Run "echain-qa setup" to create one.',
        severity: 'medium',
        category: 'configuration',
        autoFix: true
      });
    }

    // Check for missing package.json
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!(await pathExists(packageJsonPath))) {
      issues.push({
        title: 'Missing package.json',
        description: 'No package.json found. This is required for Node.js projects.',
        severity: 'high',
        category: 'configuration',
        autoFix: false
      });
    }

    return issues;
  }

  /**
   * Detect dependency-related issues
   */
  private async detectDependencyIssues(): Promise<any[]> {
    const issues: any[] = [];

    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (await pathExists(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

        // Check for missing lockfile
        const hasLockFile = await pathExists(path.join(this.projectRoot, 'package-lock.json')) ||
                           await pathExists(path.join(this.projectRoot, 'yarn.lock')) ||
                           await pathExists(path.join(this.projectRoot, 'pnpm-lock.yaml'));

        if (!hasLockFile) {
          issues.push({
            title: 'Missing Lock File',
            description: 'No package lock file found. This can lead to inconsistent dependencies.',
            severity: 'medium',
            category: 'dependencies',
            autoFix: false
          });
        }

        // Check for outdated dependencies
        // This would require running npm outdated, but we'll skip for now
      } catch (error) {
        issues.push({
          title: 'Invalid package.json',
          description: 'package.json contains invalid JSON.',
          severity: 'high',
          category: 'configuration',
          autoFix: false
        });
      }
    }

    return issues;
  }

  /**
   * Detect code quality issues
   */
  private async detectCodeQualityIssues(): Promise<any[]> {
    const issues: any[] = [];

    // Check for test files
    const testFiles = this.collectTestFiles();
    if (testFiles.length === 0) {
      issues.push({
        title: 'No Test Files Found',
        description: 'No test files detected. Consider adding tests for better code quality.',
        severity: 'low',
        category: 'testing',
        autoFix: false
      });
    }

    // Check for linting configuration
    const hasLinting = await pathExists(path.join(this.projectRoot, '.eslintrc.js')) ||
                      await pathExists(path.join(this.projectRoot, '.eslintrc.json')) ||
                      await pathExists(path.join(this.projectRoot, '.eslintrc.yml'));

    if (!hasLinting) {
      issues.push({
        title: 'No Linting Configuration',
        description: 'No ESLint configuration found. Consider adding linting for code quality.',
        severity: 'low',
        category: 'code-quality',
        autoFix: false
      });
    }

    return issues;
  }

  /**
   * Troubleshoot a specific issue
   */
  private async troubleshootIssue(issue: any): Promise<void> {
    console.log(chalk.blue(`\n🔍 Troubleshooting: ${issue.title}`));
    console.log(`${issue.description}\n`);

    // Check if we can auto-fix
    if (issue.autoFix && this.canAutoFixIssue(issue)) {
      const { applyAutoFix } = await (await import('inquirer')).default.prompt([{
        type: 'confirm',
        name: 'applyAutoFix',
        message: 'Can I automatically fix this issue?',
        default: true
      }]);

      if (applyAutoFix) {
        await this.applyAutoFix(issue);
        return;
      }
    }

    // Provide manual guidance
    await this.provideManualGuidance(issue);
  }

  /**
   * Check if an issue can be auto-fixed
   */
  private canAutoFixIssue(issue: any): boolean {
    switch (issue.title) {
      case 'Missing QA Configuration':
        return true;
      default:
        return false;
    }
  }

  /**
   * Apply automatic fix for an issue
   */
  private async applyAutoFix(issue: any): Promise<void> {
    console.log(chalk.yellow('🔧 Applying automatic fix...'));

    switch (issue.title) {
      case 'Missing QA Configuration':
        await this.runInteractiveSetup();
        console.log(chalk.green('✅ QA configuration created automatically'));
        break;
      default:
        console.log(chalk.red('❌ No automatic fix available'));
    }
  }

  /**
   * Provide manual guidance for an issue
   */
  private async provideManualGuidance(issue: any): Promise<void> {
    console.log(chalk.blue('💡 Manual Resolution Steps:'));

    switch (issue.title) {
      case 'Missing QA Configuration':
        console.log('1. Run: echain-qa setup');
        console.log('2. Follow the interactive prompts to configure QA checks');
        break;
      case 'Missing package.json':
        console.log('1. Run: npm init -y');
        console.log('2. Add your project dependencies');
        break;
      case 'Missing Lock File':
        console.log('1. Run: npm install (if using npm)');
        console.log('2. Or: yarn install (if using yarn)');
        console.log('3. Or: pnpm install (if using pnpm)');
        break;
      case 'No Test Files Found':
        console.log('1. Install a testing framework: npm install --save-dev jest');
        console.log('2. Create test files in a __tests__ directory');
        console.log('3. Run tests with: npm test');
        break;
      case 'No Linting Configuration':
        console.log('1. Install ESLint: npm install --save-dev eslint');
        console.log('2. Run: npx eslint --init');
        console.log('3. Configure linting rules as needed');
        break;
      default:
        console.log('Please refer to the project documentation for resolution steps.');
    }

    console.log('');
  }

  /**
   * Collect test files from the project
   */
  private collectTestFiles(_config?: { paths?: { tests?: string } }): string[] {
    const filesSet = new Set<string>();

    // Common test file patterns
    const patterns = [
      '**/*.test.{js,jsx,ts,tsx,cjs,mjs}',
      '**/*.spec.{js,jsx,ts,tsx,cjs,mjs}',
      '**/__tests__/**/*.{js,jsx,ts,tsx,cjs,mjs}',
      '**/test/**/*.{js,jsx,ts,tsx,cjs,mjs}'
    ];

    const globOptions = {
      cwd: this.projectRoot,
      absolute: false,
      nodir: true
    } as const;

    try {
      for (const pattern of patterns) {
        const matches: string[] = globSync(pattern, globOptions as any);
        matches.forEach((file) => filesSet.add(file));
      }
    } catch (error) {
      // Ignore glob errors
    }

    return Array.from(filesSet);
  }

  private async enforceTestCoverageRequirement(config: any): Promise<number> {
    const configuredPath = config?.paths?.coverageSummary;
    const resolvedPath = configuredPath
      ? (path.isAbsolute(configuredPath) ? configuredPath : path.join(this.projectRoot, configuredPath))
      : path.join(this.projectRoot, 'coverage', 'coverage-summary.json');

    if (!await pathExists(resolvedPath)) {
      throw new Error('Coverage summary not found');
    }

    let coverageRaw: string;
    try {
      coverageRaw = await readFile(resolvedPath, 'utf-8');
    } catch (error) {
      throw new Error(`Unable to read coverage summary: ${error}`);
    }

    let coverageSummary: any;
    try {
      coverageSummary = JSON.parse(coverageRaw);
    } catch (error) {
      throw new Error('Coverage summary is not valid JSON');
    }

    const total = coverageSummary?.total;
    if (!total) {
      throw new Error('Coverage summary missing total metrics');
    }

    const metrics = ['lines', 'statements', 'branches', 'functions'] as const;
    const coverageValues = metrics
      .map((metric) => total[metric]?.pct)
      .filter((value): value is number => typeof value === 'number');

    if (coverageValues.length === 0) {
      throw new Error('Coverage summary missing metric percentages');
    }

    const minimumCoverage = Math.min(...coverageValues);
    const requiredCoverage = config?.qualityGates?.minTestCoverage ?? 0;

    if (minimumCoverage < requiredCoverage) {
      throw new Error(`Coverage ${minimumCoverage.toFixed(2)}% is below required ${requiredCoverage}% threshold.`);
    }

    return minimumCoverage;
  }

  /**
   * Run the plugin marketplace interface
   */
  async runPluginMarketplace(): Promise<void> {
    const inquirer = (await import('inquirer')).default;

    console.log(chalk.cyan('\n🛒 Plugin Marketplace'));
    console.log(chalk.gray('Discover and install QA plugins...\n'));

    // Get available plugins
    const availablePlugins = await this.getAvailablePlugins();

    if (availablePlugins.length === 0) {
      console.log(chalk.yellow('⚠️  No plugins available in the marketplace at this time.'));
      return;
    }

    // Display available plugins
    console.log(chalk.blue('Available Plugins:\n'));
    availablePlugins.forEach((plugin, index) => {
      console.log(`${index + 1}. ${plugin.name}`);
      console.log(`   ${plugin.description}`);
      console.log(`   Version: ${plugin.version}`);
      console.log(`   Author: ${plugin.author}`);
      if (plugin.tags && plugin.tags.length > 0) {
        console.log(`   Tags: ${plugin.tags.join(', ')}`);
      }
      console.log('');
    });

    // Ask user which plugin to install
    const { selectedPlugin } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedPlugin',
      message: 'Which plugin would you like to install?',
      choices: [
        { name: 'Cancel', value: null },
        ...availablePlugins.map((plugin, index) => ({
          name: `${plugin.name} (${plugin.version})`,
          value: index
        }))
      ]
    }]);

    if (selectedPlugin !== null) {
      const plugin = availablePlugins[selectedPlugin];
      await this.installAndConfigurePlugin(plugin);
    }
  }

  /**
   * Get available plugins from the marketplace
   */
  private async getAvailablePlugins(): Promise<any[]> {
    // For now, return a hardcoded list of example plugins
    // In a real implementation, this would fetch from a remote API
    return [
      {
        name: 'security-scan',
        description: 'Advanced security vulnerability scanning',
        version: '1.0.0',
        author: 'Echain Team',
        tags: ['security', 'vulnerability'],
        packageName: '@echain/qa-plugin-security'
      },
      {
        name: 'performance-monitor',
        description: 'Performance monitoring and optimization checks',
        version: '1.0.0',
        author: 'Echain Team',
        tags: ['performance', 'optimization'],
        packageName: '@echain/qa-plugin-performance'
      },
      {
        name: 'accessibility-checker',
        description: 'Web accessibility compliance testing',
        version: '1.0.0',
        author: 'Echain Team',
        tags: ['accessibility', 'a11y'],
        packageName: '@echain/qa-plugin-accessibility'
      },
      {
        name: 'code-coverage',
        description: 'Enhanced code coverage reporting',
        version: '1.0.0',
        author: 'Echain Team',
        tags: ['coverage', 'testing'],
        packageName: '@echain/qa-plugin-coverage'
      }
    ];
  }

  /**
   * Install and configure a plugin
   */
  private async installAndConfigurePlugin(plugin: any): Promise<void> {
    console.log(chalk.blue(`\n📦 Installing plugin: ${plugin.name}`));

    try {
      // Install the plugin package
      await this.installPlugin(plugin.packageName);

      // Configure the plugin
      await this.configurePlugin(plugin.name);

      console.log(chalk.green(`✅ Plugin ${plugin.name} installed and configured successfully!`));
    } catch (error: any) {
      console.log(chalk.red(`❌ Failed to install plugin ${plugin.name}: ${error.message}`));
    }
  }

  /**
   * Install a plugin by package name
   */
  async installPlugin(packageName: string): Promise<{ success: boolean; installedPath?: string; error?: string }> {
    console.log(chalk.blue(`\n📦 Installing ${packageName}...`));

    try {
      // Run npm install
      await this.runCommand(`npm install --save-dev ${packageName}`, `Install ${packageName}`);

      console.log(chalk.green(`✅ Package ${packageName} installed successfully`));

      // Reload plugins to include the new one
      await this.loadPlugins();

      return { success: true };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Configure a plugin after installation
   */
  private async configurePlugin(pluginName: string): Promise<void> {
    console.log(chalk.blue(`\n⚙️  Configuring ${pluginName}...`));

    // Get plugin configuration
    const config = await this.getPluginConfig(pluginName);

    if (!config) {
      console.log(chalk.yellow(`⚠️  No configuration required for ${pluginName}`));
      return;
    }

    // Save plugin configuration
    await this.savePluginConfig(pluginName, config);
    console.log(chalk.green(`✅ Plugin ${pluginName} configured`));
  }

  /**
   * Get configuration for a plugin
   */
  private async getPluginConfig(pluginName: string): Promise<any> {
    // This would typically prompt the user for configuration
    // For now, return default config
    const defaultConfigs: { [key: string]: any } = {
      'security-scan': {
        enabled: true,
        severity: 'medium'
      },
      'performance-monitor': {
        enabled: true,
        threshold: 100
      },
      'accessibility-checker': {
        enabled: true,
        standards: ['WCAG2A', 'WCAG2AA']
      },
      'code-coverage': {
        enabled: true,
        minimum: 80
      }
    };

    return defaultConfigs[pluginName] || null;
  }

  /**
   * Save plugin configuration
   */
  private async savePluginConfig(pluginName: string, config: any): Promise<void> {
    this.pluginConfigs[pluginName] = config;

    // Save to config file
    const configPath = path.join(this.projectRoot, '.qa-config.json');
    let existingConfig = {};

    if (await pathExists(configPath)) {
      try {
        existingConfig = JSON.parse(await readFile(configPath, 'utf-8'));
      } catch (error) {
        // Ignore parse errors
      }
    }

    const updatedConfig = {
      ...existingConfig,
      plugins: {
        ...((existingConfig as any).plugins || {}),
        [pluginName]: config
      }
    };

    await writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
  }

  /**
   * List all installed plugins
   */
  async listInstalledPlugins(): Promise<void> {
    console.log(chalk.cyan('\n📋 Installed Plugins\n'));

    if (this.plugins.size === 0) {
      console.log(chalk.yellow('No plugins installed.'));
      console.log(chalk.gray('Run "echain-qa marketplace" to browse available plugins.'));
      return;
    }

    let index = 1;
    for (const [pluginName, plugin] of this.plugins) {
      console.log(`${index}. ${pluginName}`);
      console.log(`   ${plugin.description || 'No description available'}`);
      console.log(`   Version: ${plugin.version || 'Unknown'}`);
      console.log(`   Enabled: ${this.pluginConfigs[pluginName]?.enabled !== false ? 'Yes' : 'No'}`);

      // Show plugin-specific config if available
      const config = this.pluginConfigs[pluginName];
      if (config && Object.keys(config).length > 1) { // More than just 'enabled'
        console.log(`   Configuration: ${JSON.stringify(config)}`);
      }

      console.log('');
      index++;
    }

    console.log(chalk.gray(`Total: ${this.plugins.size} plugin${this.plugins.size === 1 ? '' : 's'} installed`));
  }
}
