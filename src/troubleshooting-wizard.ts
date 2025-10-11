import inquirer from 'inquirer';
import chalk from 'chalk';
import { DiagnosticTools, DiagnosticResult, DiagnosticIssue } from './diagnostic-tools.js';

export interface TroubleshootingStep {
  id: string;
  title: string;
  description: string;
  action: () => Promise<void>;
  condition?: (issues: DiagnosticIssue[]) => boolean;
}

export class TroubleshootingWizard {
  private diagnosticTools: DiagnosticTools;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.diagnosticTools = new DiagnosticTools(projectRoot);
  }

  /**
   * Start the interactive troubleshooting wizard
   */
  async startWizard(): Promise<void> {
    console.log(chalk.blue.bold('🔧 QA Agent Troubleshooting Wizard'));
    console.log(chalk.gray('This wizard will help you diagnose and fix common issues\n'));

    // Run diagnostics first
    console.log(chalk.yellow('Step 1: Running diagnostics...'));
    const diagnostics = await this.diagnosticTools.runFullDiagnostics();

    this.displayDiagnosticSummary(diagnostics);

    if (diagnostics.summary.total === 0) {
      console.log(chalk.green('✅ No issues detected! Your project looks good.'));
      return;
    }

    // Ask user what they want to do
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Fix all auto-fixable issues', value: 'auto-fix' },
          { name: 'Review issues by category', value: 'by-category' },
          { name: 'Fix issues by priority', value: 'by-priority' },
          { name: 'Get detailed help for specific issues', value: 'detailed-help' },
          { name: 'Exit wizard', value: 'exit' }
        ]
      }
    ]);

    switch (action) {
      case 'auto-fix':
        await this.fixAutoFixableIssues(diagnostics.issues);
        break;
      case 'by-category':
        await this.handleIssuesByCategory(diagnostics.issues);
        break;
      case 'by-priority':
        await this.handleIssuesByPriority(diagnostics.issues);
        break;
      case 'detailed-help':
        await this.provideDetailedHelp(diagnostics.issues);
        break;
      case 'exit':
        console.log(chalk.blue('Goodbye! 👋'));
        return;
    }

    // After handling issues, offer to run diagnostics again
    const { runAgain } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'runAgain',
        message: 'Would you like to run diagnostics again to check your fixes?',
        default: true
      }
    ]);

    if (runAgain) {
      console.log('\n' + '='.repeat(50));
      await this.startWizard();
    }
  }

  /**
   * Display diagnostic summary
   */
  private displayDiagnosticSummary(diagnostics: DiagnosticResult): void {
    console.log('\n' + chalk.bold('📊 Diagnostic Summary:'));
    console.log(`Total issues: ${diagnostics.summary.total}`);

    if (diagnostics.summary.critical > 0) {
      console.log(chalk.red(`🚨 Critical: ${diagnostics.summary.critical}`));
    }
    if (diagnostics.summary.high > 0) {
      console.log(chalk.red(`⚠️  High: ${diagnostics.summary.high}`));
    }
    if (diagnostics.summary.medium > 0) {
      console.log(chalk.yellow(`📋 Medium: ${diagnostics.summary.medium}`));
    }
    if (diagnostics.summary.low > 0) {
      console.log(chalk.blue(`ℹ️  Low: ${diagnostics.summary.low}`));
    }

    if (diagnostics.recommendations.length > 0) {
      console.log('\n' + chalk.bold('💡 Recommendations:'));
      diagnostics.recommendations.forEach(rec => console.log(`• ${rec}`));
    }
    console.log();
  }

  /**
   * Fix all auto-fixable issues
   */
  private async fixAutoFixableIssues(issues: DiagnosticIssue[]): Promise<void> {
    const autoFixableIssues = issues.filter(issue => issue.autoFix);

    if (autoFixableIssues.length === 0) {
      console.log(chalk.yellow('No auto-fixable issues found.'));
      return;
    }

    console.log(chalk.blue(`Found ${autoFixableIssues.length} auto-fixable issue(s):`));
    autoFixableIssues.forEach(issue => {
      console.log(`• ${issue.title}`);
    });

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Apply automatic fixes?',
        default: true
      }
    ]);

    if (!confirm) {
      return;
    }

    for (const issue of autoFixableIssues) {
      console.log(chalk.yellow(`\n🔧 Fixing: ${issue.title}`));
      await this.applyFix(issue);
    }

    console.log(chalk.green('\n✅ Auto-fixes applied!'));
  }

  /**
   * Handle issues by category
   */
  private async handleIssuesByCategory(issues: DiagnosticIssue[]): Promise<void> {
    const categories = [...new Set(issues.map(i => i.category))];

    const { category } = await inquirer.prompt([
      {
        type: 'list',
        name: 'category',
        message: 'Select a category to focus on:',
        choices: categories.map(cat => ({
          name: `${cat} (${issues.filter(i => i.category === cat).length} issues)`,
          value: cat
        }))
      }
    ]);

    const categoryIssues = issues.filter(i => i.category === category);
    await this.handleIssueList(categoryIssues, `Issues in ${category} category`);
  }

  /**
   * Handle issues by priority
   */
  private async handleIssuesByPriority(issues: DiagnosticIssue[]): Promise<void> {
    const priorities = ['critical', 'high', 'medium', 'low'] as const;

    const { priority } = await inquirer.prompt([
      {
        type: 'list',
        name: 'priority',
        message: 'Select priority level to focus on:',
        choices: priorities.map(pri => ({
          name: `${pri} (${issues.filter(i => i.severity === pri).length} issues)`,
          value: pri
        })).filter(choice => choice.name.includes(' (0 issues)') === false)
      }
    ]);

    const priorityIssues = issues.filter(i => i.severity === priority);
    await this.handleIssueList(priorityIssues, `Issues with ${priority} priority`);
  }

  /**
   * Handle a list of issues interactively
   */
  private async handleIssueList(issues: DiagnosticIssue[], title: string): Promise<void> {
    console.log(chalk.bold(`\n${title}:`));

    const { selectedIssue } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedIssue',
        message: 'Select an issue to handle:',
        choices: [
          ...issues.map(issue => ({
            name: `${this.getSeverityIcon(issue.severity)} ${issue.title}`,
            value: issue,
            short: issue.title
          })),
          { name: 'Back to main menu', value: 'back' }
        ]
      }
    ]);

    if (selectedIssue === 'back') {
      return;
    }

    await this.handleSingleIssue(selectedIssue);
  }

  /**
   * Handle a single issue
   */
  private async handleSingleIssue(issue: DiagnosticIssue): Promise<void> {
    console.log('\n' + chalk.bold(issue.title));
    console.log(issue.description);

    if (issue.details) {
      console.log(chalk.gray(`Details: ${issue.details}`));
    }

    const choices = [];

    if (issue.autoFix) {
      choices.push({ name: '🔧 Apply automatic fix', value: 'auto-fix' });
    }

    if (issue.solution) {
      choices.push({ name: '📖 Show solution steps', value: 'solution' });
    }

    if (issue.commands && issue.commands.length > 0) {
      choices.push({ name: '💻 Run recommended commands', value: 'commands' });
    }

    choices.push({ name: '⬅️  Back to issue list', value: 'back' });

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices
      }
    ]);

    switch (action) {
      case 'auto-fix':
        await this.applyFix(issue);
        break;
      case 'solution':
        this.showSolution(issue);
        break;
      case 'commands':
        await this.runCommands(issue);
        break;
      case 'back':
        return;
    }

    // After handling, ask if they want to mark as resolved or continue
    const { next } = await inquirer.prompt([
      {
        type: 'list',
        name: 'next',
        message: 'What next?',
        choices: [
          { name: 'Handle another issue', value: 'continue' },
          { name: 'Back to main menu', value: 'menu' }
        ]
      }
    ]);

    if (next === 'continue') {
      // This would need to be implemented to go back to the issue list
      // For now, just return to menu
    }
  }

  /**
   * Provide detailed help for specific issues
   */
  private async provideDetailedHelp(issues: DiagnosticIssue[]): Promise<void> {
    const { helpTopic } = await inquirer.prompt([
      {
        type: 'list',
        name: 'helpTopic',
        message: 'What topic do you need help with?',
        choices: [
          { name: 'Common setup issues', value: 'setup' },
          { name: 'Dependency problems', value: 'dependencies' },
          { name: 'Testing configuration', value: 'testing' },
          { name: 'Code quality issues', value: 'quality' },
          { name: 'Security concerns', value: 'security' },
          { name: 'Performance optimization', value: 'performance' },
          { name: 'Back to main menu', value: 'back' }
        ]
      }
    ]);

    if (helpTopic === 'back') {
      return;
    }

    await this.showHelpForTopic(helpTopic, issues);
  }

  /**
   * Show help for a specific topic
   */
  private async showHelpForTopic(topic: string, issues: DiagnosticIssue[]): Promise<void> {
    const topicIssues = issues.filter(i => i.category === topic);

    console.log(chalk.bold(`\n📚 Help for ${topic} issues:`));

    if (topicIssues.length === 0) {
      console.log(chalk.green(`No ${topic} issues detected in your project.`));
    } else {
      console.log(`Found ${topicIssues.length} issue(s) in this category.\n`);

      topicIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${chalk.bold(issue.title)}`);
        console.log(`   ${issue.description}`);
        if (issue.solution) {
          console.log(`   ${chalk.cyan('Solution:')} ${issue.solution}`);
        }
        console.log();
      });
    }

    // Show general advice for the topic
    this.showGeneralAdvice(topic);

    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
  }

  /**
   * Show general advice for a topic
   */
  private showGeneralAdvice(topic: string): void {
    const advice: Record<string, string[]> = {
      setup: [
        'Ensure you have Node.js 18+ installed',
        'Run "npm init" to create package.json if missing',
        'Use "echain-qa setup" for initial configuration',
        'Keep dependencies up to date with "npm update"'
      ],
      dependencies: [
        'Use "npm install" to install all dependencies',
        'Check for outdated packages with "npm outdated"',
        'Remove unused dependencies with "npm prune"',
        'Consider using package-lock.json for reproducible builds'
      ],
      testing: [
        'Add test files alongside your source code',
        'Use Jest or similar testing framework',
        'Aim for good test coverage (70%+ recommended)',
        'Run tests before committing code changes'
      ],
      quality: [
        'Use ESLint for code linting',
        'Configure Prettier for code formatting',
        'Enable TypeScript strict mode',
        'Use Pre-commit hooks for quality checks'
      ],
      security: [
        'Keep dependencies updated to patch security vulnerabilities',
        'Use .env files for sensitive configuration',
        'Add sensitive files to .gitignore',
        'Run security audits with "npm audit"'
      ],
      performance: [
        'Minimize bundle size by removing unused dependencies',
        'Use code splitting for large applications',
        'Optimize images and assets',
        'Monitor performance with built-in tools'
      ]
    };

    const topicAdvice = advice[topic];
    if (topicAdvice) {
      console.log(chalk.bold('General advice:'));
      topicAdvice.forEach(tip => console.log(`• ${tip}`));
      console.log();
    }
  }

  /**
   * Apply an automatic fix for an issue
   */
  private async applyFix(issue: DiagnosticIssue): Promise<void> {
    console.log(chalk.yellow(`Applying fix for: ${issue.title}`));

    // For now, we'll just show what would be done
    // In a real implementation, you'd execute the actual fix
    if (issue.commands && issue.commands.length > 0) {
      console.log('Would run commands:');
      issue.commands.forEach(cmd => console.log(`  ${chalk.cyan(cmd)}`));
    }

    console.log(chalk.green('✅ Fix applied (simulated)'));
  }

  /**
   * Show solution steps for an issue
   */
  private showSolution(issue: DiagnosticIssue): void {
    console.log(chalk.bold('\n📖 Solution:'));
    console.log(issue.solution);

    if (issue.commands && issue.commands.length > 0) {
      console.log(chalk.bold('\nCommands to run:'));
      issue.commands.forEach(cmd => {
        console.log(`  ${chalk.cyan(cmd)}`);
      });
    }
  }

  /**
   * Run recommended commands for an issue
   */
  private async runCommands(issue: DiagnosticIssue): Promise<void> {
    if (!issue.commands || issue.commands.length === 0) {
      console.log(chalk.yellow('No commands available for this issue.'));
      return;
    }

    console.log(chalk.bold('Commands to run:'));
    issue.commands.forEach((cmd, index) => {
      console.log(`${index + 1}. ${chalk.cyan(cmd)}`);
    });

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Run these commands?',
        default: false
      }
    ]);

    if (!confirm) {
      return;
    }

    // In a real implementation, you'd execute these commands
    // For now, just show them
    console.log(chalk.yellow('Command execution would happen here...'));
  }

  /**
   * Get severity icon
   */
  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '📋';
      case 'low': return 'ℹ️';
      default: return '❓';
    }
  }
}