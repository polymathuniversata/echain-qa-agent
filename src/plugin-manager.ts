import path from 'path';
import fse from 'fs-extra';
import { SecurePluginLoader } from './secure-plugin-loader.js';
import { PluginRegistry, PluginRegistryEntry } from './plugin-registry.js';

export interface QAPlugin {
  name: string;
  version: string;
  description?: string;
  run: (qaAgent: any) => Promise<any>;
}

export interface QAResults {
  errors: number;
  warnings: number;
  duration: number;
  timestamp: Date;
}

export class PluginManager {
  private pluginsPath: string;
  private plugins: Map<string, QAPlugin>;
  private pluginConfigs: { [key: string]: any };
  private secureLoader: SecurePluginLoader;
  private qaAgent: any; // Reference to main QAAgent for public methods
  private registry: PluginRegistry;

  constructor(pluginsPath: string, qaAgent: any) {
    this.pluginsPath = pluginsPath;
    this.plugins = new Map();
    this.pluginConfigs = {};
    this.qaAgent = qaAgent;
    this.secureLoader = new SecurePluginLoader(this.pluginsPath, this.qaAgent);
    this.registry = new PluginRegistry();
  }

  async loadPlugins(): Promise<void> {
    try {
      await this.secureLoader.loadPlugins();

      const loadedPlugins = this.secureLoader.getLoadedPlugins();

      // Convert secure plugins to QAPlugin interface
      for (const [name, securePlugin] of loadedPlugins) {
        const plugin: QAPlugin = {
          name: securePlugin.metadata.name,
          version: securePlugin.metadata.version || '1.0.0',
          description: securePlugin.metadata.description,
          run: async () => {
            const context = this.secureLoader.createSecureContext(
              securePlugin.metadata.permissions || []
            );
            return await securePlugin.run(context);
          },
        };

        this.plugins.set(name, plugin);
        console.log(`INFO: Loaded secure plugin: ${name} v${plugin.version}`);
      }

      console.log(`SUCCESS: Loaded ${this.plugins.size} secure plugins`);
    } catch (error) {
      console.log(`WARNING: Secure plugin loading failed: ${error}`);
      this.qaAgent.logPublic('WARNING', `Secure plugin loading failed: ${error}`);
    }
  }

  async runPlugins(): Promise<QAResults> {
    let totalErrors = 0;
    let totalWarnings = 0;
    const startTime = Date.now();

    for (const [name, plugin] of this.plugins) {
      try {
        console.log(`INFO: Running plugin: ${name}`);
        const results = await plugin.run(this.qaAgent);

        totalErrors += results.errors;
        totalWarnings += results.warnings;

        if (results.errors > 0) {
          console.log(`ERROR: Plugin ${name} failed with ${results.errors} errors`);
        } else if (results.warnings > 0) {
          console.log(`WARNING: Plugin ${name} completed with ${results.warnings} warnings`);
        } else {
          console.log(`SUCCESS: Plugin ${name} completed successfully`);
        }
      } catch (error) {
        console.log(`ERROR: Plugin ${name} threw an error: ${error}`);
        totalErrors++;
      }
    }

    return {
      errors: totalErrors,
      warnings: totalWarnings,
      duration: (Date.now() - startTime) / 1000,
      timestamp: new Date(),
    };
  }

  getPlugins(): Map<string, QAPlugin> {
    return this.plugins;
  }

  getPluginCount(): number {
    return this.plugins.size;
  }

  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  getPlugin(name: string): QAPlugin | undefined {
    return this.plugins.get(name);
  }

  // Plugin marketplace functionality
  async getAvailablePlugins(query: string = '', tags: string[] = []): Promise<PluginRegistryEntry[]> {
    try {
      const plugins = await this.registry.searchPlugins(query, tags, 50, 0);

      // Mark installed plugins
      for (const plugin of plugins) {
        const installedPlugin = this.plugins.get(plugin.name);
        if (installedPlugin) {
          plugin.installed = true;
          plugin.installedVersion = installedPlugin.version;
        }
      }

      return plugins;
    } catch (error) {
      console.log(`WARNING: Failed to fetch plugins from registry: ${error}`);
      // Return fallback plugins if registry fails
      return this.registry.getFallbackPlugins().map(plugin => ({
        ...plugin,
        installed: this.plugins.has(plugin.name),
        installedVersion: this.plugins.get(plugin.name)?.version
      }));
    }
  }

  async installPlugin(
    packageName: string
  ): Promise<{ success: boolean; installedPath?: string; error?: string }> {
    console.log(`INFO: Installing ${packageName}...`);

    try {
      // Check plugin compatibility first
      const pluginDetails = await this.registry.getPluginDetails(packageName);
      if (pluginDetails && !this.registry.isPluginCompatible(pluginDetails)) {
        const packageJson = JSON.parse(await fse.readFile(path.join(this.qaAgent.getProjectRoot(), 'package.json'), 'utf-8'));
        const currentVersion = packageJson.version || '2.1.6';
        return {
          success: false,
          error: `Plugin ${packageName} is not compatible with QA Agent v${currentVersion}. Required: ${pluginDetails.compatibility.minVersion}`
        };
      }

      // Run npm install
      const success = await this.qaAgent.runCommandPublic(
        `npm install --save-dev ${packageName}`,
        `Install ${packageName}`
      );
      if (!success) {
        return { success: false, error: 'Installation failed' };
      }

      console.log(`SUCCESS: Package ${packageName} installed successfully`);

      // Reload plugins to include the new one
      await this.loadPlugins();

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async configurePlugin(pluginName: string): Promise<void> {
    console.log(`INFO: Configuring ${pluginName}...`);

    // Get plugin configuration
    const config = await this.getPluginConfig(pluginName);

    if (!config) {
      console.log(`WARNING: No configuration required for ${pluginName}`);
      return;
    }

    // Save plugin configuration
    await this.savePluginConfig(pluginName, config);
    console.log(`SUCCESS: Plugin ${pluginName} configured`);
  }

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

  private async savePluginConfig(pluginName: string, config: any): Promise<void> {
    this.pluginConfigs[pluginName] = config;

    // Save to config file
    const configPath = path.join(this.qaAgent.getProjectRoot(), '.qa-config.json');
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

  listInstalledPlugins(): void {
    console.log('\n📋 Installed Plugins\n');

    if (this.plugins.size === 0) {
      console.log('No plugins installed.');
      console.log('Run "echain-qa marketplace" to browse available plugins.');
      return;
    }

    let index = 1;
    for (const [pluginName, plugin] of this.plugins) {
      console.log(`${index}. ${pluginName}`);
      console.log(`   ${plugin.description || 'No description available'}`);
      console.log(`   Version: ${plugin.version || 'Unknown'}`);
      console.log(
        `   Enabled: ${this.pluginConfigs[pluginName]?.enabled !== false ? 'Yes' : 'No'}`
      );

      // Show plugin-specific config if available
      const config = this.pluginConfigs[pluginName];
      if (config && Object.keys(config).length > 1) {
        // More than just 'enabled'
        console.log(`   Configuration: ${JSON.stringify(config)}`);
      }

      console.log('');
      index++;
    }

    console.log(
      `Total: ${this.plugins.size} plugin${this.plugins.size === 1 ? '' : 's'} installed`
    );
  }
}
