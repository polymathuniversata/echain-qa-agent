import { promises as fs } from 'fs';
import path from 'path';
import fse from 'fs-extra';
import Ajv from 'ajv';

/**
 * QA Agent configuration structure
 */
export interface QAConfig {
  /** Configuration version */
  version: string;
  /** Project information */
  project: {
    /** Project name */
    name: string;
    /** Project type (blockchain, frontend, fullstack) */
    type: string;
    /** Frameworks used in the project */
    frameworks: string[];
  };
  /** Enabled QA checks */
  checks: {
    /** Enable linting checks */
    linting: boolean;
    /** Enable testing checks */
    testing: boolean;
    /** Enable security checks */
    security: boolean;
    /** Enable build checks */
    build: boolean;
    /** Enable performance checks */
    performance: boolean;
  };
  /** Project paths configuration */
  paths: {
    /** Frontend source directory */
    frontend: string;
    /** Blockchain source directory */
    blockchain: string;
    /** Documentation directory */
    docs: string;
    /** Test files directory */
    tests: string;
  };
  /** Git hooks configuration */
  hooks: {
    /** Enable pre-commit hooks */
    preCommit: boolean;
    /** Enable pre-push hooks */
    prePush: boolean;
    /** Auto-install hooks */
    autoInstall: boolean;
    /** Wrap npm scripts with QA checks */
    wrapScripts: boolean;
    /** Scripts to wrap with QA checks */
    scriptsToWrap: string[];
  };
  /** Quality gate thresholds */
  qualityGates?: {
    /** Fail build if linting errors found */
    failOnLintErrors: boolean;
    /** Fail build if tests fail */
    failOnTestFailures: boolean;
    /** Fail build if build fails */
    failOnBuildFailures: boolean;
    /** Fail build if security vulnerabilities found */
    failOnSecurityVulnerabilities: boolean;
    /** Fail build if performance issues found */
    failOnPerformanceIssues: boolean;
    /** Require test files to be present */
    requireTests: boolean;
    /** Require minimum test coverage */
    requireTestCoverage: boolean;
    /** Minimum test coverage percentage required */
    minTestCoverage: number;
  };
}

/**
 * ConfigurationManager handles loading, validation, and sanitization of QA configuration
 */
export class ConfigurationManager {
  private projectRoot: string;
  private ajv: Ajv;

  /**
   * Creates a new ConfigurationManager instance
   * @param projectRoot Root directory of the project
   */
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.ajv = new Ajv({ allErrors: true });
  }

  /**
   * Validates a QA configuration object against the schema
   * @param config Configuration object to validate
   * @returns Promise resolving to true if configuration is valid
   */
  async validateConfig(config: any): Promise<boolean> {
    const schema = {
      type: 'object',
      properties: {
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
        project: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            type: { type: 'string', enum: ['blockchain', 'frontend', 'fullstack'] },
            frameworks: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['name', 'type'],
        },
        checks: {
          type: 'object',
          properties: {
            linting: { type: 'boolean' },
            testing: { type: 'boolean' },
            security: { type: 'boolean' },
            build: { type: 'boolean' },
            performance: { type: 'boolean' },
          },
        },
        paths: {
          type: 'object',
          properties: {
            frontend: { type: 'string' },
            blockchain: { type: 'string' },
            docs: { type: 'string' },
            tests: { type: 'string' },
          },
        },
        hooks: {
          type: 'object',
          properties: {
            preCommit: { type: 'boolean' },
            prePush: { type: 'boolean' },
            autoInstall: { type: 'boolean' },
            wrapScripts: { type: 'boolean' },
            scriptsToWrap: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
      required: ['version', 'project'],
    };

    const validate = this.ajv.compile(schema);
    const valid = validate(config);

    if (!valid) {
      console.log('ERROR: Invalid .qa-config.json configuration:');
      validate.errors?.forEach(error => {
        console.log(`ERROR:   ${error.instancePath}: ${error.message}`);
      });
      return false;
    }

    console.log('SUCCESS: Configuration validation passed');
    return true;
  }

  /**
   * Loads QA configuration from .qa-config.json file
   * @returns Promise resolving to configuration object or null if not found
   */
  async loadQaConfig(): Promise<QAConfig | null> {
    const configPath = path.join(this.projectRoot, '.qa-config.json');

    if (!(await fse.pathExists(configPath))) {
      return null;
    }

    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      // Sanitize configuration values
      return this.sanitizeConfig(config);
    } catch (error) {
      console.log(`ERROR: Failed to load QA configuration: ${error}`);
      throw error;
    }
  }

  private sanitizeConfig(config: any): QAConfig {
    // Sanitize file paths
    if (config.paths) {
      Object.keys(config.paths).forEach(key => {
        if (typeof config.paths[key] === 'string') {
          config.paths[key] = this.sanitizePath(config.paths[key]);
        }
      });
    }

    // Sanitize project name
    if (config.project?.name) {
      config.project.name = this.sanitizeString(config.project.name);
    }

    // Sanitize frameworks array
    if (config.project?.frameworks && Array.isArray(config.project.frameworks)) {
      config.project.frameworks = config.project.frameworks
        .filter((fw: any) => typeof fw === 'string')
        .map((fw: string) => this.sanitizeString(fw));
    }

    return config as QAConfig;
  }

  private sanitizePath(input: string): string {
    // Remove dangerous path characters and patterns
    return input
      .replace(/[<>:"|?*]/g, '') // Remove invalid path characters
      .replace(/\.\./g, '') // Remove directory traversal
      .replace(/^\/+/, '') // Remove leading slashes
      .replace(/\/+$/, '') // Remove trailing slashes
      .trim();
  }

  private sanitizeString(input: string): string {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '') // Remove HTML/XML tags
      .replace(/\0/g, '') // Remove null bytes
      .trim();
  }

  /**
   * Saves QA configuration to .qa-config.json file
   * @param config Configuration object to save
   */
  async saveConfig(config: QAConfig): Promise<void> {
    const configPath = path.join(this.projectRoot, '.qa-config.json');
    await fse.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Initializes default QA configuration if none exists
   */
  async initializeConfig(): Promise<void> {
    const configPath = path.join(this.projectRoot, '.qa-config.json');

    if (await fse.pathExists(configPath)) {
      return; // Already exists
    }

    const defaultConfig: QAConfig = {
      version: '2.0.0',
      project: {
        name: path.basename(this.projectRoot),
        type: 'blockchain',
        frameworks: [],
      },
      checks: {
        linting: true,
        testing: true,
        security: true,
        build: true,
        performance: false,
      },
      paths: {
        frontend: 'frontend',
        blockchain: 'blockchain',
        docs: 'docs',
        tests: 'test',
      },
      hooks: {
        preCommit: true,
        prePush: true,
        autoInstall: true,
        wrapScripts: false,
        scriptsToWrap: ['build', 'start', 'dev', 'test'],
      },
    };

    await this.saveConfig(defaultConfig);
  }
}
