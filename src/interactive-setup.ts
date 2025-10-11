import path from 'path';
import chalk from 'chalk';

export interface SetupConfig {
  version: string;
  project: {
    name: string;
    type: string;
    frameworks: string[];
  };
  checks: {
    linting: boolean;
    testing: boolean;
    security: boolean;
    build: boolean;
    performance: boolean;
  };
  paths: {
    frontend: string;
    blockchain: string;
    docs: string;
    tests: string;
  };
  hooks: {
    preCommit: boolean;
    prePush: boolean;
    autoInstall: boolean;
    wrapScripts: boolean;
    scriptsToWrap: string[];
  };
  timeouts: {
    lint: number;
    test: number;
    build: number;
    security: number;
  };
  qualityGates: {
    failOnLintErrors: boolean;
    failOnTestFailures: boolean;
    failOnBuildFailures: boolean;
    failOnSecurityVulnerabilities: boolean;
    failOnPerformanceIssues: boolean;
    requireTests: boolean;
    requireTestCoverage: boolean;
    minTestCoverage: number;
  };
}

export class InteractiveSetup {
  constructor(private projectRoot: string) {}

  /**
   * Interactive configuration wizard for setting up QA agent
   */
  async runInteractiveSetup(): Promise<SetupConfig> {
    const inquirer = (await import('inquirer')).default;

    console.log(chalk.cyan('\n🛡️  Echain QA Agent - Interactive Setup'));
    console.log(chalk.gray("Let's configure quality assurance for your project!\n"));

    // Detect project type first
    const detection = await this.detectProjectType();

    console.log(chalk.blue('🔍 Project Analysis:'));
    console.log(`   Type: ${detection.projectType} (${detection.confidence}% confidence)`);
    console.log(`   Frameworks: ${detection.frameworks.join(', ') || 'none detected'}`);
    console.log(`   Languages: ${detection.languages.join(', ')}`);
    console.log(`     Tests: ${detection.hasTests ? '✅ detected' : '❌ not found'}`);
    console.log(`   Build: ${detection.hasBuild ? '✅ configured' : '❌ not configured'}\n`);

    // Project type confirmation
    const { confirmProjectType } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmProjectType',
        message: `Is this a ${detection.projectType} project?`,
        default: detection.confidence > 70,
      },
    ]);

    let projectType = detection.projectType;
    let frameworks = [...detection.frameworks];

    if (!confirmProjectType) {
      const { manualProjectType } = await inquirer.prompt([
        {
          type: 'list',
          name: 'manualProjectType',
          message: 'What type of project is this?',
          choices: [
            { name: 'Blockchain/Smart Contracts', value: 'blockchain' },
            { name: 'Frontend Web Application', value: 'frontend' },
            { name: 'Full-stack Application', value: 'fullstack' },
            { name: 'Library/Package', value: 'library' },
          ],
        },
      ]);
      projectType = manualProjectType;

      // Ask about frameworks based on project type
      if (projectType === 'blockchain') {
        const { blockchainFrameworks } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'blockchainFrameworks',
            message: 'Which blockchain frameworks are you using?',
            choices: [
              { name: 'Hardhat', value: 'hardhat' },
              { name: 'Foundry', value: 'foundry' },
              { name: 'Truffle', value: 'truffle' },
              { name: 'Other', value: 'other' },
            ],
          },
        ]);
        frameworks = blockchainFrameworks.filter((f: string) => f !== 'other');
      } else if (projectType === 'frontend') {
        const { frontendFrameworks } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'frontendFrameworks',
            message: 'Which frontend frameworks are you using?',
            choices: [
              { name: 'React', value: 'react' },
              { name: 'Next.js', value: 'next.js' },
              { name: 'Vue.js', value: 'vue' },
              { name: 'Angular', value: 'angular' },
              { name: 'Vite', value: 'vite' },
              { name: 'Other', value: 'other' },
            ],
          },
        ]);
        frameworks = frontendFrameworks.filter((f: string) => f !== 'other');
      }
    }

    // Quality checks configuration
    console.log(chalk.blue('\n🔧 Quality Checks Configuration:'));
    const { enableLinting, enableTesting, enableSecurity, enableBuild, enablePerformance } =
      await inquirer.prompt([
        {
          type: 'confirm',
          name: 'enableLinting',
          message: 'Enable code linting checks?',
          default: true,
        },
        {
          type: 'confirm',
          name: 'enableTesting',
          message: 'Enable automated testing?',
          default: detection.hasTests,
        },
        {
          type: 'confirm',
          name: 'enableSecurity',
          message: 'Enable security vulnerability scanning?',
          default: true,
        },
        {
          type: 'confirm',
          name: 'enableBuild',
          message: 'Enable build verification?',
          default: detection.hasBuild,
        },
        {
          type: 'confirm',
          name: 'enablePerformance',
          message: 'Enable performance checks?',
          default: false,
        },
      ]);

    // Quality gates
    console.log(chalk.blue('\n🚧 Quality Gates:'));
    const { failOnLintErrors, failOnTestFailures, failOnBuildFailures, requireTests } =
      await inquirer.prompt([
        {
          type: 'confirm',
          name: 'failOnLintErrors',
          message: 'Fail builds on linting errors?',
          default: true,
        },
        {
          type: 'confirm',
          name: 'failOnTestFailures',
          message: 'Fail builds on test failures?',
          default: true,
        },
        {
          type: 'confirm',
          name: 'failOnBuildFailures',
          message: 'Fail builds on build failures?',
          default: true,
        },
        {
          type: 'confirm',
          name: 'requireTests',
          message: 'Require test files to be present?',
          default: false,
        },
      ]);

    // Git hooks setup
    console.log(chalk.blue('\n🔗 Git Integration:'));
    const { setupPreCommit, setupPrePush, wrapScripts } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'setupPreCommit',
        message: 'Install pre-commit hook for QA checks?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'setupPrePush',
        message: 'Install pre-push hook for QA checks?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'wrapScripts',
        message: 'Wrap npm scripts (build, start, dev, test) with QA checks?',
        default: false,
      },
    ]);

    // Create configuration
    const config: SetupConfig = {
      version: '2.2.0',
      project: {
        name: path.basename(this.projectRoot),
        type: projectType,
        frameworks: frameworks,
      },
      checks: {
        linting: enableLinting,
        testing: enableTesting,
        security: enableSecurity,
        build: enableBuild,
        performance: enablePerformance,
      },
      paths: {
        frontend: 'frontend',
        blockchain: 'blockchain',
        docs: 'docs',
        tests: 'test',
      },
      hooks: {
        preCommit: setupPreCommit,
        prePush: setupPrePush,
        autoInstall: true,
        wrapScripts: wrapScripts,
        scriptsToWrap: ['build', 'start', 'dev', 'test'],
      },
      timeouts: {
        lint: 300,
        test: 600,
        build: 300,
        security: 120,
      },
      qualityGates: {
        failOnLintErrors: failOnLintErrors,
        failOnTestFailures: failOnTestFailures,
        failOnBuildFailures: failOnBuildFailures,
        failOnSecurityVulnerabilities: true,
        failOnPerformanceIssues: false,
        requireTests: requireTests,
        requireTestCoverage: false,
        minTestCoverage: 80,
      },
    };

    return config;
  }

  /**
   * Detect project type and characteristics
   */
  private async detectProjectType(): Promise<{
    projectType: string;
    frameworks: string[];
    languages: string[];
    confidence: number;
    hasTests: boolean;
    hasBuild: boolean;
  }> {
    // This would contain the project detection logic
    // For now, return a basic detection
    return {
      projectType: 'blockchain',
      frameworks: ['hardhat'],
      languages: ['typescript', 'solidity'],
      confidence: 80,
      hasTests: true,
      hasBuild: true,
    };
  }
}
