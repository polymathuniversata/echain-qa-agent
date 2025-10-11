# 📚 API Reference

Complete API documentation for echain-qa-agent, including classes, interfaces, types, and usage examples.

## 📋 Table of Contents

- [Core Classes](#-core-classes)
- [Configuration APIs](#-configuration-apis)
- [Plugin APIs](#-plugin-apis)
- [Check APIs](#-check-apis)
- [Reporting APIs](#-reporting-apis)
- [Utility APIs](#-utility-apis)
- [Type Definitions](#-type-definitions)
- [Error Types](#-error-types)

## 🏗️ Core Classes

### QAAgent

The main orchestration class for running QA checks.

```typescript
export class QAAgent {
  constructor(config: QAConfig);

  // Main execution methods
  run(): Promise<QAResult>;
  runCheck(checkName: string): Promise<CheckResult>;
  runChecks(checkNames: string[]): Promise<CheckResults>;

  // Configuration methods
  updateConfig(config: Partial<QAConfig>): Promise<void>;
  getConfig(): QAConfig;
  validateConfig(): Promise<ValidationResult>;

  // Status and monitoring
  getStatus(): QAStatus;
  getMetrics(): QAMetrics;
  getHealth(): HealthStatus;

  // Lifecycle methods
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}
```

#### Usage Example

```typescript
import { QAAgent, QAConfig } from 'echain-qa-agent';

const config: QAConfig = {
  project: {
    name: 'MyProject',
    type: 'blockchain',
    frameworks: ['hardhat']
  },
  checks: {
    codeQuality: true,
    testing: true,
    security: true
  }
};

const agent = new QAAgent(config);

// Run all checks
const result = await agent.run();
console.log(`Status: ${result.summary.status}`);

// Run specific check
const testResult = await agent.runCheck('testing');
console.log(`Tests: ${testResult.status}`);
```

### PluginManager

Manages plugin loading, registration, and execution.

```typescript
export class PluginManager {
  constructor(options: PluginManagerOptions);

  // Plugin management
  loadPlugin(path: string): Promise<Plugin>;
  unloadPlugin(name: string): Promise<void>;
  reloadPlugin(name: string): Promise<Plugin>;

  // Plugin discovery
  discoverPlugins(directory: string): Promise<PluginMetadata[]>;
  installPlugin(packageName: string): Promise<Plugin>;
  uninstallPlugin(name: string): Promise<void>;

  // Plugin execution
  executePlugin(name: string, context: ExecutionContext): Promise<PluginResult>;
  executePlugins(names: string[], context: ExecutionContext): Promise<PluginResults>;

  // Plugin information
  getPlugin(name: string): Plugin | undefined;
  listPlugins(): PluginMetadata[];
  getPluginCapabilities(name: string): PluginCapability[];
}
```

#### Usage Example

```typescript
import { PluginManager } from 'echain-qa-agent';

const pluginManager = new PluginManager({
  pluginDir: './plugins',
  sandbox: true
});

// Load a plugin
const plugin = await pluginManager.loadPlugin('./my-plugin.js');
console.log(`Loaded plugin: ${plugin.name}`);

// Execute plugin
const result = await pluginManager.executePlugin('my-checker', {
  project: project,
  config: checkConfig
});
```

### ConfigurationManager

Handles configuration loading, validation, and merging.

```typescript
export class ConfigurationManager {
  constructor(options: ConfigurationOptions);

  // Configuration loading
  loadConfig(projectRoot?: string): Promise<QAConfig>;
  loadGlobalConfig(): Promise<Partial<QAConfig>>;
  loadProjectConfig(projectRoot: string): Promise<Partial<QAConfig>>;
  loadEnvironmentConfig(): Promise<Partial<QAConfig>>;

  // Configuration validation
  validateConfig(config: any): ValidationResult;
  validateProjectConfig(config: any): ValidationResult;
  validateCheckConfig(config: any): ValidationResult;

  // Configuration merging
  mergeConfigs(configs: Partial<QAConfig>[]): QAConfig;
  extendConfig(base: QAConfig, extension: Partial<QAConfig>): QAConfig;

  // Configuration utilities
  getDefaultConfig(): QAConfig;
  getSchema(): JSONSchema;
  exportConfig(config: QAConfig, format: 'json' | 'yaml'): string;
}
```

#### Usage Example

```typescript
import { ConfigurationManager } from 'echain-qa-agent';

const configManager = new ConfigurationManager();

// Load configuration
const config = await configManager.loadConfig('./my-project');

// Validate configuration
const validation = configManager.validateConfig(config);
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}

// Export configuration
const yamlConfig = configManager.exportConfig(config, 'yaml');
fs.writeFileSync('.qa-config.yaml', yamlConfig);
```

## ⚙️ Configuration APIs

### QAConfig Interface

Main configuration interface for the QA agent.

```typescript
export interface QAConfig {
  // Project information
  project: ProjectConfig;

  // Check configurations
  checks: CheckConfig;

  // Caching configuration
  caching?: CacheConfig;

  // Plugin configuration
  plugins?: PluginConfig[];

  // Reporting configuration
  reporting?: ReportingConfig;

  // Performance configuration
  performance?: PerformanceConfig;

  // Security configuration
  security?: SecurityConfig;

  // Git integration
  git?: GitConfig;

  // Logging configuration
  logging?: LoggingConfig;
}
```

### ProjectConfig Interface

```typescript
export interface ProjectConfig {
  name: string;
  type: 'blockchain' | 'frontend' | 'fullstack' | 'other';
  version?: string;
  frameworks: string[];
  root?: string;
  files?: string[];
  exclude?: string[];
  include?: string[];
}
```

### CheckConfig Interface

```typescript
export interface CheckConfig {
  // Enable/disable checks
  codeQuality?: boolean | CodeQualityConfig;
  testing?: boolean | TestingConfig;
  security?: boolean | SecurityConfig;
  build?: boolean | BuildConfig;

  // Custom checks
  custom?: CustomCheckConfig[];

  // Check options
  parallel?: boolean;
  failFast?: boolean;
  timeout?: number;
  retries?: number;
}
```

### CacheConfig Interface

```typescript
export interface CacheConfig {
  enabled: boolean;
  directory?: string;
  maxSize?: string; // e.g., "500MB"
  compression?: boolean;

  // Cache TTL settings
  ttl?: {
    results?: string; // e.g., "1h"
    deps?: string;    // e.g., "24h"
    build?: string;   // e.g., "2h"
    security?: string; // e.g., "6h"
  };

  // Cache invalidation
  invalidation?: {
    onFileChange?: boolean;
    onConfigChange?: boolean;
    manualOnly?: boolean;
  };
}
```

## 🔌 Plugin APIs

### Plugin Interface

Base interface for all plugins.

```typescript
export interface Plugin {
  // Metadata
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;

  // Capabilities
  capabilities?: PluginCapability[];

  // Dependencies
  dependencies?: string[];
  peerDependencies?: string[];

  // Lifecycle methods
  initialize?(context: PluginContext): Promise<void>;
  activate?(context: PluginContext): Promise<void>;
  deactivate?(): Promise<void>;
  destroy?(): Promise<void>;
}
```

### CheckerPlugin Interface

Interface for plugins that perform checks.

```typescript
export interface CheckerPlugin extends Plugin {
  // Check metadata
  category: CheckCategory;
  priority?: number;

  // Check execution
  check(project: Project, config: CheckConfig): Promise<CheckResult>;

  // Check capabilities
  supportsParallel?: boolean;
  requiresNetwork?: boolean;
  requiresAuth?: boolean;

  // Check configuration
  getConfigSchema?(): JSONSchema;
  validateConfig?(config: any): ValidationResult;
}
```

### ReporterPlugin Interface

Interface for plugins that generate reports.

```typescript
export interface ReporterPlugin extends Plugin {
  // Report formats
  supportedFormats: ReportFormat[];

  // Report generation
  generateReport(results: CheckResults, format: ReportFormat): Promise<Report>;
  generateReportStream?(results: Observable<CheckResult>, format: ReportFormat): Observable<ReportChunk>;

  // Report configuration
  getConfigSchema?(): JSONSchema;
  validateConfig?(config: any): ValidationResult;
}
```

### HookPlugin Interface

Interface for plugins that hook into the QA process.

```typescript
export interface HookPlugin extends Plugin {
  // Hook points
  supportedHooks: PluginHook[];

  // Hook methods
  preCheck?(context: PreCheckContext): Promise<void>;
  postCheck?(context: PostCheckContext): Promise<void>;
  onError?(context: ErrorContext): Promise<void>;
  onConfigLoad?(context: ConfigLoadContext): Promise<void>;
  onPluginLoad?(context: PluginLoadContext): Promise<void>;
}
```

## 🔍 Check APIs

### CheckResult Interface

Result of a single check execution.

```typescript
export interface CheckResult {
  // Status
  status: CheckStatus;
  category: CheckCategory;

  // Timing
  startTime: Date;
  endTime: Date;
  duration: number;

  // Results
  passed?: number;
  failed?: number;
  warnings?: number;
  skipped?: number;

  // Details
  details?: any;
  output?: string;
  error?: string;

  // Suggestions
  suggestions?: string[];
  fixes?: FixSuggestion[];

  // Metadata
  metadata?: {
    tool?: string;
    version?: string;
    config?: any;
  };
}
```

### CheckStatus Enum

```typescript
export enum CheckStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  WARNING = 'warning',
  SKIPPED = 'skipped',
  ERROR = 'error',
  TIMEOUT = 'timeout'
}
```

### CheckCategory Enum

```typescript
export enum CheckCategory {
  CODE_QUALITY = 'codeQuality',
  TESTING = 'testing',
  SECURITY = 'security',
  BUILD = 'build',
  PERFORMANCE = 'performance',
  DEPLOYMENT = 'deployment',
  DOCUMENTATION = 'documentation',
  CUSTOM = 'custom'
}
```

## 📊 Reporting APIs

### QAResult Interface

Complete result of a QA run.

```typescript
export interface QAResult {
  // Summary
  summary: QASummary;

  // Detailed results
  checks: CheckResults;

  // Metadata
  metadata: QAMetadata;

  // Generated reports
  reports?: Report[];
}
```

### QASummary Interface

Summary of QA execution.

```typescript
export interface QASummary {
  // Overall status
  status: CheckStatus;

  // Timing
  startTime: Date;
  endTime: Date;
  duration: number;

  // Counts
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  skippedChecks: number;

  // Scores
  qualityScore?: number;
  securityScore?: number;
  performanceScore?: number;

  // Issues
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
}
```

### Report Interface

Generated report structure.

```typescript
export interface Report {
  // Report metadata
  id: string;
  format: ReportFormat;
  timestamp: Date;
  version: string;

  // Content
  title: string;
  summary: string;
  content: string;

  // Structure
  sections: ReportSection[];

  // Metadata
  generator: string;
  config: any;
}
```

### ReportFormat Enum

```typescript
export enum ReportFormat {
  JSON = 'json',
  YAML = 'yaml',
  XML = 'xml',
  HTML = 'html',
  MARKDOWN = 'markdown',
  PDF = 'pdf',
  JUNIT = 'junit',
  SARIF = 'sarif'
}
```

## 🛠️ Utility APIs

### ProjectDetector

Detects project type and framework.

```typescript
export class ProjectDetector {
  constructor(options: ProjectDetectorOptions);

  // Detection methods
  detectProject(root?: string): Promise<Project>;
  detectFramework(root?: string): Promise<Framework[]>;
  detectLanguage(root?: string): Promise<Language[]>;

  // Analysis methods
  analyzeDependencies(root?: string): Promise<DependencyInfo>;
  analyzeStructure(root?: string): Promise<ProjectStructure>;

  // Utility methods
  isValidProject(root?: string): Promise<boolean>;
  getProjectType(root?: string): Promise<ProjectType>;
}
```

### CacheManager

Manages caching of results and artifacts.

```typescript
export class CacheManager {
  constructor(options: CacheOptions);

  // Cache operations
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;

  // Cache management
  size(): Promise<number>;
  keys(): Promise<string[]>;
  stats(): Promise<CacheStats>;

  // Cache utilities
  invalidate(pattern: string): Promise<void>;
  cleanup(): Promise<void>;
  export(): Promise<CacheExport>;
  import(data: CacheExport): Promise<void>;
}
```

### CommandExecutor

Executes external commands and processes.

```typescript
export class CommandExecutor {
  constructor(options: CommandExecutorOptions);

  // Command execution
  execute(command: string, options?: ExecOptions): Promise<CommandResult>;
  executeParallel(commands: string[], options?: ParallelExecOptions): Promise<CommandResult[]>;

  // Process management
  spawn(command: string, args: string[], options?: SpawnOptions): Promise<ChildProcess>;
  kill(pid: number): Promise<void>;

  // Utility methods
  which(command: string): Promise<string | null>;
  isAvailable(command: string): Promise<boolean>;
  getVersion(command: string): Promise<string>;
}
```

## 📝 Type Definitions

### Common Types

```typescript
export type CheckStatus = 'passed' | 'failed' | 'warning' | 'skipped' | 'error' | 'timeout';

export type CheckCategory = 'codeQuality' | 'testing' | 'security' | 'build' | 'performance' | 'deployment' | 'documentation' | 'custom';

export type ReportFormat = 'json' | 'yaml' | 'xml' | 'html' | 'markdown' | 'pdf' | 'junit' | 'sarif';

export type ProjectType = 'blockchain' | 'frontend' | 'fullstack' | 'library' | 'cli' | 'other';

export type Framework = 'hardhat' | 'foundry' | 'truffle' | 'brownie' | 'nextjs' | 'vite' | 'react' | 'vue' | 'angular' | 'other';

export type Language = 'solidity' | 'typescript' | 'javascript' | 'python' | 'rust' | 'other';
```

### Configuration Types

```typescript
export interface CodeQualityConfig {
  eslint?: boolean | ESLintConfig;
  prettier?: boolean | PrettierConfig;
  solidity?: boolean | SolidityConfig;
  typescript?: boolean | TypeScriptConfig;
}

export interface TestingConfig {
  unit?: boolean | UnitTestConfig;
  integration?: boolean | IntegrationTestConfig;
  e2e?: boolean | E2ETestConfig;
  coverage?: boolean | CoverageConfig;
}

export interface SecurityConfig {
  slither?: boolean | SlitherConfig;
  mythril?: boolean | MythrilConfig;
  audit?: boolean | AuditConfig;
  secrets?: boolean | SecretsConfig;
}

export interface BuildConfig {
  compile?: boolean | CompileConfig;
  test?: boolean | TestConfig;
  coverage?: boolean | CoverageConfig;
  artifacts?: boolean | ArtifactsConfig;
}
```

### Result Types

```typescript
export interface CheckResults {
  [checkName: string]: CheckResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface CommandResult {
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
  duration: number;
  command: string;
}
```

## 🚨 Error Types

### Base Error Classes

```typescript
export class QAError extends Error {
  constructor(message: string, code?: string, details?: any);

  readonly code: string;
  readonly details: any;
  readonly timestamp: Date;
  readonly stack: string;
}

export class ConfigurationError extends QAError {
  constructor(message: string, field?: string, value?: any);
}

export class PluginError extends QAError {
  constructor(message: string, pluginName?: string, details?: any);
}

export class CheckError extends QAError {
  constructor(message: string, checkName?: string, details?: any);
}

export class SecurityError extends QAError {
  constructor(message: string, severity?: SecuritySeverity, details?: any);
}
```

### Specific Error Types

```typescript
export class ValidationError extends QAError {
  constructor(message: string, field: string, rule?: string);
}

export class TimeoutError extends QAError {
  constructor(message: string, timeout: number, command?: string);
}

export class ResourceError extends QAError {
  constructor(message: string, resource: string, limit?: any);
}

export class NetworkError extends QAError {
  constructor(message: string, url?: string, statusCode?: number);
}

export class AuthenticationError extends QAError {
  constructor(message: string, provider?: string);
}
```

### Error Handling

```typescript
// Error handling utilities
export class ErrorHandler {
  static handle(error: Error): QAError;
  static isRetryable(error: Error): boolean;
  static getSeverity(error: Error): ErrorSeverity;
  static format(error: Error, format: 'text' | 'json'): string;
}

// Error recovery
export class ErrorRecovery {
  static canRecover(error: Error): boolean;
  static recover(error: Error, context: any): Promise<any>;
  static getRecoveryStrategy(error: Error): RecoveryStrategy;
}
```

## 📖 Usage Examples

### Basic Usage

```typescript
import { QAAgent, QAConfig } from 'echain-qa-agent';

// Create configuration
const config: QAConfig = {
  project: {
    name: 'MyDeFiProject',
    type: 'blockchain',
    frameworks: ['hardhat', 'nextjs']
  },
  checks: {
    codeQuality: true,
    testing: true,
    security: true,
    build: true
  }
};

// Create and run agent
const agent = new QAAgent(config);
const result = await agent.run();

// Check results
if (result.summary.status === 'passed') {
  console.log('✅ All checks passed!');
} else {
  console.log('❌ Some checks failed');
  console.log(`Passed: ${result.summary.passedChecks}`);
  console.log(`Failed: ${result.summary.failedChecks}`);
}
```

### Advanced Configuration

```typescript
import { QAAgent, QAConfig } from 'echain-qa-agent';

const config: QAConfig = {
  project: {
    name: 'AdvancedProject',
    type: 'fullstack',
    frameworks: ['hardhat', 'nextjs'],
    version: '2.1.0'
  },
  checks: {
    codeQuality: {
      eslint: { fix: true },
      prettier: { write: true },
      solidity: { optimizer: true }
    },
    testing: {
      unit: { timeout: 10000 },
      integration: { network: 'kovan' },
      coverage: { minimum: 90 }
    },
    security: {
      slither: { detectors: 'all' },
      audit: { level: 'moderate' }
    }
  },
  caching: {
    enabled: true,
    ttl: { results: '1h', security: '24h' }
  },
  plugins: [
    '@echain-qa/solidity-checker',
    '@echain-qa/gas-optimizer'
  ]
};

const agent = new QAAgent(config);
const result = await agent.run();
```

### Plugin Development

```typescript
import { CheckerPlugin, CheckResult, Project } from 'echain-qa-agent';

export class CustomChecker implements CheckerPlugin {
  name = 'custom-checker';
  version = '1.0.0';
  category = 'codeQuality';

  async check(project: Project): Promise<CheckResult> {
    // Custom check logic
    const issues = await this.analyzeCode(project);

    return {
      status: issues.length === 0 ? 'passed' : 'failed',
      category: 'codeQuality',
      startTime: new Date(),
      endTime: new Date(),
      duration: 100,
      failed: issues.length,
      details: { issues },
      suggestions: issues.map(issue => `Fix: ${issue.message}`)
    };
  }

  private async analyzeCode(project: Project): Promise<Issue[]> {
    // Implementation
    return [];
  }
}
```

## 📚 Next Steps

- **[Architecture](./architecture.md)**: System design and components
- **[Plugin Development](./plugins.md)**: Create custom extensions
- **[Contributing](./contributing.md)**: Join the development effort
- **[Examples](../examples/)**: Practical usage examples

For more detailed examples and advanced usage, see the [examples](../examples/) directory.</content>
<parameter name="filePath">e:\Polymath Universata\EchainQaAgent\docs\developer-guide\api.md