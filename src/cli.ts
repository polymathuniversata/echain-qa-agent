#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { QAAgent } from './qa-agent';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const version = packageJson.version;

const program = new Command();

program
  .name('echain-qa')
  .description('🛡️ Echain Quality Assurance Agent - Comprehensive QA automation for blockchain projects')
  .version(version);

program
  .command('run')
  .description('Run full QA suite')
  .option('-d, --dry-run', 'simulate QA checks without actual execution')
  .option('-v, --verbose', 'enable verbose output')
  .action(async (options) => {
    const agent = new QAAgent({
      dryRun: options.dryRun,
      verbose: options.verbose
    });

    try {
      const results = await agent.runFullSuite();
      process.exit(results.errors > 0 ? 1 : 0);
    } catch (error) {
      console.error(chalk.red('❌ QA execution failed:'), error);
      process.exit(1);
    }
  });

program
  .command('lint')
  .description('Run only linting checks')
  .option('-f, --fix', 'automatically fix linting issues')
  .action(async (options) => {
    const agent = new QAAgent();
    try {
      await agent.runLinting(options.fix);
      console.log(chalk.green('✅ Linting completed successfully'));
    } catch (error) {
      console.error(chalk.red('❌ Linting failed:'), error);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Run only testing suite')
  .action(async () => {
    const agent = new QAAgent();
    try {
      await agent.runTests();
      console.log(chalk.green('✅ Testing completed successfully'));
    } catch (error) {
      console.error(chalk.red('❌ Testing failed:'), error);
      process.exit(1);
    }
  });

program
  .command('security')
  .description('Run only security checks')
  .action(async () => {
    const agent = new QAAgent();
    try {
      await agent.runSecurityChecks();
      console.log(chalk.green('✅ Security checks completed successfully'));
    } catch (error) {
      console.error(chalk.red('❌ Security checks failed:'), error);
      process.exit(1);
    }
  });

program
  .command('build')
  .description('Run only build verification')
  .action(async () => {
    const agent = new QAAgent();
    try {
      await agent.runBuildChecks();
      console.log(chalk.green('✅ Build verification completed successfully'));
    } catch (error) {
      console.error(chalk.red('❌ Build verification failed:'), error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize QA configuration in current project')
  .action(async () => {
    const agent = new QAAgent();
    try {
      await agent.initializeProject();
      console.log(chalk.green('✅ QA configuration initialized successfully'));
      console.log('Run "echain-qa run" to start QA checks');
    } catch (error) {
      console.error(chalk.red('❌ Initialization failed:'), error);
      process.exit(1);
    }
  });

program
  .command('setup-hooks')
  .description('Install git hooks for automatic QA checks')
  .action(async () => {
    const agent = new QAAgent();
    try {
      await agent.setupHooks();
      console.log(chalk.green('✅ Git hooks installed successfully'));
      console.log('Hooks will run QA checks on commit and push');
    } catch (error) {
      console.error(chalk.red('❌ Hook setup failed:'), error);
      process.exit(1);
    }
  });

program
  .command('check-hooks')
  .description('Check if QA git hooks are properly installed')
  .action(async () => {
    const agent = new QAAgent();
    try {
      const hasHooks = await agent.checkHooks();
      if (hasHooks) {
        console.log(chalk.green('✅ QA hooks are properly configured'));
      } else {
        console.log(chalk.yellow('⚠️  No QA hooks found'));
        console.log('Run "echain-qa setup-hooks" to install them');
      }
    } catch (error) {
      console.error(chalk.red('❌ Hook check failed:'), error);
      process.exit(1);
    }
  });

program
  .command('remove-hooks')
  .description('Remove QA git hooks')
  .action(async () => {
    const agent = new QAAgent();
    try {
      await agent.removeHooks();
      console.log(chalk.green('✅ QA hooks removed successfully'));
    } catch (error) {
      console.error(chalk.red('❌ Hook removal failed:'), error);
      process.exit(1);
    }
  });

// Default action - run full suite
program.action(async () => {
  const agent = new QAAgent();
  try {
    const results = await agent.runFullSuite();
    process.exit(results.errors > 0 ? 1 : 0);
  } catch (error) {
    console.error(chalk.red('❌ QA execution failed:'), error);
    process.exit(1);
  }
});

program.parse();