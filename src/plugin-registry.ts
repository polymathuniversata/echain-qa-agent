import { promises as fs } from 'fs';
import path from 'path';
import { fetch } from 'undici';

export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  tags: string[];
  packageName: string;
  homepage?: string;
  repository?: string;
  license?: string;
  compatibility: {
    minVersion: string;
    maxVersion?: string;
    nodeVersion: string;
  };
  dependencies?: { [key: string]: string };
  peerDependencies?: { [key: string]: string };
  keywords: string[];
  downloads: number;
  rating: number;
  lastUpdated: string;
  readme?: string;
}

export interface PluginRegistryEntry extends PluginMetadata {
  installed?: boolean;
  installedVersion?: string;
  compatible?: boolean;
}

export class PluginRegistry {
  private registryUrl: string;
  private cachePath: string;
  private cacheExpiry: number; // in milliseconds
  private qaAgentVersion: string;

  constructor(
    registryUrl: string = 'https://registry.npmjs.org/-/v1/search',
    cachePath: string = path.join(process.cwd(), '.qa-cache'),
    qaAgentVersion: string = '2.1.6'
  ) {
    this.registryUrl = registryUrl;
    this.cachePath = cachePath;
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    this.qaAgentVersion = qaAgentVersion;
  }

  /**
   * Search for plugins in the registry
   */
  async searchPlugins(
    query: string = '',
    tags: string[] = [],
    limit: number = 50,
    offset: number = 0
  ): Promise<PluginRegistryEntry[]> {
    try {
      // Check cache first
      const cached = await this.getCachedResults(query, tags, limit, offset);
      if (cached) {
        return cached;
      }

      // Build search query for npm registry
      const searchTerms = [
        'echain-qa-plugin',
        'qa-plugin',
        query
      ].filter(Boolean);

      const searchQuery = searchTerms.join(' ');
      const url = `${this.registryUrl}?text=${encodeURIComponent(searchQuery)}&size=${limit}&from=${offset}`;

      console.log(`INFO: Searching plugin registry: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Registry search failed: ${response.status}`);
      }

      const data = await response.json() as any;

      // Transform npm registry results to our format
      const plugins: PluginRegistryEntry[] = data.objects.map((obj: any) => {
        const pkg = obj.package;
        const plugin: PluginRegistryEntry = {
          name: pkg.name.replace('@echain/', '').replace('echain-qa-plugin-', ''),
          version: pkg.version,
          description: pkg.description || '',
          author: typeof pkg.author === 'string' ? pkg.author : pkg.author?.name || 'Unknown',
          tags: pkg.keywords || [],
          packageName: pkg.name,
          homepage: pkg.homepage,
          repository: pkg.repository?.url || pkg.repository,
          license: pkg.license,
          compatibility: {
            minVersion: '2.0.0', // Default compatibility
            nodeVersion: pkg.engines?.node || '>=16.0.0'
          },
          dependencies: pkg.dependencies || {},
          peerDependencies: pkg.peerDependencies || {},
          keywords: pkg.keywords || [],
          downloads: 0, // Would need separate API call for download stats
          rating: 0, // Would need separate API for ratings
          lastUpdated: pkg.date || new Date().toISOString(),
          readme: pkg.readme
        };

        return plugin;
      });

      // Filter and enhance with compatibility info
      const enhancedPlugins = await this.enhanceWithCompatibility(plugins);

      // Cache the results
      await this.cacheResults(query, tags, limit, offset, enhancedPlugins);

      return enhancedPlugins;
    } catch (error) {
      console.log(`WARNING: Plugin search failed: ${error}`);
      return this.getFallbackPlugins();
    }
  }

  /**
   * Get detailed information about a specific plugin
   */
  async getPluginDetails(packageName: string): Promise<PluginMetadata | null> {
    try {
      const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const pkg = await response.json() as any;
      const latestVersion = pkg['dist-tags']?.latest || Object.keys(pkg.versions).pop();

      if (!latestVersion || !pkg.versions[latestVersion]) {
        return null;
      }

      const versionData = pkg.versions[latestVersion];

      const plugin: PluginMetadata = {
        name: packageName.replace('@echain/', '').replace('echain-qa-plugin-', ''),
        version: latestVersion,
        description: versionData.description || '',
        author: typeof versionData.author === 'string' ? versionData.author : versionData.author?.name || 'Unknown',
        tags: versionData.keywords || [],
        packageName: packageName,
        homepage: versionData.homepage,
        repository: versionData.repository?.url || versionData.repository,
        license: versionData.license,
        compatibility: {
          minVersion: versionData.peerDependencies?.['echain-qa-agent']?.replace('>=', '') || '2.0.0',
          nodeVersion: versionData.engines?.node || '>=16.0.0'
        },
        dependencies: versionData.dependencies || {},
        peerDependencies: versionData.peerDependencies || {},
        keywords: versionData.keywords || [],
        downloads: 0, // Would need separate API
        rating: 0, // Would need separate API
        lastUpdated: versionData._npmUser?.ctime || pkg.time?.[latestVersion] || new Date().toISOString(),
        readme: versionData.readme
      };

      return plugin;
    } catch (error) {
      console.log(`WARNING: Failed to get plugin details for ${packageName}: ${error}`);
      return null;
    }
  }

  /**
   * Check if a plugin is compatible with the current QA agent version
   */
  isPluginCompatible(plugin: PluginMetadata): boolean {
    try {
      const minVersion = plugin.compatibility.minVersion.replace('>=', '').replace('^', '');
      const maxVersion = plugin.compatibility.maxVersion?.replace('<', '');

      const currentVersion = this.qaAgentVersion;
      const minCompatible = this.compareVersions(currentVersion, minVersion) >= 0;

      let maxCompatible = true;
      if (maxVersion) {
        maxCompatible = this.compareVersions(currentVersion, maxVersion) < 0;
      }

      return minCompatible && maxCompatible;
    } catch (error) {
      console.log(`WARNING: Compatibility check failed for ${plugin.name}: ${error}`);
      return false;
    }
  }

  /**
   * Get popular/trending plugins
   */
  async getPopularPlugins(limit: number = 10): Promise<PluginRegistryEntry[]> {
    // Search for plugins with high download counts or ratings
    const plugins = await this.searchPlugins('', [], limit * 2, 0);

    // Sort by a combination of factors (downloads, rating, recency)
    return plugins
      .sort((a, b) => {
        const scoreA = (a.downloads * 0.5) + (a.rating * 0.3) + (this.getRecencyScore(a.lastUpdated) * 0.2);
        const scoreB = (b.downloads * 0.5) + (b.rating * 0.3) + (this.getRecencyScore(b.lastUpdated) * 0.2);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Get plugins by category/tag
   */
  async getPluginsByCategory(category: string, limit: number = 20): Promise<PluginRegistryEntry[]> {
    return await this.searchPlugins(category, [category], limit, 0);
  }

  private async enhanceWithCompatibility(plugins: PluginRegistryEntry[]): Promise<PluginRegistryEntry[]> {
    return plugins.map(plugin => ({
      ...plugin,
      compatible: this.isPluginCompatible(plugin)
    }));
  }

  private getRecencyScore(lastUpdated: string): number {
    try {
      const updated = new Date(lastUpdated);
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);

      // More recent = higher score (max 1.0 for today, decreasing over time)
      return Math.max(0, 1 - (daysSinceUpdate / 365)); // 1 year decay
    } catch {
      return 0;
    }
  }

  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part > v2Part) {
        return 1;
      }
      if (v1Part < v2Part) {
        return -1;
      }
    }

    return 0;
  }

  private async getCachedResults(
    query: string,
    tags: string[],
    limit: number,
    offset: number
  ): Promise<PluginRegistryEntry[] | null> {
    try {
      const cacheKey = this.getCacheKey(query, tags, limit, offset);
      const cacheFile = path.join(this.cachePath, `${cacheKey}.json`);

      const stats = await fs.stat(cacheFile);
      const isExpired = Date.now() - stats.mtime.getTime() > this.cacheExpiry;

      if (isExpired) {
        return null;
      }

      const cachedData = JSON.parse(await fs.readFile(cacheFile, 'utf-8'));
      return cachedData.plugins;
    } catch {
      return null;
    }
  }

  private async cacheResults(
    query: string,
    tags: string[],
    limit: number,
    offset: number,
    plugins: PluginRegistryEntry[]
  ): Promise<void> {
    try {
      await fs.mkdir(this.cachePath, { recursive: true });
      const cacheKey = this.getCacheKey(query, tags, limit, offset);
      const cacheFile = path.join(this.cachePath, `${cacheKey}.json`);

      const cacheData = {
        query,
        tags,
        limit,
        offset,
        timestamp: Date.now(),
        plugins
      };

      await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      console.log(`WARNING: Failed to cache plugin results: ${error}`);
    }
  }

  private getCacheKey(query: string, tags: string[], limit: number, offset: number): string {
    const tagStr = tags.sort().join(',');
    return `search_${query}_${tagStr}_${limit}_${offset}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Get fallback plugins when registry is unavailable
   */
  getFallbackPlugins(): PluginRegistryEntry[] {
    return this.getFallbackPluginsPrivate();
  }

  private getFallbackPluginsPrivate(): PluginRegistryEntry[] {
    // Return some known good plugins when registry is unavailable
    return [
      {
        name: 'security-scan',
        version: '1.0.0',
        description: 'Advanced security vulnerability scanning',
        author: 'Echain Team',
        tags: ['security', 'vulnerability'],
        packageName: '@echain/qa-plugin-security',
        compatibility: { minVersion: '2.0.0', nodeVersion: '>=16.0.0' },
        keywords: ['security', 'scanning', 'vulnerability'],
        downloads: 1000,
        rating: 4.5,
        lastUpdated: new Date().toISOString(),
        compatible: true
      },
      {
        name: 'performance-monitor',
        version: '1.0.0',
        description: 'Performance monitoring and optimization checks',
        author: 'Echain Team',
        tags: ['performance', 'optimization'],
        packageName: '@echain/qa-plugin-performance',
        compatibility: { minVersion: '2.0.0', nodeVersion: '>=16.0.0' },
        keywords: ['performance', 'monitoring', 'optimization'],
        downloads: 800,
        rating: 4.2,
        lastUpdated: new Date().toISOString(),
        compatible: true
      },
      {
        name: 'accessibility-checker',
        version: '1.0.0',
        description: 'Web accessibility compliance testing',
        author: 'Echain Team',
        tags: ['accessibility', 'a11y'],
        packageName: '@echain/qa-plugin-accessibility',
        compatibility: { minVersion: '2.0.0', nodeVersion: '>=16.0.0' },
        keywords: ['accessibility', 'a11y', 'compliance'],
        downloads: 600,
        rating: 4.0,
        lastUpdated: new Date().toISOString(),
        compatible: true
      },
      {
        name: 'code-coverage',
        version: '1.0.0',
        description: 'Enhanced code coverage reporting',
        author: 'Echain Team',
        tags: ['coverage', 'testing'],
        packageName: '@echain/qa-plugin-coverage',
        compatibility: { minVersion: '2.0.0', nodeVersion: '>=16.0.0' },
        keywords: ['coverage', 'testing', 'reporting'],
        downloads: 900,
        rating: 4.3,
        lastUpdated: new Date().toISOString(),
        compatible: true
      }
    ];
  }
}