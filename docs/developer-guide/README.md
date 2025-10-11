# 🛠️ Developer Guide

Comprehensive documentation for developers working on or extending echain-qa-agent, including architecture, APIs, plugin development, and contribution guidelines.

## 📋 Table of Contents

- [Architecture](./architecture.md) - System design and components
- [API Reference](./api.md) - Complete API documentation
- [Plugin Development](./plugins.md) - Create custom plugins and extensions
- [Contributing](./contributing.md) - How to contribute to the project

## 🎯 Who This Guide Is For

This guide is designed for:

- **Core Contributors**: Developers working on the echain-qa-agent codebase
- **Plugin Developers**: Those creating custom checkers, reporters, or integrations
- **System Integrators**: Teams integrating QA agent into complex CI/CD pipelines
- **Advanced Users**: Developers who want to understand the internals for better usage

## 🏗️ Getting Started with Development

### Prerequisites

```bash
# Required tools
Node.js >= 18.0.0
TypeScript >= 4.9.0
Git >= 2.30.0

# Development dependencies
npm install -g typescript @types/node
```

### Development Setup

```bash
# Clone the repository
git clone https://github.com/polymathuniversata/echain-qa-agent.git
cd echain-qa-agent

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development mode
npm run dev
```

### Project Structure

```
src/
├── api-server.ts          # HTTP API server
├── cli.ts                 # Command-line interface
├── index.ts               # Main entry point
├── mcp-server.ts          # MCP protocol server
├── qa-agent.ts            # Core QA engine
├── cache-manager.ts       # Caching system
├── configuration-manager.ts # Configuration handling
├── plugin-manager.ts      # Plugin system
├── secure-plugin-loader.ts # Security for plugins
├── command-executor.ts    # Command execution
├── code-quality-checker.ts # Code quality checks
├── security-scanner.ts    # Security analysis
├── test-runner.ts         # Test execution
├── build-verifier.ts      # Build verification
├── git-hooks-manager.ts   # Git hooks management
├── logger.ts              # Logging system
├── project-detector.ts    # Framework detection
├── report-generator.ts    # Report generation
└── interactive-setup.ts   # Interactive setup wizard

docs/                      # Documentation
test/                      # Test files
scripts/                   # Build and utility scripts
```

## 🔧 Development Workflow

### Code Standards

```json
// .eslintrc.js
module.exports = {
  extends: ['@echain-qa/eslint-config'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    'no-console': 'warn'
  }
}
```

### Testing Strategy

```typescript
// Unit tests
describe('QAAgent', () => {
  it('should run basic checks', async () => {
    const agent = new QAAgent(config);
    const result = await agent.run();
    expect(result.status).toBe('passed');
  });
});

// Integration tests
describe('Full QA Pipeline', () => {
  it('should handle Hardhat project', async () => {
    const result = await runQAOnProject('hardhat-project');
    expect(result.checks.codeQuality).toBeDefined();
    expect(result.checks.testing).toBeDefined();
  });
});
```

### Commit Guidelines

```bash
# Commit message format
<type>(<scope>): <description>

# Types
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Code style changes
refactor: Code refactoring
test:     Testing
chore:    Maintenance

# Examples
feat(cli): add --verbose flag
fix(security): resolve vulnerability in dependency scanner
docs(api): update plugin interface documentation
```

## 🧩 Plugin Architecture

### Plugin Types

```typescript
// Checker Plugin
export interface CheckerPlugin {
  name: string;
  check(project: Project): Promise<CheckResult>;
}

// Reporter Plugin
export interface ReporterPlugin {
  name: string;
  report(results: CheckResults): Promise<void>;
}

// Hook Plugin
export interface HookPlugin {
  name: string;
  preCheck?(): Promise<void>;
  postCheck?(): Promise<void>;
}
```

### Creating a Plugin

```typescript
import { CheckerPlugin, CheckResult, Project } from 'echain-qa-agent';

export class CustomChecker implements CheckerPlugin {
  name = 'custom-checker';

  async check(project: Project): Promise<CheckResult> {
    // Your custom logic here
    const issues = await this.analyze(project);

    return {
      status: issues.length === 0 ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      details: { issues },
      suggestions: issues.map(fixIssue)
    };
  }
}
```

### Plugin Registration

```typescript
// plugin/index.ts
import { PluginRegistry } from 'echain-qa-agent';
import { CustomChecker } from './CustomChecker';

export function registerPlugins(registry: PluginRegistry) {
  registry.registerChecker(new CustomChecker());
}
```

## 🔌 Extension Points

### Custom Checkers

```typescript
export interface CustomChecker extends CheckerPlugin {
  category: 'codeQuality' | 'testing' | 'security' | 'build';
  priority: number;
  dependencies?: string[];
}
```

### Custom Reporters

```typescript
export interface CustomReporter extends ReporterPlugin {
  format: 'json' | 'xml' | 'html' | 'markdown';
  supportsRealtime?: boolean;

  generateReport(results: CheckResults): Promise<string>;
}
```

### Framework Detectors

```typescript
export interface FrameworkDetector {
  name: string;
  priority: number;

  detect(project: Project): Promise<boolean>;
  getConfig(project: Project): Promise<FrameworkConfig>;
}
```

## 🏛️ System Architecture

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CLI Layer     │    │   API Layer     │    │   MCP Layer     │
│                 │    │                 │    │                 │
│ • Command       │    │ • REST API      │    │ • MCP Protocol  │
│   parsing       │    │ • WebSocket     │    │ • Tool calls     │
│ • Option        │    │ • GraphQL       │    │ • Context       │
│   handling      │    │ • Authentication│    │   management    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Core Engine   │
                    │                 │
                    │ • QA Agent      │
                    │ • Plugin System │
                    │ • Configuration │
                    │ • Cache Manager │
                    │ • Report Gen    │
                    └─────────────────┘
                             │
                    ┌─────────────────┐
                    │  Check Modules  │
                    │                 │
                    │ • Code Quality  │
                    │ • Testing       │
                    │ • Security      │
                    │ • Build         │
                    └─────────────────┘
```

### Data Flow

```
User Input → CLI/API/MCP → Configuration → Project Detection
    ↓
Plugin Loading → Check Execution → Result Processing
    ↓
Report Generation → Output Formatting → User Feedback
```

## 🔒 Security Considerations

### Plugin Security

```typescript
// Secure plugin loading
export class SecurePluginLoader {
  async loadPlugin(path: string): Promise<Plugin> {
    // Validate plugin metadata
    const metadata = await this.validateMetadata(path);

    // Sandbox execution
    const sandbox = new PluginSandbox();
    return await sandbox.load(path, metadata);
  }
}
```

### Input Validation

```typescript
export class InputValidator {
  validateConfig(config: any): ValidationResult {
    const schema = this.getConfigSchema();
    return this.validateAgainstSchema(config, schema);
  }

  validateProjectPath(path: string): boolean {
    // Prevent directory traversal
    return !path.includes('..') && path.startsWith('/');
  }
}
```

## 📊 Performance Optimization

### Caching Strategy

```typescript
export class IntelligentCache {
  async get<T>(key: string, ttl: number): Promise<T | null> {
    const cached = await this.store.get(key);
    if (cached && this.isValid(cached, ttl)) {
      return cached.data;
    }
    return null;
  }

  async set<T>(key: string, data: T): Promise<void> {
    await this.store.set(key, {
      data,
      timestamp: Date.now(),
      version: this.getVersion()
    });
  }
}
```

### Parallel Execution

```typescript
export class ParallelExecutor {
  async execute<T>(
    tasks: (() => Promise<T>)[],
    options: { maxConcurrency: number }
  ): Promise<T[]> {
    const semaphore = new Semaphore(options.maxConcurrency);
    const results = await Promise.all(
      tasks.map(task => semaphore.acquire().then(task))
    );
    return results;
  }
}
```

## 🧪 Testing Infrastructure

### Test Categories

```typescript
// Unit tests
describe('CacheManager', () => {
  // Test individual components
});

// Integration tests
describe('QAPipeline', () => {
  // Test component interactions
});

// E2E tests
describe('CLI Commands', () => {
  // Test full user workflows
});

// Performance tests
describe('Performance Benchmarks', () => {
  // Test performance characteristics
});
```

### Test Utilities

```typescript
export class TestHelpers {
  static createMockProject(type: string): Project {
    return {
      root: '/tmp/test-project',
      type,
      files: ['package.json', 'hardhat.config.ts'],
      config: {}
    };
  }

  static createMockCheckResult(status: CheckStatus): CheckResult {
    return {
      status,
      duration: 100,
      details: {},
      suggestions: []
    };
  }
}
```

## 📚 API Documentation

### Core Classes

```typescript
export class QAAgent {
  constructor(config: QAConfig);

  async run(): Promise<QAResult>;
  async runCheck(checkName: string): Promise<CheckResult>;
  async getStatus(): Promise<QAStatus>;
}

export interface QAConfig {
  project: ProjectConfig;
  checks: CheckConfig;
  caching: CacheConfig;
  plugins: PluginConfig[];
}

export interface QAResult {
  summary: QASummary;
  checks: CheckResults;
  metadata: Metadata;
}
```

### Plugin Interfaces

```typescript
export interface Plugin {
  name: string;
  version: string;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
}

export interface CheckerPlugin extends Plugin {
  check(project: Project): Promise<CheckResult>;
}

export interface ReporterPlugin extends Plugin {
  report(results: CheckResults): Promise<void>;
}
```

## 🤝 Contributing

### Development Process

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Review Process

- All PRs require review from at least 2 maintainers
- CI checks must pass
- Code coverage must not decrease
- Documentation must be updated
- Breaking changes require discussion

### Release Process

```bash
# Version bump
npm version patch  # or minor, major

# Build and test
npm run build
npm test

# Publish
npm publish

# Create GitHub release
# Update changelog
```

## 📞 Support & Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community discussion
- **Discord**: Real-time chat for developers
- **Documentation**: Comprehensive guides and API reference

### Getting Help

1. Check the [FAQ](../faq.md)
2. Search existing [issues](https://github.com/polymathuniversata/echain-qa-agent/issues)
3. Ask in [discussions](https://github.com/polymathuniversata/echain-qa-agent/discussions)
4. Join our [Discord](https://discord.gg/echain-qa)

## 📋 Next Steps

- **[Architecture](./architecture.md)**: Deep dive into system design
- **[API Reference](./api.md)**: Complete API documentation
- **[Plugin Development](./plugins.md)**: Create custom extensions
- **[Contributing](./contributing.md)**: Join the development effort

Happy coding! 🚀</content>
<parameter name="filePath">e:\Polymath Universata\EchainQaAgent\docs\developer-guide\README.md