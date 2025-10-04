#!/usr/bin/env bun

import { Command } from 'commander';
import chalk from 'chalk';
import { QAAgent } from './qa-agent';

const program = new Command();

program
  .name('echain-qa')
  .description('🛡️ Echain Quality Assurance Agent - Comprehensive QA automation for blockchain projects')
  .version('2.0.0');

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