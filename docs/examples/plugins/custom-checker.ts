import { QAResults } from 'echain-qa-agent';

export interface CustomCheckerConfig {
  strict?: boolean;
  maxLines?: number;
  excludePatterns?: string[];
}

// Plugin interface (matches what the QA Agent expects)
export interface QAPlugin {
  name: string;
  version: string;
  description?: string;
  run: (qaAgent: any) => Promise<QAResults>;
}

export class CustomChecker implements QAPlugin {
  name = 'custom-checker';
  version = '1.0.0';
  description = 'Custom code quality checker with configurable rules';

  private config: CustomCheckerConfig;

  constructor(config: CustomCheckerConfig = {}) {
    this.config = {
      strict: false,
      maxLines: 300,
      excludePatterns: [],
      ...config
    };
  }

  async run(qaAgent: any): Promise<QAResults> {
    const startTime = Date.now();
    let errors = 0;
    let warnings = 0;

    try {
      // Log start of check
      qaAgent.logPublic('INFO', 'Starting custom code quality checks');

      // Get project root and files
      const projectRoot = qaAgent.getProjectRoot();
      const allFiles = await this.getAllFiles(qaAgent, projectRoot);

      // Filter for relevant files (Solidity and TypeScript)
      const relevantFiles = allFiles.filter((file: string) =>
        (file.endsWith('.sol') || file.endsWith('.ts')) &&
        !this.isExcluded(file)
      );

      qaAgent.logPublic('INFO', `Found ${relevantFiles.length} files to check`);

      // Analyze each file
      for (const file of relevantFiles) {
        try {
          const fileResults = await this.analyzeFile(qaAgent, file);
          errors += fileResults.errors;
          warnings += fileResults.warnings;
        } catch (error) {
          qaAgent.logPublic('WARNING', `Failed to analyze ${file}: ${error}`);
          errors++;
        }
      }

      qaAgent.logPublic('INFO', `Custom checks completed: ${errors} errors, ${warnings} warnings`);

    } catch (error) {
      qaAgent.logPublic('ERROR', `Custom checker failed: ${error}`);
      errors++;
    }

    return {
      errors,
      warnings,
      duration: (Date.now() - startTime) / 1000,
      timestamp: new Date()
    };
  }

  private async getAllFiles(qaAgent: any, dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      // Use the QA agent's file system access
      const entries = await qaAgent.listFiles(dir);

      for (const entry of entries) {
        const fullPath = `${dir}/${entry}`;

        if (await this.isDirectory(qaAgent, fullPath)) {
          // Skip common directories
          if (!['node_modules', 'artifacts', 'cache', 'coverage', '.git'].includes(entry)) {
            files.push(...await this.getAllFiles(qaAgent, fullPath));
          }
        } else {
          files.push(fullPath);
        }
      }
    } catch {
      // Skip directories we can't read
    }

    return files;
  }

  private async isDirectory(qaAgent: any, path: string): Promise<boolean> {
    try {
      // Try to list files - if it works, it's a directory
      await qaAgent.listFiles(path);
      return true;
    } catch {
      return false;
    }
  }

  private async analyzeFile(qaAgent: any, filePath: string): Promise<{errors: number, warnings: number}> {
    let errors = 0;
    let warnings = 0;

    try {
      const content = await qaAgent.readFile(filePath);
      const lines = content.split('\n');

      // Check line count
      if (this.config.maxLines && lines.length > this.config.maxLines) {
        qaAgent.logPublic('WARNING', `${filePath}: File exceeds maximum line count of ${this.config.maxLines} lines`);
        warnings++;
      }

      // Check for console.log statements (strict mode only)
      if (this.config.strict) {
        lines.forEach((line: string, index: number) => {
          if (line.includes('console.log')) {
            qaAgent.logPublic('ERROR', `${filePath}:${index + 1}: console.log statement found in production code`);
            errors++;
          }
        });
      }

      // Check for TODO comments
      lines.forEach((line: string, index: number) => {
        if (line.toLowerCase().includes('todo') || line.toLowerCase().includes('fixme')) {
          qaAgent.logPublic('WARNING', `${filePath}:${index + 1}: TODO/FIXME comment found`);
          warnings++;
        }
      });

    } catch (error) {
      qaAgent.logPublic('ERROR', `Failed to read file ${filePath}: ${error}`);
      errors++;
    }

    return { errors, warnings };
  }

  private isExcluded(filePath: string): boolean {
    return this.config.excludePatterns?.some(pattern =>
      filePath.includes(pattern)
    ) || false;
  }
}

// Export the plugin factory function
export function createPlugin(config?: CustomCheckerConfig): QAPlugin {
  return new CustomChecker(config);
}