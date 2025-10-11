import inquirer from 'inquirer';
import chalk from 'chalk';
import { PluginManager } from './plugin-manager.js';
import { PluginRegistryEntry } from './plugin-registry.js';

export interface PluginBrowserOptions {
  manager: PluginManager;
  autoInstall?: boolean;
  showDetails?: boolean;
}

export class PluginBrowser {
  private manager: PluginManager;
  private autoInstall: boolean;
  private showDetails: boolean;

  constructor(options: PluginBrowserOptions) {
    this.manager = options.manager;
    this.autoInstall = options.autoInstall || false;
    this.showDetails = options.showDetails || false;
  }

  /**
   * Start the interactive plugin browser
   */
  async browse(): Promise<void> {
    console.log(chalk.bold.blue('\n🔌 Plugin Marketplace\n'));

    while (true) {  // eslint-disable-line no-constant-condition
      const action = await this.showMainMenu();

      switch (action) {
        case 'search':
          await this.searchPlugins();
          break;
        case 'categories':
          await this.browseCategories();
          break;
        case 'popular':
          await this.showPopularPlugins();
          break;
        case 'installed':
          await this.showInstalledPlugins();
          break;
        case 'exit':
          return;
      }
    }
  }

  /**
   * Show the main menu
   */
  private async showMainMenu(): Promise<string> {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🔍 Search plugins', value: 'search' },
          { name: '📂 Browse by category', value: 'categories' },
          { name: '⭐ Popular plugins', value: 'popular' },
          { name: '📦 Installed plugins', value: 'installed' },
          { name: '❌ Exit', value: 'exit' }
        ]
      }
    ]);

    return action;
  }

  /**
   * Search for plugins
   */
  private async searchPlugins(): Promise<void> {
    const { query } = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: 'Enter search terms (leave empty for all plugins):',
        validate: (input) => input.length <= 100 || 'Search query too long'
      }
    ]);

    const { tags } = await inquirer.prompt([
      {
        type: 'input',
        name: 'tags',
        message: 'Filter by tags (comma-separated, optional):',
        filter: (input) => input.split(',').map((tag: string) => tag.trim()).filter(Boolean)
      }
    ]);

    console.log(chalk.yellow(`\nSearching for plugins${query ? ` matching "${query}"` : ''}...`));

    const plugins = await this.manager.getAvailablePlugins(query, tags);

    if (plugins.length === 0) {
      console.log(chalk.red('No plugins found matching your criteria.'));
      return;
    }

    await this.displayPluginList(plugins, `Search results for "${query || 'all plugins'}"`);
  }

  /**
   * Browse plugins by category
   */
  private async browseCategories(): Promise<void> {
    const categories = [
      'security',
      'performance',
      'testing',
      'accessibility',
      'code-quality',
      'documentation',
      'deployment',
      'monitoring'
    ];

    const { category } = await inquirer.prompt([
      {
        type: 'list',
        name: 'category',
        message: 'Select a category:',
        choices: categories.map(cat => ({ name: this.formatCategoryName(cat), value: cat }))
      }
    ]);

    console.log(chalk.yellow(`\nLoading ${this.formatCategoryName(category)} plugins...`));

    const plugins = await this.manager.getAvailablePlugins('', [category]);

    if (plugins.length === 0) {
      console.log(chalk.red(`No plugins found in the ${category} category.`));
      return;
    }

    await this.displayPluginList(plugins, `${this.formatCategoryName(category)} Plugins`);
  }

  /**
   * Show popular plugins
   */
  private async showPopularPlugins(): Promise<void> {
    console.log(chalk.yellow('\nLoading popular plugins...'));

    // For now, just show all plugins sorted by some criteria
    const plugins = await this.manager.getAvailablePlugins();

    if (plugins.length === 0) {
      console.log(chalk.red('No plugins available.'));
      return;
    }

    // Sort by a popularity score (downloads + rating + recency)
    const sortedPlugins = plugins
      .sort((a, b) => {
        const scoreA = (a.downloads || 0) + (a.rating || 0) * 10;
        const scoreB = (b.downloads || 0) + (b.rating || 0) * 10;
        return scoreB - scoreA;
      })
      .slice(0, 10);

    await this.displayPluginList(sortedPlugins, 'Popular Plugins');
  }

  /**
   * Show installed plugins
   */
  private async showInstalledPlugins(): Promise<void> {
    const plugins = await this.manager.getAvailablePlugins();
    const installedPlugins = plugins.filter(p => p.installed);

    if (installedPlugins.length === 0) {
      console.log(chalk.yellow('\nNo plugins installed.'));
      console.log('Run the plugin browser to discover and install plugins.');
      return;
    }

    console.log(chalk.bold.green('\n📦 Installed Plugins\n'));

    installedPlugins.forEach((plugin, index) => {
      console.log(`${index + 1}. ${chalk.bold(plugin.name)}`);
      console.log(`   ${plugin.description}`);
      console.log(`   Version: ${plugin.installedVersion || plugin.version}`);
      console.log(`   Author: ${plugin.author}`);
      if (plugin.tags && plugin.tags.length > 0) {
        console.log(`   Tags: ${plugin.tags.join(', ')}`);
      }
      console.log('');
    });

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🔄 Update all plugins', value: 'update' },
          { name: '⚙️  Configure plugins', value: 'configure' },
          { name: '🗑️  Uninstall plugins', value: 'uninstall' },
          { name: '⬅️  Back to main menu', value: 'back' }
        ]
      }
    ]);

    switch (action) {
      case 'update':
        await this.updatePlugins(installedPlugins);
        break;
      case 'configure':
        await this.configurePlugins(installedPlugins);
        break;
      case 'uninstall':
        await this.uninstallPlugins(installedPlugins);
        break;
    }
  }

  /**
   * Display a list of plugins and handle selection
   */
  private async displayPluginList(plugins: PluginRegistryEntry[], title: string): Promise<void> {
    console.log(chalk.bold.cyan(`\n${title}\n`));

    const choices = plugins.map((plugin, index) => ({
      name: this.formatPluginChoice(plugin, index),
      value: plugin,
      short: plugin.name
    }));

    const { selectedPlugin } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedPlugin',
        message: 'Select a plugin to view details:',
        choices: [
          ...choices,
          { name: chalk.gray('⬅️  Back to main menu'), value: 'back' }
        ],
        pageSize: 15
      }
    ]);

    if (selectedPlugin === 'back') {
      return;
    }

    await this.showPluginDetails(selectedPlugin);
  }

  /**
   * Show detailed information about a plugin
   */
  private async showPluginDetails(plugin: PluginRegistryEntry): Promise<void> {
    console.log(chalk.bold.blue(`\n📋 Plugin Details: ${plugin.name}\n`));

    console.log(`${chalk.bold('Description:')} ${plugin.description}`);
    console.log(`${chalk.bold('Version:')} ${plugin.version}`);
    console.log(`${chalk.bold('Author:')} ${plugin.author}`);
    console.log(`${chalk.bold('Package:')} ${plugin.packageName}`);

    if (plugin.tags && plugin.tags.length > 0) {
      console.log(`${chalk.bold('Tags:')} ${plugin.tags.join(', ')}`);
    }

    if (plugin.compatibility) {
      const compatible = plugin.compatible !== false;
      const compatText = compatible ? chalk.green('✅ Compatible') : chalk.red('❌ Not compatible');
      console.log(`${chalk.bold('Compatibility:')} ${compatText}`);
      console.log(`  Requires QA Agent: ${plugin.compatibility.minVersion}+`);
    }

    if (plugin.downloads) {
      console.log(`${chalk.bold('Downloads:')} ${plugin.downloads.toLocaleString()}`);
    }

    if (plugin.rating) {
      console.log(`${chalk.bold('Rating:')} ${'⭐'.repeat(Math.floor(plugin.rating))} (${plugin.rating})`);
    }

    if (plugin.homepage) {
      console.log(`${chalk.bold('Homepage:')} ${plugin.homepage}`);
    }

    if (plugin.repository) {
      console.log(`${chalk.bold('Repository:')} ${plugin.repository}`);
    }

    if (plugin.installed) {
      console.log(chalk.green(`\n✅ This plugin is installed (v${plugin.installedVersion})`));
    }

    console.log('');

    const actions = plugin.installed
      ? [
          { name: '🔄 Update plugin', value: 'update' },
          { name: '⚙️  Configure plugin', value: 'configure' },
          { name: '🗑️  Uninstall plugin', value: 'uninstall' },
          { name: '⬅️  Back', value: 'back' }
        ]
      : [
          { name: '📦 Install plugin', value: 'install' },
          { name: '⬅️  Back', value: 'back' }
        ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: actions
      }
    ]);

    switch (action) {
      case 'install':
        await this.installPlugin(plugin);
        break;
      case 'update':
        await this.updatePlugin(plugin);
        break;
      case 'configure':
        await this.configurePlugin(plugin);
        break;
      case 'uninstall':
        await this.uninstallPlugin(plugin);
        break;
    }
  }

  /**
   * Install a plugin
   */
  private async installPlugin(plugin: PluginRegistryEntry): Promise<void> {
    console.log(chalk.yellow(`\nInstalling ${plugin.name}...`));

    const result = await this.manager.installPlugin(plugin.packageName);

    if (result.success) {
      console.log(chalk.green(`✅ Successfully installed ${plugin.name}!`));

      if (this.autoInstall) {
        await this.configurePlugin(plugin);
      }
    } else {
      console.log(chalk.red(`❌ Failed to install ${plugin.name}: ${result.error}`));
    }

    await this.waitForKeyPress();
  }

  /**
   * Update a plugin
   */
  private async updatePlugin(plugin: PluginRegistryEntry): Promise<void> {
    console.log(chalk.yellow(`\nUpdating ${plugin.name}...`));

    const result = await this.manager.installPlugin(plugin.packageName);

    if (result.success) {
      console.log(chalk.green(`✅ Successfully updated ${plugin.name}!`));
    } else {
      console.log(chalk.red(`❌ Failed to update ${plugin.name}: ${result.error}`));
    }

    await this.waitForKeyPress();
  }

  /**
   * Configure a plugin
   */
  private async configurePlugin(plugin: PluginRegistryEntry): Promise<void> {
    console.log(chalk.yellow(`\nConfiguring ${plugin.name}...`));

    try {
      await this.manager.configurePlugin(plugin.name);
      console.log(chalk.green(`✅ Successfully configured ${plugin.name}!`));
    } catch (error: any) {
      console.log(chalk.red(`❌ Failed to configure ${plugin.name}: ${error.message}`));
    }

    await this.waitForKeyPress();
  }

  /**
   * Uninstall a plugin
   */
  private async uninstallPlugin(plugin: PluginRegistryEntry): Promise<void> {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to uninstall ${plugin.name}?`,
        default: false
      }
    ]);

    if (!confirm) {
      return;
    }

    console.log(chalk.yellow(`\nUninstalling ${plugin.name}...`));

    // This would need to be implemented in PluginManager
    console.log(chalk.red(`❌ Uninstall functionality not yet implemented`));

    await this.waitForKeyPress();
  }

  /**
   * Update all installed plugins
   */
  private async updatePlugins(plugins: PluginRegistryEntry[]): Promise<void> {
    console.log(chalk.yellow('\nUpdating all installed plugins...'));

    for (const plugin of plugins) {
      await this.updatePlugin(plugin);
    }

    console.log(chalk.green('✅ All plugins updated!'));
    await this.waitForKeyPress();
  }

  /**
   * Configure installed plugins
   */
  private async configurePlugins(plugins: PluginRegistryEntry[]): Promise<void> {
    for (const plugin of plugins) {
      await this.configurePlugin(plugin);
    }
  }

  /**
   * Uninstall plugins (not yet implemented)
   */
  private async uninstallPlugins(_plugins: PluginRegistryEntry[]): Promise<void> {
    console.log(chalk.red('\n❌ Uninstall functionality not yet implemented'));
    await this.waitForKeyPress();
  }

  /**
   * Format plugin choice for display
   */
  private formatPluginChoice(plugin: PluginRegistryEntry, index: number): string {
    const installed = plugin.installed ? chalk.green(' [INSTALLED]') : '';
    const compatible = plugin.compatible === false ? chalk.red(' [INCOMPATIBLE]') : '';
    const rating = plugin.rating ? ` ⭐${plugin.rating.toFixed(1)}` : '';
    const downloads = plugin.downloads ? ` 📥${plugin.downloads.toLocaleString()}` : '';

    return `${index + 1}. ${chalk.bold(plugin.name)}${installed}${compatible}${rating}${downloads}\n   ${plugin.description}`;
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    return category.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  /**
   * Wait for user to press a key
   */
  private async waitForKeyPress(): Promise<void> {
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...'
      }
    ]);
  }
}