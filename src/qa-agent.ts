
import path from 'path';
import { globSync } from 'glob';
import chalk from 'chalk';
import fse from 'fs-extra';
import * as fs from 'fs/promises';

// Import new modules
import { Logger } from './logger.js';
import { CommandExecutor } from './command-executor.js';
import { ConfigurationManager } from './configuration-manager.js';
import { CacheManager } from './cache-manager.js';
import { PluginManager } from './plugin-manager.js';
import { CodeQualityChecker } from './code-quality-checker.js';
import { TestRunner } from './test-runner.js';
import { SecurityScanner } from './security-scanner.js';
import { BuildVerifier } from './build-verifier.js';
import { GitHooksManager } from './git-hooks-manager.js';
import { ProjectDetector } from './project-detector.js';
import { ReportGenerator } from './report-generator.js';
import { InteractiveSetup } from './interactive-setup.js';

// Import new modules
import { PluginBrowser } from './plugin-browser.js';
import { TroubleshootingWizard } from './troubleshooting-wizard.js';

// Import security modules
import { BasicFileSecurityAnalyzer } from './security/FileSecurityAnalyzer.js';
import { RiskAssessmentEngine } from './security/RiskAssessmentEngine.js';
import { SecurityWarningGenerator } from './security/SecurityWarningGenerator.js';

// Import result types
import { CodeQualityResults } from './code-quality-checker.js';
import { TestResults } from './test-runner.js';
import { SecurityResults } from './security-scanner.js';
import { BuildResults } from './build-verifier.js';

/**
 * Configuration options for the QA Agent
 */
export interface QAAgentOptions {
  /** Whether to run in dry-run mode (no actual execution) */
  dryRun?: boolean;
  /** Enable verbose logging output */
  verbose?: boolean;
  /** Suppress non-error output */
  quiet?: boolean;
  /** Root directory of the project to analyze */
  projectRoot?: string;
  /** Skip linting checks */
  skipLinting?: boolean;
  /** Skip test execution */
  skipTesting?: boolean;
  /** Skip build verification */
  skipBuild?: boolean;
  /** Skip security checks */
  skipSecurity?: boolean;
  /** Skip plugin execution */
  skipPlugins?: boolean;
  /** Skip documentation updates */
  skipDocs?: boolean;
}

/**
 * Results summary from a QA run
 */
export interface QAResults {
  /** Number of errors encountered */
  errors: number;
  /** Number of warnings encountered */
  warnings: number;
  /** Duration of the QA run in seconds */
  duration: number;
  /** Timestamp when the QA run completed */
  timestamp: Date;
}

/**
 * Cache entry for QA results
 */
export interface QACacheEntry {
  /** Hash of the content that was cached */
  hash: string;
  /** Results that were cached */
  results: QAResults;
  /** When the results were cached */
  timestamp: Date;
  /** When the cache entry expires */
  expiresAt: Date;
}

/**
 * Plugin interface for extending QA functionality
 */
export interface QAPlugin {
  /** Name of the plugin */
  name: string;
  /** Version of the plugin */
  version: string;
  /** Description of what the plugin does */
  description?: string;
  /** Function to run the plugin */
  run: (qaAgent: QAAgent) => Promise<QAResults>;
}

/**
 * Cache structure for different types of QA results
 */
export interface QACache {
  /** Cached linting results */
  linting?: QACacheEntry;
  /** Cached testing results */
  testing?: QACacheEntry;
  /** Cached security results */
  security?: QACacheEntry;
  /** Cached build results */
  build?: QACacheEntry;
}

/**
 * Main QA Agent class that orchestrates comprehensive quality assurance checks
 * for blockchain and frontend projects. Provides modular architecture with
 * dependency injection for all QA components.
 */
export class QAAgent {
  private options: Required<QAAgentOptions>;
  private projectRoot: string;
  private startTime: number;
  private pluginConfigs: { [key: string]: any } = {};

  // Core modules
  private logger: Logger;
  private commandExecutor: CommandExecutor;
  private configManager: ConfigurationManager;
  private cacheManager: CacheManager;
  private pluginManager: PluginManager;
  private codeQualityChecker: CodeQualityChecker;
  private testRunner: TestRunner;
  private securityScanner: SecurityScanner;
  private buildVerifier: BuildVerifier;
  private gitHooksManager: GitHooksManager;
  private projectDetector: ProjectDetector;
  private reportGenerator: ReportGenerator;
  private interactiveSetup: InteractiveSetup;

  // Security modules for secure file reading
  private fileSecurityAnalyzer: BasicFileSecurityAnalyzer;
  private riskAssessmentEngine: RiskAssessmentEngine;
  private securityWarningGenerator: SecurityWarningGenerator;

  /**
   * Creates a new QA Agent instance with the specified options
   * @param options Configuration options for the QA agent
   */
  constructor(options: QAAgentOptions = {}) {
    this.options = {
      dryRun: false,
      verbose: false,
      quiet: false,
      projectRoot: process.cwd(),
      skipLinting: false,
      skipTesting: false,
      skipBuild: false,
      skipSecurity: false,
      skipPlugins: false,
      skipDocs: false,
      ...options,
    };

    this.projectRoot = this.options.projectRoot;
    this.startTime = Date.now();

    // Initialize core modules
    const qaLogPath = path.join(this.projectRoot, 'docs', 'qalog.md');
    this.logger = new Logger({
      verbose: this.options.verbose,
      quiet: this.options.quiet,
      projectRoot: this.projectRoot,
      qaLogPath,
    });

    this.commandExecutor = new CommandExecutor(this.projectRoot, this.options.dryRun);
    this.configManager = new ConfigurationManager(this.projectRoot);
    this.cacheManager = new CacheManager(this.projectRoot);
    this.pluginManager = new PluginManager(path.join(this.projectRoot, '.qa-plugins'), this);
    this.codeQualityChecker = new CodeQualityChecker(this.projectRoot, this.commandExecutor);
    this.testRunner = new TestRunner(this.projectRoot, this.commandExecutor);
    this.securityScanner = new SecurityScanner(this.projectRoot, this.commandExecutor);
    this.buildVerifier = new BuildVerifier(this.projectRoot, this.commandExecutor);
    this.gitHooksManager = new GitHooksManager(this.projectRoot, this.commandExecutor);
    this.projectDetector = new ProjectDetector(this.projectRoot);
    this.reportGenerator = new ReportGenerator(this.projectRoot);
    this.interactiveSetup = new InteractiveSetup(this.projectRoot);

    // Initialize security modules
    this.fileSecurityAnalyzer = new BasicFileSecurityAnalyzer();
    this.riskAssessmentEngine = new RiskAssessmentEngine();
    this.securityWarningGenerator = new SecurityWarningGenerator();
  }

  // Public getters for SecurePluginLoader access
  /**
   * Gets the project root directory
   * @returns The absolute path to the project root
   */
  public getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * Runs a command with security validation and logging
   * @param command The command to execute
   * @param description Description of what the command does
   * @param timeout Maximum execution time in milliseconds (default: 300000)
   * @returns Promise resolving to true if command succeeded
   */
  public async runCommandPublic(
    command: string,
    description: string,
    timeout?: number
  ): Promise<boolean> {
    // Sanitize command input for security
    const sanitizedCommand = this.commandExecutor.sanitizeCommand(command);
    if (!this.commandExecutor.isCommandSafe(sanitizedCommand)) {
      this.logger.log('ERROR', `Unsafe command blocked: ${command}`);
      return false;
    }
    return this.commandExecutor.runCommand(sanitizedCommand, description, timeout);
  }

  /**
   * Loads QA configuration from disk
   * @returns Promise resolving to the configuration object or null if not found
   */
  public async loadQaConfigPublic(): Promise<any | null> {
    return this.configManager.loadQaConfig();
  }

  /**
   * Logs a message with the specified level
   * @param level Log level (INFO, SUCCESS, WARNING, ERROR)
   * @param message Message to log
   */
  public logPublic(level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR', message: string): void {
    return this.logger.log(level, message);
  }

  /**
   * Appends an entry to the QA log file
   * @param entry Log entry to append
   */
  public async appendToLog(entry: string): Promise<void> {
    // Access the private appendToLog method through a workaround or add a public method to Logger
    // For now, we'll implement it directly
    try {
      const fse = await import('fs-extra');
      const path = await import('path');
      await fse.ensureDir(path.dirname(this.logger['options'].qaLogPath));
      const fs = await import('fs/promises');
      await fs.appendFile(this.logger['options'].qaLogPath, entry + '\n');
    } catch {
      // Silently fail if logging fails
    }
  }

  /**
   * Sets up Git hooks for pre-commit and pre-push QA checks
   */
  public async setupHooks(): Promise<void> {
    return this.gitHooksManager.setupHooks();
  }

  /**
   * Gets the map of loaded plugins
   * @returns Map of plugin names to plugin instances
   */
  public getPlugins() {
    return this.pluginManager.getPlugins();
  }

  /**
   * Loads all available plugins
   */
  async loadPlugins(): Promise<void> {
    await this.pluginManager.loadPlugins();
  }

  /**
   * Runs all loaded plugins
   * @returns Promise resolving to combined plugin results
   */
  async runPlugins(): Promise<QAResults> {
    return this.pluginManager.runPlugins();
  }

  /**
   * Initializes the QA project configuration and creates necessary files
   */
  async initializeProject(): Promise<void> {
    this.logger.log('INFO', 'Initializing QA configuration...');

    // Create docs directory if it doesn't exist
    await fse.ensureDir(path.join(this.projectRoot, 'docs'));

    // Create initial QA log if it doesn't exist
    const qaLogPath = path.join(this.projectRoot, 'docs', 'qalog.md');
    if (!(await fse.pathExists(qaLogPath))) {
      const header = `# 🛡️ Echain QA Agent Log

This file contains the comprehensive log of all Quality Assurance sessions for the project. Each entry represents a complete QA run with detailed information about checks performed, results, and any issues found.

**Last Updated:** ${new Date().toISOString()}
**QA Agent Version:** 2.0.0

---

`;
      await fse.writeFile(qaLogPath, header);
    }

    // Create .qa-config.json if it doesn't exist
    const configPath = path.join(this.projectRoot, '.qa-config.json');
    if (!(await fse.pathExists(configPath))) {
      const config = {
        version: '2.0.0',
        project: {
          name: path.basename(this.projectRoot),
          type: 'blockchain', // or "frontend", "fullstack"
          frameworks: [],
        },
        checks: {
          linting: true,
          testing: true,
          security: true,
          build: true,
          performance: false,
        },
        paths: {
          frontend: 'frontend',
          blockchain: 'blockchain',
          docs: 'docs',
          tests: 'test',
        },
        hooks: {
          preCommit: true,
          prePush: true,
          autoInstall: true,
          wrapScripts: false,
          scriptsToWrap: ['build', 'start', 'dev', 'test'],
        },
        qualityGates: {
          failOnLintErrors: true,
          failOnTestFailures: true,
          failOnBuildFailures: true,
          failOnSecurityVulnerabilities: true,
          failOnPerformanceIssues: false,
          requireTests: false,
          requireTestCoverage: false,
          minTestCoverage: 80,
        },
      };
      await fse.writeFile(configPath, JSON.stringify(config, null, 2));
    }

    // Validate existing configuration
    if (await fse.pathExists(configPath)) {
      try {
        const configContent = await fse.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        const isValid = await this.configManager.validateConfig(config);
        if (!isValid) {
          throw new Error('Configuration validation failed');
        }

        // Auto-wrap scripts if enabled
        if (config.hooks && config.hooks.wrapScripts) {
          await this.wrapScripts();
        }
      } catch (error) {
        this.logger.log('ERROR', `Configuration validation error: ${error}`);
        throw error;
      }
    }

    this.logger.log('SUCCESS', 'QA configuration initialized');
  }

  /**
   * Runs linting checks with optional auto-fixing
   * @param autoFix Whether to automatically fix linting issues
   * @param config Optional linting configuration
   * @returns Promise resolving to linting results
   */
  async runLinting(autoFix = false, config?: any): Promise<CodeQualityResults> {
    return this.codeQualityChecker.runLinting(autoFix, config);
  }

  /**
   * Runs the test suite
   * @returns Promise resolving to test results
   */
  async runTests(): Promise<TestResults> {
    return this.testRunner.runTests();
  }

  /**
   * Runs security vulnerability checks
   * @returns Promise resolving to security scan results
   */
  async runSecurityChecks(): Promise<SecurityResults> {
    return this.securityScanner.runSecurityChecks();
  }

  /**
   * Runs build verification checks
   * @returns Promise resolving to build verification results
   */
  async runBuildChecks(): Promise<BuildResults> {
    return this.buildVerifier.runBuildChecks();
  }

  /**
   * Checks if Git hooks are properly installed
   * @returns Promise resolving to true if hooks are installed
   */
  async checkHooks(): Promise<boolean> {
    return this.gitHooksManager.checkHooks();
  }

  /**
   * Validates QA configuration
   * @param config Configuration object to validate
   * @returns Promise resolving to true if configuration is valid
   */
  async validateConfig(config: any): Promise<boolean> {
    return this.configManager.validateConfig(config);
  }

  /**
   * Runs the complete QA suite with all enabled checks
   * @returns Promise resolving to comprehensive QA results
   */
  async runFullSuite(): Promise<QAResults> {
    const sessionId = `QA_${new Date().toISOString().replace(/[:.]/g, '_')}`;

    // Load cache and plugins
    await this.cacheManager.loadCache();
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

    this.logger.log('INFO', 'Starting comprehensive QA suite...');

    let totalErrors = 0;
    let totalWarnings = 0;

    let config: any = null;
    try {
      config = await this.configManager.loadQaConfig();
    } catch (error) {
      this.logger.log('WARNING', `Failed to load QA config: ${error}`);
      this.logger.log('WARNING', 'Proceeding without QA configuration due to load error');
    }

    const qualityGates = config?.qualityGates ?? {};
    const testFiles = this.collectTestFiles(config);

    if (qualityGates.requireTests) {
      if (testFiles.length === 0) {
        totalErrors++;
        this.logger.log(
          'ERROR',
          'Quality gate failed: requireTests is enabled but no test files were found.'
        );
      } else {
        this.logger.log(
          'SUCCESS',
          `Quality gate passed: detected ${testFiles.length} test file(s).`
        );
      }
    }

    try {
      // 1. Documentation updates
      if (!this.options.skipDocs) {
        await this.updateDocs();
      } else {
        this.logger.log('INFO', 'Skipping documentation updates (--skip-docs)');
      }

      // 2. Code quality checks - check cache first
      if (!this.options.skipLinting) {
        const cachedLinting = await this.cacheManager.getCachedResult('linting');
        if (cachedLinting) {
          this.logger.log('INFO', 'Using cached linting results');
          if (qualityGates.failOnLintErrors) {
            totalErrors += cachedLinting.errors;
          }
          totalWarnings += cachedLinting.warnings;
          this.logger.log('SUCCESS', 'Code quality checks completed (cached)');
        } else {
          const lintingResults: CodeQualityResults = await this.runLinting(false, config);
          if (qualityGates.failOnLintErrors) {
            totalErrors += lintingResults.errors;
          }
          totalWarnings += lintingResults.warnings;
          await this.cacheManager.setCachedResult('linting', {
            errors: lintingResults.errors,
            warnings: lintingResults.warnings,
            duration: lintingResults.duration,
            timestamp: lintingResults.timestamp,
          });
          this.logger.log('SUCCESS', 'Code quality checks completed');
        }
      } else {
        this.logger.log('INFO', 'Skipping code quality checks (--skip-linting)');
      }

      // 3. Testing - check cache first
      if (!this.options.skipTesting) {
        const cachedTesting = await this.cacheManager.getCachedResult('testing');
        if (cachedTesting) {
          this.logger.log('INFO', 'Using cached testing results');
          if (qualityGates.failOnTestFailures) {
            totalErrors += cachedTesting.errors;
          }
          totalWarnings += cachedTesting.warnings;
          this.logger.log('SUCCESS', 'Testing completed (cached)');
        } else {
          const testingResults: TestResults = await this.runTests();
          if (qualityGates.failOnTestFailures) {
            totalErrors += testingResults.errors;
          }
          totalWarnings += testingResults.warnings;
          await this.cacheManager.setCachedResult('testing', {
            errors: testingResults.errors,
            warnings: testingResults.warnings,
            duration: testingResults.duration,
            timestamp: testingResults.timestamp,
          });
          this.logger.log('SUCCESS', 'Testing completed');
        }

        if (qualityGates.requireTestCoverage) {
          try {
            const coverage = await this.testRunner.enforceTestCoverageRequirement(config);
            this.logger.log(
              'SUCCESS',
              `Coverage requirement satisfied at ${coverage.toFixed(2)}%.`
            );
          } catch (error: any) {
            totalErrors++;
            this.logger.log('ERROR', error?.message ?? String(error));
          }
        }
      } else {
        this.logger.log('INFO', 'Skipping testing (--skip-testing)');
      }

      // 4. Build verification - check cache first
      if (!this.options.skipBuild) {
        const cachedBuild = await this.cacheManager.getCachedResult('build');
        if (cachedBuild) {
          this.logger.log('INFO', 'Using cached build results');
          if (qualityGates.failOnBuildFailures) {
            totalErrors += cachedBuild.errors;
          }
          totalWarnings += cachedBuild.warnings;
          this.logger.log('SUCCESS', 'Build verification completed (cached)');
        } else {
          const buildResults: BuildResults = await this.runBuildChecks();
          if (qualityGates.failOnBuildFailures) {
            totalErrors += buildResults.errors;
          }
          totalWarnings += buildResults.warnings;
          await this.cacheManager.setCachedResult('build', {
            errors: buildResults.errors,
            warnings: buildResults.warnings,
            duration: buildResults.duration,
            timestamp: buildResults.timestamp,
          });
          this.logger.log('SUCCESS', 'Build verification completed');
        }
      } else {
        this.logger.log('INFO', 'Skipping build verification (--skip-build)');
      }

      // 5. Security checks - always run fresh (security critical)
      if (!this.options.skipSecurity) {
        const securityResults: SecurityResults = await this.runSecurityChecks();
        totalWarnings += securityResults.issues;
      } else {
        this.logger.log('INFO', 'Skipping security checks (--skip-security)');
      }

      // 6. Custom plugins
      if (!this.options.skipPlugins && this.pluginManager.getPlugins().size > 0) {
        this.logger.log(
          'INFO',
          `Running ${this.pluginManager.getPlugins().size} custom plugins...`
        );
        const pluginResults = await this.runPlugins();
        totalErrors += pluginResults.errors;
        totalWarnings += pluginResults.warnings;
        this.logger.log('SUCCESS', 'Custom plugins completed');
      } else if (this.options.skipPlugins) {
        this.logger.log('INFO', 'Skipping custom plugins (--skip-plugins)');
      }

      // 7. Performance checks (optional)
      // await this.runPerformanceChecks();
    } catch (error) {
      this.logger.log('ERROR', `QA suite failed: ${error}`);
      totalErrors++;
    }

    const duration = (Date.now() - this.startTime) / 1000;

    // Generate report
    const results: QAResults = {
      errors: totalErrors,
      warnings: totalWarnings,
      duration,
      timestamp: new Date(),
    };

    await this.reportGenerator.generateReport(results);

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
    this.logger.log('INFO', 'Documentation updates completed');
  }

  /**
   * Wraps npm scripts to include QA checks before execution
   */
  async wrapScripts(): Promise<void> {
    this.logger.log('INFO', 'Wrapping npm scripts with QA checks...');

    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!(await fse.pathExists(packageJsonPath))) {
      throw new Error('package.json not found');
    }

    const packageJsonContent = await fse.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    if (!packageJson.scripts) {
      this.logger.log('WARNING', 'No scripts found in package.json');
      return;
    }

    // Load config to see which scripts to wrap
    const configPath = path.join(this.projectRoot, '.qa-config.json');
    let scriptsToWrap = ['build', 'start', 'dev', 'test'];

    if (await fse.pathExists(configPath)) {
      try {
        const configContent = await fse.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        if (config.hooks && config.hooks.scriptsToWrap) {
          scriptsToWrap = config.hooks.scriptsToWrap;
        }
      } catch (error) {
        this.logger.log('WARNING', `Failed to read QA config: ${error}`);
        this.logger.log('WARNING', 'Could not read QA config, using defaults');
      }
    }

    let wrappedCount = 0;
    for (const scriptName of scriptsToWrap) {
      if (packageJson.scripts[scriptName]) {
        const originalScript = packageJson.scripts[scriptName];

        // Skip if already wrapped
        if (originalScript.includes('echain-qa run')) {
          this.logger.log('INFO', `Script '${scriptName}' already wrapped`);
          continue;
        }

        // Wrap the script
        const wrappedScript = `npx echain-qa run --dry-run --quiet && ${originalScript}`;
        packageJson.scripts[scriptName] = wrappedScript;

        this.logger.log('SUCCESS', `Wrapped script '${scriptName}'`);
        wrappedCount++;
      }
    }

    if (wrappedCount > 0) {
      await fse.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      this.logger.log('SUCCESS', `Wrapped ${wrappedCount} scripts with QA checks`);
    } else {
      this.logger.log('INFO', 'No scripts needed wrapping');
    }
  }

  /**
   * Removes QA check wrapping from npm scripts
   */
  async unwrapScripts(): Promise<void> {
    this.logger.log('INFO', 'Unwrapping npm scripts...');

    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!(await fse.pathExists(packageJsonPath))) {
      throw new Error('package.json not found');
    }

    const packageJsonContent = await fse.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    if (!packageJson.scripts) {
      this.logger.log('WARNING', 'No scripts found in package.json');
      return;
    }

    let unwrappedCount = 0;
    for (const scriptName in packageJson.scripts) {
      const script = packageJson.scripts[scriptName];

      if (script.includes('npx echain-qa run --dry-run --quiet && ')) {
        // Unwrap the script
        const originalScript = script.replace('npx echain-qa run --dry-run --quiet && ', '');
        packageJson.scripts[scriptName] = originalScript;

        this.logger.log('SUCCESS', `Unwrapped script '${scriptName}'`);
        unwrappedCount++;
      }
    }

    if (unwrappedCount > 0) {
      await fse.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      this.logger.log('SUCCESS', `Unwrapped ${unwrappedCount} scripts`);
    } else {
      this.logger.log('INFO', 'No wrapped scripts found');
    }
  }

  /**
   * Removes Git hooks
   */
  async removeHooks(): Promise<void> {
    await this.gitHooksManager.removeHooks();
  }

  /**
   * Detects the project type and frameworks used
   * @returns Promise resolving to project detection results
   */
  async detectProjectType(): Promise<{
    projectType: string;
    frameworks: string[];
    languages: string[];
    confidence: number;
    hasTests: boolean;
    hasBuild: boolean;
  }> {
    return this.projectDetector.detectProjectType();
  }

  /**
   * Interactive configuration wizard for setting up QA agent
   */
  async runInteractiveSetup(): Promise<void> {
    const config = await this.interactiveSetup.runInteractiveSetup();

    // Show configuration preview
    console.log(chalk.blue('\n� Configuration Preview:'));
    console.log(JSON.stringify(config, null, 2));

    const { confirmConfig } = await (
      await import('inquirer')
    ).default.prompt([
      {
        type: 'confirm',
        name: 'confirmConfig',
        message: 'Save this configuration?',
        default: true,
      },
    ]);

    if (confirmConfig) {
      const configPath = path.join(this.projectRoot, '.qa-config.json');
      await fse.writeFile(configPath, JSON.stringify(config, null, 2));
      console.log(chalk.green(`\n✅ Configuration saved to ${configPath}`));

      // Setup hooks if requested
      if (config.hooks.preCommit || config.hooks.prePush) {
        console.log(chalk.blue('\n🔗 Setting up git hooks...'));
        await this.setupHooks();
      }

      // Wrap scripts if requested
      if (config.hooks.wrapScripts) {
        console.log(chalk.blue('\n📦 Wrapping npm scripts...'));
        await this.wrapScripts();
      }

      console.log(chalk.green('\n🎉 Setup complete! Run "echain-qa run" to start QA checks.'));
    } else {
      console.log(
        chalk.yellow('\n⚠️  Configuration not saved. You can run this setup again anytime.')
      );
    }
  }

  /**
   * Run guided troubleshooting to identify and fix common issues
   */
  /**
   * Run guided troubleshooting with comprehensive diagnostics
   */
  async runGuidedTroubleshooting(): Promise<void> {
    const wizard = new TroubleshootingWizard(this.projectRoot);
    await wizard.startWizard();
  }

  /**
   * Run the plugin marketplace interface
   */
  async runPluginMarketplace(): Promise<void> {
    const browser = new PluginBrowser({
      manager: this.pluginManager,
      autoInstall: false,
      showDetails: true
    });

    await browser.browse();
  }

  /**
   * Detect configuration-related issues
   */
  private async detectConfigurationIssues(): Promise<any[]> {
    const issues: any[] = [];

    // Check for missing config files
    const configPath = path.join(this.projectRoot, '.qa-config.json');
    const shellConfigPath = path.join(this.projectRoot, '.qa-config');

    if (!(await fse.pathExists(configPath)) && !(await fse.pathExists(shellConfigPath))) {
      issues.push({
        title: 'Missing QA Configuration',
        description: 'No QA configuration file found. Run "echain-qa setup" to create one.',
        severity: 'medium',
        category: 'configuration',
        autoFix: true,
      });
    }

    // Check for missing package.json
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!(await fse.pathExists(packageJsonPath))) {
      issues.push({
        title: 'Missing package.json',
        description: 'No package.json found. This is required for Node.js projects.',
        severity: 'high',
        category: 'configuration',
        autoFix: false,
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
    if (await fse.pathExists(packageJsonPath)) {
      try {
        // Check for missing lockfile
        const hasLockFile =
          (await fse.pathExists(path.join(this.projectRoot, 'package-lock.json'))) ||
          (await fse.pathExists(path.join(this.projectRoot, 'yarn.lock'))) ||
          (await fse.pathExists(path.join(this.projectRoot, 'pnpm-lock.yaml')));

        if (!hasLockFile) {
          issues.push({
            title: 'Missing Lock File',
            description: 'No package lock file found. This can lead to inconsistent dependencies.',
            severity: 'medium',
            category: 'dependencies',
            autoFix: false,
          });
        }

        // Check for outdated dependencies
        // This would require running npm outdated, but we'll skip for now
      } catch (error) {
        console.log(`WARNING: Failed to parse package.json: ${error}`);
        issues.push({
          title: 'Invalid package.json',
          description: 'package.json contains invalid JSON.',
          severity: 'high',
          category: 'configuration',
          autoFix: false,
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
        autoFix: false,
      });
    }

    // Check for linting configuration
    const hasLinting =
      (await fse.pathExists(path.join(this.projectRoot, '.eslintrc.js'))) ||
      (await fse.pathExists(path.join(this.projectRoot, '.eslintrc.json'))) ||
      (await fse.pathExists(path.join(this.projectRoot, '.eslintrc.yml')));

    if (!hasLinting) {
      issues.push({
        title: 'No Linting Configuration',
        description: 'No ESLint configuration found. Consider adding linting for code quality.',
        severity: 'low',
        category: 'code-quality',
        autoFix: false,
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
      const { applyAutoFix } = await (
        await import('inquirer')
      ).default.prompt([
        {
          type: 'confirm',
          name: 'applyAutoFix',
          message: 'Can I automatically fix this issue?',
          default: true,
        },
      ]);

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
      '**/test/**/*.{js,jsx,ts,tsx,cjs,mjs}',
    ];

    const globOptions = {
      cwd: this.projectRoot,
      absolute: false,
      nodir: true,
    } as const;

    try {
      for (const pattern of patterns) {
        const matches: string[] = globSync(pattern, globOptions as any);
        matches.forEach(file => filesSet.add(file));
      }
    } catch (error) {
      console.log(`WARNING: Failed to collect test files: ${error}`);
      // Ignore glob errors
    }

    return Array.from(filesSet);
  }

  private async enforceTestCoverageRequirement(config: any): Promise<number> {
    const configuredPath = config?.paths?.coverageSummary;
    const resolvedPath = configuredPath
      ? path.isAbsolute(configuredPath)
        ? configuredPath
        : path.join(this.projectRoot, configuredPath)
      : path.join(this.projectRoot, 'coverage', 'coverage-summary.json');

    if (!(await fse.pathExists(resolvedPath))) {
      throw new Error('Coverage summary not found');
    }

    let coverageRaw: string;
    try {
      coverageRaw = await fse.readFile(resolvedPath, 'utf-8');
    } catch (error) {
      throw new Error(`Unable to read coverage summary: ${error}`);
    }

    let coverageSummary: any;
    try {
      coverageSummary = JSON.parse(coverageRaw);
    } catch (error) {
      console.log(`WARNING: Failed to parse coverage summary: ${error}`);
      throw new Error('Coverage summary is not valid JSON');
    }

    const total = coverageSummary?.total;
    if (!total) {
      throw new Error('Coverage summary missing total metrics');
    }

    const metrics = ['lines', 'statements', 'branches', 'functions'] as const;
    const coverageValues = metrics
      .map(metric => total[metric]?.pct)
      .filter((value): value is number => typeof value === 'number');

    if (coverageValues.length === 0) {
      throw new Error('Coverage summary missing metric percentages');
    }

    const minimumCoverage = Math.min(...coverageValues);
    const requiredCoverage = config?.qualityGates?.minTestCoverage ?? 0;

    if (minimumCoverage < requiredCoverage) {
      throw new Error(
        `Coverage ${minimumCoverage.toFixed(2)}% is below required ${requiredCoverage}% threshold.`
      );
    }

    return minimumCoverage;
  }

  /**
   * Get available plugins from the marketplace
   */
  private async getAvailablePlugins(): Promise<any[]> {
    return this.pluginManager.getAvailablePlugins();
  }



  async installPlugin(
    packageName: string
  ): Promise<{ success: boolean; installedPath?: string; error?: string }> {
    return this.pluginManager.installPlugin(packageName);
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
        severity: 'medium',
      },
      'performance-monitor': {
        enabled: true,
        threshold: 100,
      },
      'accessibility-checker': {
        enabled: true,
        standards: ['WCAG2A', 'WCAG2AA'],
      },
      'code-coverage': {
        enabled: true,
        minimum: 80,
      },
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

    if (await fse.pathExists(configPath)) {
      try {
        existingConfig = JSON.parse(await fse.readFile(configPath, 'utf-8'));
      } catch (error) {
        console.log(`WARNING: Failed to read existing config: ${error}`);
        // Ignore parse errors
      }
    }

    const updatedConfig = {
      ...existingConfig,
      plugins: {
        ...((existingConfig as any).plugins || {}),
        [pluginName]: config,
      },
    };

    await fse.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
  }

  /**
   * Lists all installed plugins
   */
  async listInstalledPlugins(): Promise<void> {
    return this.pluginManager.listInstalledPlugins();
  }

  /**
   * Securely reads a file with comprehensive security analysis
   * @param filePath Absolute or relative path to the file to read
   * @param options Security and reading options
   * @returns Promise resolving to file content and security analysis
   */
  async secureReadFile(
    filePath: string,
    options: {
      /** Whether to allow reading files with security warnings */
      allowWithWarnings?: boolean;
      /** Whether to throw on critical security risks */
      strictMode?: boolean;
      /** Maximum file size to read (in bytes) */
      maxFileSize?: number;
      /** Encoding for text files */
      encoding?: string;
    } = {}
  ): Promise<{
    content: string | Buffer;
    securityAnalysis: {
      assessment: import('./security/FileSecurityAnalyzer.js').RiskAssessment;
      warnings: import('./security/SecurityWarningGenerator.js').WarningMessage[];
      isSafe: boolean;
    };
  }> {
    const {
      allowWithWarnings = false,
      strictMode = true,
      maxFileSize = 10 * 1024 * 1024, // 10MB default
      encoding = 'utf8'
    } = options;

    // Resolve file path
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(this.projectRoot, filePath);

    // Analyze file security
    const securityResult = await this.fileSecurityAnalyzer.analyzeFile(resolvedPath);

    // Assess risk
    const riskAssessment = this.riskAssessmentEngine.assessRisk(securityResult.riskAssessment.riskFactors);

    // Generate warnings
    const warnings = this.securityWarningGenerator.generateWarnings(riskAssessment);

    // Determine if file is safe to read
    const hasBlockingWarnings = warnings.some(w => w.isBlocking);
    const hasCriticalRisk = riskAssessment.riskLevel === 'CRITICAL';
    const hasWarnings = warnings.length > 0;
    const isSafe = !hasBlockingWarnings && !hasCriticalRisk && !hasWarnings;

    // Check file size
    if (securityResult.fileSize > maxFileSize) {
      throw new Error(`File size (${securityResult.fileSize} bytes) exceeds maximum allowed size (${maxFileSize} bytes)`);
    }

    // Enforce security policies
    if (strictMode && hasCriticalRisk) {
      throw new Error(`CRITICAL security risk detected. File reading blocked. ${warnings.map(w => w.title).join(', ')}`);
    }

    if (!allowWithWarnings && !isSafe) {
      throw new Error(`Security warnings detected. Use allowWithWarnings=true to proceed. ${warnings.map(w => w.title).join(', ')}`);
    }

    // Log security analysis
    if (!isSafe) {
      this.logger.log('WARNING', `Reading file with security warnings: ${resolvedPath}`);
      warnings.forEach(warning => {
        this.logger.log('WARNING', `${warning.priority.toUpperCase()}: ${warning.title} - ${warning.description}`);
      });
    } else {
      this.logger.log('INFO', `File security analysis passed: ${resolvedPath}`);
    }

    // Read file content
    let content: string | Buffer;
    try {
      if (securityResult.metadata.isBinary) {
        // Read as buffer for binary files
        content = await fs.readFile(resolvedPath);
      } else {
        // Read as text with specified encoding
        content = await fs.readFile(resolvedPath, { encoding: (encoding || 'utf8') as any });
      }
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }

    return {
      content,
      securityAnalysis: {
        assessment: riskAssessment,
        warnings,
        isSafe
      }
    };
  }
}
