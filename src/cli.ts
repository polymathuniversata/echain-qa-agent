#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { QAAgent } from './qa-agent';

// Read version from package.json
const packageJson = require('../package.json');
const version = packageJson.version;

const program = new Command();

program
  .name('echain-qa')
  .description('🛡️ Quality Assurance Agent - Comprehensive QA automation for blockchain projects')
  .version(version);

program
  .command('run')
  .description('Run full QA suite')
  .option('-d, --dry-run', 'simulate QA checks without actual execution')
  .option('-v, --verbose', 'enable verbose output')
  .option('-q, --quiet', 'suppress non-error output for script wrapping')
  .action(async (options) => {
    const agent = new QAAgent({
      dryRun: options.dryRun,
      verbose: options.verbose,
      quiet: options.quiet
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
  .command('setup')
  .description('Interactive setup wizard for QA configuration')
  .action(async () => {
    const agent = new QAAgent();
    try {
      await agent.runInteractiveSetup();
    } catch (error) {
      console.error(chalk.red('❌ Interactive setup failed:'), error);
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
  .command('wrap-scripts')
  .description('Wrap npm scripts with QA checks')
  .action(async () => {
    const agent = new QAAgent();
    try {
      await agent.wrapScripts();
      console.log(chalk.green('✅ Scripts wrapped successfully'));
      console.log('QA checks will run before build, start, dev, and test commands');
    } catch (error) {
      console.error(chalk.red('❌ Script wrapping failed:'), error);
      process.exit(1);
    }
  });

program
  .command('unwrap-scripts')
  .description('Remove QA checks from wrapped npm scripts')
  .action(async () => {
    const agent = new QAAgent();
    try {
      await agent.unwrapScripts();
      console.log(chalk.green('✅ Scripts unwrapped successfully'));
    } catch (error) {
      console.error(chalk.red('❌ Script unwrapping failed:'), error);
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

program
  .command('plugins')
  .description('Interactive plugin marketplace - browse, search, and install plugins')
  .action(async () => {
    const agent = new QAAgent();
    try {
      await agent.runPluginMarketplace();
    } catch (error) {
      console.error(chalk.red('❌ Plugin marketplace failed:'), error);
      process.exit(1);
    }
  });

program
  .command('install-plugin <pluginName>')
  .description('Install a specific plugin from the registry')
  .action(async (pluginName) => {
    const agent = new QAAgent();
    try {
      console.log(chalk.blue(`\n⬇️ Installing plugin: ${pluginName}`));
      const result = await agent.installPlugin(pluginName);

      if (result.success) {
        console.log(chalk.green(`✅ Plugin '${pluginName}' installed successfully!`));
        if (result.installedPath) {
          console.log(chalk.gray(`Installed at: ${result.installedPath}`));
        }
      } else {
        console.log(chalk.red(`❌ Installation failed: ${result.error}`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Plugin installation failed:'), error);
      process.exit(1);
    }
  });

program
  .command('list-plugins')
  .description('List all installed plugins')
  .action(async () => {
    const agent = new QAAgent();
    try {
      await agent.loadPlugins(); // Load installed plugins
      await agent.listInstalledPlugins();
    } catch (error) {
      console.error(chalk.red('❌ Failed to list plugins:'), error);
      process.exit(1);
    }
  });

program
  .command('troubleshoot')
  .description('Interactive guided troubleshooting for QA issues')
  .action(async () => {
    const agent = new QAAgent();
    try {
      await agent.runGuidedTroubleshooting();
    } catch (error) {
      console.error(chalk.red('❌ Troubleshooting failed:'), error);
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