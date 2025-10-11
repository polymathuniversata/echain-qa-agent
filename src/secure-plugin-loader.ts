#!/usr/bin/env node

import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import { QAAgent } from './qa-agent.js';

// Secure Plugin Interface - defines what plugins can safely access
export interface SecurePluginContext {
  // Read-only access to project information
  readonly projectRoot: string;
  readonly projectType: string;
  readonly frameworks: string[];

  // Safe logging (with redaction)
  log: (level: 'INFO' | 'WARNING' | 'ERROR', message: string) => void;

  // Safe file operations (limited to project directory)
  readFile: (filePath: string) => Promise<string>;
  listFiles: (dirPath: string) => Promise<string[]>;
  fileExists: (filePath: string) => Promise<boolean>;

  // Safe command execution (with restrictions)
  runCommand: (command: string, description: string, timeout?: number) => Promise<boolean>;

  // Configuration access (read-only)
  getConfig: () => Promise<any>;
}

// Plugin metadata for validation
export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  engines?: {
    node?: string;
    qaAgent?: string;
  };
  permissions?: PluginPermission[];
  checksum?: string;
}

// Plugin permissions system
export type PluginPermission =
  | 'read-files' // Can read project files
  | 'list-files' // Can list directories
  | 'run-commands' // Can execute commands
  | 'access-config' // Can read QA configuration
  | 'write-logs'; // Can write to QA logs

// Secure plugin interface
export interface SecurePlugin {
  metadata: PluginMetadata;
  run: (context: SecurePluginContext) => Promise<QAResults>;
}

// Results interface for plugins
export interface QAResults {
  errors: number;
  warnings: number;
  duration: number;
  timestamp: Date;
}

// Plugin validation schema
// Note: Currently not used but kept for future JSON Schema validation
// const PLUGIN_SCHEMA = {
//   type: 'object',
//   required: ['name', 'version', 'run'],
//   properties: {
//     name: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' },
//     version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
//     description: { type: 'string', maxLength: 500 },
//     author: { type: 'string', maxLength: 100 },
//     license: { type: 'string', maxLength: 50 },
//     homepage: { type: 'string', format: 'uri' },
//     repository: { type: 'string', format: 'uri' },
//     keywords: {
//       type: 'array',
//       items: { type: 'string', maxLength: 50 },
//       maxItems: 10,
//     },
//     engines: {
//       type: 'object',
//       properties: {
//         node: { type: 'string' },
//         qaAgent: { type: 'string' },
//       },
//     },
//     permissions: {
//       type: 'array',
//       items: {
//         enum: ['read-files', 'list-files', 'run-commands', 'access-config', 'write-logs'],
//       },
//       maxItems: 10,
//     },
//     checksum: { type: 'string', pattern: '^[a-f0-9]{64}$' },
//   },
// };

// Secure Plugin Loader
export class SecurePluginLoader {
  private pluginsPath: string;
  private loadedPlugins: Map<string, SecurePlugin> = new Map();
  private qaAgent: QAAgent;

  constructor(pluginsPath: string, qaAgent: QAAgent) {
    this.pluginsPath = pluginsPath;
    this.qaAgent = qaAgent;
  }

  /**
   * Load and validate all plugins from the plugins directory
   */
  async loadPlugins(): Promise<void> {
    if (!(await this.directoryExists(this.pluginsPath))) {
      return; // No plugins directory
    }

    const pluginFiles = await this.findPluginFiles();

    for (const pluginFile of pluginFiles) {
      try {
        await this.loadPlugin(pluginFile);
      } catch (error) {
        this.qaAgent.logPublic('WARNING', `Failed to load plugin ${pluginFile}: ${error}`);
      }
    }
  }

  /**
   * Find all valid plugin files
   */
  private async findPluginFiles(): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(this.pluginsPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
          // Skip TypeScript declaration files
          if (entry.name.endsWith('.d.ts')) {continue;}

          files.push(path.join(this.pluginsPath, entry.name));
        }
      }
    } catch (error) {
      throw new Error(`Failed to read plugins directory: ${error}`);
    }

    return files;
  }

  /**
   * Load and validate a single plugin
   */
  private async loadPlugin(pluginPath: string): Promise<void> {
    // Read plugin file
    const pluginCode = await fs.readFile(pluginPath, 'utf-8');

    // Validate plugin structure statically
    await this.validatePluginCode(pluginCode, pluginPath);

    // Parse plugin metadata
    const metadata = await this.extractPluginMetadata(pluginCode);

    // Validate metadata against schema
    this.validateMetadata(metadata);

    // Verify checksum if provided
    if (metadata.checksum) {
      const calculatedChecksum = crypto.createHash('sha256').update(pluginCode).digest('hex');
      if (calculatedChecksum !== metadata.checksum) {
        throw new Error('Plugin checksum verification failed - plugin may have been tampered with');
      }
    }

    // Create secure context for the plugin
    const context = this.createSecureContext(metadata.permissions || []);

    // Load plugin module in restricted environment
    const pluginModule = await this.loadPluginModule(pluginCode, context);

    // Validate plugin interface
    if (!pluginModule.run || typeof pluginModule.run !== 'function') {
      throw new Error('Plugin must export a run function');
    }

    // Create secure plugin wrapper
    const securePlugin: SecurePlugin = {
      metadata,
      run: async (ctx: SecurePluginContext) => {
        try {
          return await pluginModule.run(ctx);
        } catch (error) {
          this.qaAgent.logPublic('ERROR', `Plugin ${metadata.name} threw error: ${error}`);
          return {
            errors: 1,
            warnings: 0,
            duration: 0,
            timestamp: new Date(),
          };
        }
      },
    };

    this.loadedPlugins.set(metadata.name, securePlugin);
    this.qaAgent.logPublic('INFO', `Loaded secure plugin: ${metadata.name} v${metadata.version}`);
  }

  /**
   * Validate plugin code statically for security issues
   */
  private async validatePluginCode(code: string, _filePath: string): Promise<void> {
    // Check for dangerous patterns
    const dangerousPatterns = [
      /require\s*\(\s*['"`]child_process['"`]\s*\)/g,
      /require\s*\(\s*['"`]fs['"`]\s*\)/g,
      /require\s*\(\s*['"`]path['"`]\s*\)/g,
      /process\.exit/g,
      /global\./g,
      /__dirname/g,
      /__filename/g,
      /eval\s*\(/g,
      /Function\s*\(/g,
      /setTimeout\s*\(/g,
      /setInterval\s*\(/g,
      /require\s*\(\s*['"`]\.\./g, // Parent directory requires
      /require\s*\(\s*['"`]\//g, // Absolute path requires
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Plugin contains dangerous code pattern: ${pattern}`);
      }
    }

    // Check code size limit (prevent extremely large plugins)
    if (code.length > 100000) {
      // 100KB limit
      throw new Error('Plugin file too large (max 100KB)');
    }

    // Basic syntax validation - skip dangerous eval, rely on TypeScript compilation
    // Syntax errors will be caught during actual plugin loading
    if (!code.includes('exports.') && !code.includes('module.exports')) {
      throw new Error('Plugin must export functionality via exports or module.exports');
    }
  }

  /**
   * Extract plugin metadata from code
   */
  private async extractPluginMetadata(code: string): Promise<PluginMetadata> {
    // Look for metadata export
    const metadataMatch = code.match(/exports\.metadata\s*=\s*({[\s\S]*?});/);
    if (!metadataMatch) {
      throw new Error('Plugin must export metadata object');
    }

    try {
      // Safely parse metadata (limited evaluation)
      const metadataCode = metadataMatch[1];
      const metadata = this.safeEvalMetadata(metadataCode);
      return metadata;
    } catch (error) {
      throw new Error(`Failed to parse plugin metadata: ${error}`);
    }
  }

  /**
   * Safely evaluate metadata object
   */
  private safeEvalMetadata(code: string): PluginMetadata {
    // Try to parse as JSON first (safest)
    try {
      return JSON.parse(code);
    } catch {
      // If not valid JSON, check if it's a simple object literal
      const trimmedCode = code.trim();
      if (trimmedCode.startsWith('{') && trimmedCode.endsWith('}')) {
        // For simple object literals, use a whitelist approach
        const allowedChars = /^[a-zA-Z0-9_"\s,:.[\]-]+$/;
        const normalizedCode = trimmedCode.replace(/\s+/g, ' ');
        if (allowedChars.test(normalizedCode)) {
          try {
            return JSON.parse(trimmedCode);
          } catch {
            // Fall back to manual parsing for simple cases
            return this.parseSimpleObjectLiteral(trimmedCode);
          }
        }
      }
      throw new Error('Metadata must be a valid JSON object or simple object literal');
    }
  }

  /**
   * Parse simple object literals safely
   */
  private parseSimpleObjectLiteral(code: string): PluginMetadata {
    const result: any = {};

    // Remove braces and split by commas
    const content = code.slice(1, -1).trim();
    const pairs = content.split(',').map(p => p.trim());

    for (const pair of pairs) {
      const [key, ...valueParts] = pair.split(':').map(p => p.trim());
      const keyName = key.replace(/['"]/g, '');
      const valueStr = valueParts.join(':').trim();

      // Only allow simple string, number, boolean, or array values
      if (valueStr.startsWith('"') || valueStr.startsWith("'")) {
        // String value
        result[keyName] = valueStr.slice(1, -1);
      } else if (valueStr === 'true') {
        result[keyName] = true;
      } else if (valueStr === 'false') {
        result[keyName] = false;
      } else if (/^\d+$/.test(valueStr)) {
        result[keyName] = parseInt(valueStr, 10);
      } else if (/^\d+\.\d+$/.test(valueStr)) {
        result[keyName] = parseFloat(valueStr);
      } else if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
        // Simple array
        const arrayContent = valueStr.slice(1, -1);
        result[keyName] = arrayContent
          ? arrayContent.split(',').map(s => s.trim().replace(/['"]/g, ''))
          : [];
      } else {
        throw new Error(`Unsupported value type in metadata: ${valueStr}`);
      }
    }

    return result;
  }

  /**
   * Validate metadata against schema
   */
  private validateMetadata(metadata: any): void {
    // Basic validation
    if (!metadata.name || typeof metadata.name !== 'string') {
      throw new Error('Plugin metadata must include a valid name');
    }

    if (!metadata.version || typeof metadata.version !== 'string') {
      throw new Error('Plugin metadata must include a valid version');
    }

    // Name validation
    if (!/^[a-zA-Z0-9_-]+$/.test(metadata.name)) {
      throw new Error('Plugin name must contain only letters, numbers, hyphens, and underscores');
    }

    // Version validation
    if (!/^\d+\.\d+\.\d+$/.test(metadata.version)) {
      throw new Error('Plugin version must be in semver format (x.y.z)');
    }

    // Permissions validation
    if (metadata.permissions) {
      const validPermissions: PluginPermission[] = [
        'read-files',
        'list-files',
        'run-commands',
        'access-config',
        'write-logs',
      ];

      for (const perm of metadata.permissions) {
        if (!validPermissions.includes(perm)) {
          throw new Error(`Invalid permission: ${perm}`);
        }
      }
    }
  }

  /**
   * Create a secure context for plugin execution (public for QAAgent integration)
   */
  createSecureContext(permissions: PluginPermission[]): SecurePluginContext {
    const projectDetection = this.qaAgent.detectProjectType();

    const context: SecurePluginContext = {
      projectRoot: this.qaAgent.getProjectRoot(),
      projectType: 'unknown', // Will be set from detection
      frameworks: [],

      log: (level: 'INFO' | 'WARNING' | 'ERROR', message: string) => {
        if (permissions.includes('write-logs')) {
          this.qaAgent.logPublic(level, `[Plugin] ${message}`);
        } else {
          throw new Error('Plugin does not have write-logs permission');
        }
      },

      readFile: async (filePath: string): Promise<string> => {
        if (!permissions.includes('read-files')) {
          throw new Error('Plugin does not have read-files permission');
        }

        const resolvedPath = this.validateAndResolvePath(filePath);
        return await fs.readFile(resolvedPath, 'utf-8');
      },

      listFiles: async (dirPath: string): Promise<string[]> => {
        if (!permissions.includes('list-files')) {
          throw new Error('Plugin does not have list-files permission');
        }

        const resolvedPath = this.validateAndResolvePath(dirPath);
        const entries = await fs.readdir(resolvedPath);
        return entries;
      },

      fileExists: async (filePath: string): Promise<boolean> => {
        if (!permissions.includes('read-files')) {
          throw new Error('Plugin does not have read-files permission');
        }

        const resolvedPath = this.validateAndResolvePath(filePath);
        return await this.fileExists(resolvedPath);
      },

      runCommand: async (
        command: string,
        description: string,
        timeout?: number
      ): Promise<boolean> => {
        if (!permissions.includes('run-commands')) {
          throw new Error('Plugin does not have run-commands permission');
        }

        // Sanitize command - only allow safe commands
        if (!this.isSafeCommand(command)) {
          throw new Error('Command contains unsafe operations');
        }

        return await this.qaAgent.runCommandPublic(command, description, timeout);
      },

      getConfig: async (): Promise<any> => {
        if (!permissions.includes('access-config')) {
          throw new Error('Plugin does not have access-config permission');
        }

        return await this.qaAgent.loadQaConfigPublic();
      },
    };

    // Set project info from detection (async, but we'll set defaults for now)
    projectDetection
      .then(detection => {
        (context as any).projectType = detection.projectType;
        (context as any).frameworks = detection.frameworks;
      })
      .catch(() => {
        // Ignore errors, keep defaults
      });

    return context;
  }

  /**
   * Load plugin module in restricted environment
   */
  private async loadPluginModule(code: string, context: SecurePluginContext): Promise<any> {
    // For security, we'll use a static analysis approach instead of dynamic execution
    // Parse the plugin code to extract the exported functionality

    // Look for exports assignments
    const exportsPattern = /exports\.(\w+)\s*=\s*([^;]+);/g;
    const moduleExports: any = {};

    let match;
    while ((match = exportsPattern.exec(code)) !== null) {
      const exportName = match[1];
      const exportValue = match[2].trim();

      // Only allow simple function declarations and object literals
      if (
        exportValue.startsWith('function') ||
        exportValue.startsWith('(') ||
        exportValue.startsWith('{')
      ) {
        // For now, we'll create a safe wrapper that validates the export
        try {
          // Basic validation - ensure it's not dangerous code
          if (this.containsDangerousCode(exportValue)) {
            throw new Error(`Export '${exportName}' contains dangerous code`);
          }

          // Create a safe function wrapper
          const safeFunction = this.createSafeFunction(exportValue, context);
          moduleExports[exportName] = safeFunction;
        } catch (error) {
          throw new Error(`Failed to create safe export '${exportName}': ${error}`);
        }
      } else {
        throw new Error(`Unsupported export type for '${exportName}'`);
      }
    }

    // Check for module.exports assignment
    const moduleExportsMatch = code.match(/module\.exports\s*=\s*({[\s\S]*?});/);
    if (moduleExportsMatch) {
      throw new Error('module.exports assignments are not supported for security reasons');
    }

    return moduleExports;
  }

  /**
   * Check if code contains dangerous patterns
   */
  private containsDangerousCode(code: string): boolean {
    const dangerousPatterns = [
      /eval\s*\(/,
      /new\s+Function\s*\(/,
      /require\s*\(/,
      /process\./,
      /global\./,
      /__dirname/,
      /__filename/,
      /fs\./,
      /child_process\./,
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
    ];

    return dangerousPatterns.some(pattern => pattern.test(code));
  }

  /**
   * Create a safe function from plugin code
   */
  private createSafeFunction(_code: string, _context: SecurePluginContext): Function {
    // For function declarations, extract the function body
    if (_code.startsWith('function')) {
      const functionMatch = _code.match(/function\s*\w*\s*\(([^)]*)\)\s*{([\s\S]*)}/);
      if (functionMatch) {
        const params = functionMatch[1];
        // const body = functionMatch[2]; // Not used in current implementation

        // Validate parameters (only allow simple parameter names)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(params.trim())) {
          throw new Error('Function parameters must be simple identifiers');
        }

        // Create a safe function that runs in the plugin context
        return (_args: any[]) => {
          // For now, we'll throw an error indicating plugins need to be redesigned
          // This is a security measure until a proper VM-based solution is implemented
          throw new Error(
            'Plugin execution is currently disabled for security reasons. Please contact the maintainers.'
          );
        };
      }
    }

    throw new Error('Unsupported function format');
  }

  /**
   * Validate and resolve file paths to prevent directory traversal
   */
  private validateAndResolvePath(filePath: string): string {
    // Resolve the path
    const resolvedPath = path.resolve(this.qaAgent.getProjectRoot(), filePath);

    // Ensure it's within the project directory
    if (!resolvedPath.startsWith(this.qaAgent.getProjectRoot())) {
      throw new Error('Path traversal detected - access denied');
    }

    return resolvedPath;
  }

  /**
   * Check if a command is safe to execute
   */
  private isSafeCommand(command: string): boolean {
    // Block dangerous commands
    const dangerousPatterns = [
      /rm\s+-rf\s+\//, // Remove root directory
      /rm\s+-rf\s+\./, // Remove current directory
      />/, // Output redirection (could overwrite files)
      /\|/, // Pipes (could chain dangerous commands)
      /;/, // Command chaining
      /&&/, // Command chaining
      /\|\|/, // Command chaining
      /sudo/, // Privilege escalation
      /su/, // User switching
      /chmod/, // Permission changes
      /chown/, // Ownership changes
      /dd/, // Disk operations
      /mkfs/, // Filesystem operations
      /fdisk/, // Disk partitioning
      /mount/, // Mount operations
      /umount/, // Unmount operations
      /kill/, // Process killing
      /pkill/, // Process killing
      /killall/, // Process killing
      /reboot/, // System reboot
      /shutdown/, // System shutdown
      /halt/, // System halt
      /poweroff/, // System poweroff
      /init/, // Init system
      /systemctl/, // Systemd control
      /service/, // Service management
      /curl.*\|/, // Curl piped to shell
      /wget.*\|/, // Wget piped to shell
      /eval/, // Eval execution
      /exec/, // Exec execution
      /source/, // Source execution
      /\.\s+\//, // Source execution
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all loaded plugins
   */
  getLoadedPlugins(): Map<string, SecurePlugin> {
    return this.loadedPlugins;
  }

  /**
   * Run all loaded plugins
   */
  async runPlugins(): Promise<QAResults> {
    let totalErrors = 0;
    let totalWarnings = 0;
    const startTime = Date.now();

    for (const [name, plugin] of this.loadedPlugins) {
      try {
        this.qaAgent.logPublic('INFO', `Running secure plugin: ${name}`);
        const context = this.createSecureContext(plugin.metadata.permissions || []);
        const results = await plugin.run(context);

        totalErrors += results.errors;
        totalWarnings += results.warnings;

        if (results.errors > 0) {
          this.qaAgent.logPublic(
            'ERROR',
            `Secure plugin ${name} failed with ${results.errors} errors`
          );
        } else if (results.warnings > 0) {
          this.qaAgent.logPublic(
            'WARNING',
            `Secure plugin ${name} completed with ${results.warnings} warnings`
          );
        } else {
          this.qaAgent.logPublic('SUCCESS', `Secure plugin ${name} completed successfully`);
        }
      } catch (error) {
        this.qaAgent.logPublic('ERROR', `Secure plugin ${name} threw an error: ${error}`);
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
}
