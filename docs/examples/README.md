# 📚 Examples

Practical examples and templates for using echain-qa-agent in different scenarios and frameworks.

## 📋 Table of Contents

- [Quick Start Examples](#-quick-start-examples)
- [Framework Examples](#-framework-examples)
- [Plugin Examples](#-plugin-examples)
- [Configuration Templates](#-configuration-templates)
- [CI/CD Integration](#-cicd-integration)
- [Advanced Usage](#-advanced-usage)

## 🚀 Quick Start Examples

### Basic CLI Usage

```bash
# Initialize QA in a new project
npx echain-qa init

# Run all checks
npx echain-qa run

# Run specific checks
npx echain-qa run --checks codeQuality,testing

# Run with custom config
npx echain-qa run --config ./my-config.json

# Generate HTML report
npx echain-qa run --report html --output ./reports

# Watch mode for development
npx echain-qa watch
```

### Basic Configuration

```json
{
  "project": {
    "name": "MyProject",
    "type": "blockchain",
    "frameworks": ["hardhat"]
  },
  "checks": {
    "codeQuality": true,
    "testing": true,
    "security": true
  }
}
```

### Programmatic Usage

```typescript
import { QAAgent, QAConfig } from 'echain-qa-agent';

async function runQA() {
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
  const result = await agent.run();

  console.log(`Status: ${result.summary.status}`);
  console.log(`Passed: ${result.summary.passedChecks}`);
  console.log(`Failed: ${result.summary.failedChecks}`);
}

runQA().catch(console.error);
```

## 🏗️ Framework Examples

### Hardhat Project

#### Project Structure
```
hardhat-example/
├── contracts/
│   ├── Token.sol
│   └── Vault.sol
├── test/
│   ├── Token.test.ts
│   └── Vault.test.ts
├── scripts/
│   └── deploy.ts
├── .qa-config.json
├── hardhat.config.ts
└── package.json
```

#### Configuration
```json
{
  "project": {
    "name": "HardhatExample",
    "type": "blockchain",
    "frameworks": ["hardhat"],
    "files": [
      "contracts/**/*.sol",
      "test/**/*.ts",
      "scripts/**/*.ts"
    ]
  },
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19",
        "optimizer": true
      },
      "typescript": {
        "strict": true
      }
    },
    "testing": {
      "unit": {
        "command": "npx hardhat test",
        "timeout": 30000
      },
      "coverage": {
        "command": "npx hardhat coverage",
        "threshold": {
          "branches": 80,
          "functions": 85,
          "lines": 80,
          "statements": 80
        }
      }
    },
    "security": {
      "slither": {
        "excludeDependencies": true
      }
    }
  }
}
```

#### Usage
```bash
cd hardhat-example
npx echain-qa run
```

### Foundry Project

#### Project Structure
```
foundry-example/
├── src/
│   ├── Token.sol
│   └── Vault.sol
├── test/
│   ├── Token.t.sol
│   └── Vault.t.sol
├── script/
│   └── Deploy.s.sol
├── .qa-config.json
├── foundry.toml
└── package.json
```

#### Configuration
```json
{
  "project": {
    "name": "FoundryExample",
    "type": "blockchain",
    "frameworks": ["foundry"]
  },
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19",
        "optimizer": true
      }
    },
    "testing": {
      "unit": {
        "command": "forge test",
        "verbosity": 2
      },
      "coverage": {
        "command": "forge coverage",
        "threshold": {
          "branches": 75,
          "functions": 80,
          "lines": 75,
          "statements": 75
        }
      }
    },
    "security": {
      "slither": true
    }
  }
}
```

### Next.js + Hardhat Full-Stack

#### Project Structure
```
fullstack-example/
├── contracts/
│   ├── Token.sol
│   └── Vault.sol
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── hooks/
│   ├── test/
│   └── package.json
├── backend/
│   ├── src/
│   └── package.json
├── .qa-config.json
├── hardhat.config.ts
└── package.json
```

#### Configuration
```json
{
  "project": {
    "name": "FullStackExample",
    "type": "fullstack",
    "frameworks": ["hardhat", "nextjs", "react"]
  },
  "checks": {
    "codeQuality": {
      "solidity": true,
      "typescript": {
        "strict": true
      },
      "eslint": {
        "extends": ["next/core-web-vitals"]
      }
    },
    "testing": {
      "unit": {
        "parallel": [
          {
            "name": "contracts",
            "command": "npx hardhat test"
          },
          {
            "name": "frontend",
            "command": "cd frontend && npm test"
          }
        ]
      },
      "coverage": {
        "parallel": [
          {
            "name": "contracts",
            "command": "npx hardhat coverage"
          },
          {
            "name": "frontend",
            "command": "cd frontend && npm run coverage"
          }
        ]
      }
    },
    "security": {
      "slither": true,
      "secrets": true
    }
  }
}
```

## 🔌 Plugin Examples

### Custom Checker Plugin

#### Plugin Structure
```
my-custom-checker/
├── src/
│   ├── index.ts
│   └── checker.ts
├── test/
│   └── checker.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

#### Implementation
```typescript
// src/checker.ts
import { QAResults } from 'echain-qa-agent';

// Plugin interface (matches what the QA Agent expects)
export interface QAPlugin {
  name: string;
  version: string;
  description?: string;
  run: (qaAgent: any) => Promise<QAResults>;
}

export interface CustomCheckerConfig {
  strict?: boolean;
  maxLines?: number;
  excludePatterns?: string[];
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
    } catch (error) {
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
```

#### Configuration Usage
```json
{
  "plugins": [
    {
      "name": "./plugins/my-custom-checker",
      "enabled": true,
      "config": {
        "strict": true
      }
    }
  ]
}
```

### Reporter Plugin

#### Implementation
```typescript
import { ReporterPlugin, Report, CheckResults } from 'echain-qa-agent';

export class CustomReporter implements ReporterPlugin {
  name = 'custom-reporter';
  version = '1.0.0';
  supportedFormats = ['json', 'xml'];

  async generateReport(results: CheckResults, format: string): Promise<Report> {
    const data = this.processResults(results);

    switch (format) {
      case 'json':
        return this.generateJSONReport(data);
      case 'xml':
        return this.generateXMLReport(data);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private processResults(results: CheckResults) {
    // Process results into custom format
  }

  private generateJSONReport(data: any): Report {
    return {
      id: `custom-report-${Date.now()}`,
      format: 'json',
      timestamp: new Date(),
      version: this.version,
      title: 'Custom QA Report',
      summary: 'Custom report summary',
      content: JSON.stringify(data, null, 2),
      sections: []
    };
  }

  private generateXMLReport(data: any): Report {
    // Generate XML report
  }
}
```

## 📋 Configuration Templates

### Minimal Configuration

```json
{
  "project": {
    "name": "MyProject",
    "type": "blockchain"
  }
}
```

### Development Configuration

```json
{
  "project": {
    "name": "DevProject",
    "type": "blockchain",
    "frameworks": ["hardhat"]
  },
  "checks": {
    "codeQuality": {
      "fix": true
    },
    "testing": true
  },
  "caching": {
    "enabled": false
  },
  "performance": {
    "parallel": false
  }
}
```

### Production Configuration

```json
{
  "project": {
    "name": "ProdProject",
    "type": "blockchain",
    "frameworks": ["hardhat"]
  },
  "checks": {
    "codeQuality": true,
    "testing": true,
    "security": {
      "level": "high"
    },
    "build": {
      "verify": true
    }
  },
  "caching": {
    "enabled": true,
    "ttl": {
      "security": "24h"
    }
  },
  "performance": {
    "parallel": true,
    "maxConcurrency": 4
  }
}
```

### CI/CD Configuration

```json
{
  "project": {
    "name": "CIProject",
    "type": "blockchain",
    "frameworks": ["hardhat"]
  },
  "checks": {
    "codeQuality": {
      "fix": false
    },
    "testing": {
      "bail": true
    },
    "security": true,
    "build": true
  },
  "caching": {
    "enabled": true,
    "ttl": {
      "results": "24h"
    }
  },
  "reporting": {
    "format": "junit",
    "output": "./test-results"
  },
  "performance": {
    "parallel": true,
    "failFast": true
  }
}
```

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/qa.yml
name: QA Checks

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  qa:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Install Foundry
      uses: foundry-rs/foundry-toolchain@v1

    - name: Run QA checks
      run: npx echain-qa run --config .qa-config.json

    - name: Upload reports
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: qa-reports
        path: qa-reports/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - qa

qa-checks:
  stage: qa
  image: node:18
  before_script:
    - npm ci
    - curl -L https://foundry.paradigm.xyz | bash
    - export PATH="$PATH:$HOME/.foundry/bin"
    - foundryup
  script:
    - npx echain-qa run --config .qa-config.json
  artifacts:
    reports:
      junit: qa-reports/junit.xml
    paths:
      - qa-reports/
    expire_in: 1 week
  only:
    - merge_requests
    - main
```

### Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent {
        docker {
            image 'node:18'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    stages {
        stage('QA Checks') {
            steps {
                sh 'npm ci'
                sh 'npx echain-qa run --config .qa-config.json --report junit'
            }
            post {
                always {
                    junit 'qa-reports/junit.xml'
                    publishHTML([
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'qa-reports',
                        reportFiles: 'index.html',
                        reportName: 'QA Report'
                    ])
                }
            }
        }
    }
}
```

### Pre-commit Hooks

```bash
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: qa-checks
        name: QA Checks
        entry: npx echain-qa run --checks codeQuality
        language: system
        files: \.(sol|ts|js)$
        pass_filenames: false

# Install: pre-commit install
```

## ⚡ Advanced Usage

### Custom Scripts

```json
{
  "scripts": {
    "qa": "echain-qa run",
    "qa:watch": "echain-qa watch",
    "qa:fix": "echain-qa run --fix",
    "qa:security": "echain-qa run --checks security",
    "qa:ci": "echain-qa run --config .qa-config.ci.json"
  }
}
```

### Programmatic API Usage

```typescript
import { QAAgent, QAConfig, CheckResults } from 'echain-qa-agent';

class CustomQARunner {
  private agent: QAAgent;

  constructor(config: QAConfig) {
    this.agent = new QAAgent(config);
  }

  async runAllChecks(): Promise<CheckResults> {
    return await this.agent.run();
  }

  async runSpecificChecks(checks: string[]): Promise<CheckResults> {
    const results: CheckResults = {};

    for (const check of checks) {
      results[check] = await this.agent.runCheck(check);
    }

    return results;
  }

  async runWithCustomConfig(customConfig: Partial<QAConfig>): Promise<CheckResults> {
    await this.agent.updateConfig(customConfig);
    return await this.agent.run();
  }
}

// Usage
const runner = new CustomQARunner(config);
const results = await runner.runAllChecks();
```

### Plugin Development Workflow

```typescript
import { PluginManager } from 'echain-qa-agent';

class PluginDevelopmentHelper {
  private pluginManager: PluginManager;

  constructor() {
    this.pluginManager = new PluginManager({
      pluginDir: './plugins',
      sandbox: false // Disable sandbox for development
    });
  }

  async developPlugin(pluginPath: string) {
    // Load plugin in development mode
    const plugin = await this.pluginManager.loadPlugin(pluginPath);

    // Test plugin
    const testResult = await this.testPlugin(plugin);

    // Reload plugin after changes
    await this.pluginManager.reloadPlugin(plugin.name);

    return testResult;
  }

  private async testPlugin(plugin: any) {
    // Test plugin functionality
  }
}
```

### Custom Reporting

```typescript
import { QAAgent, ReportGenerator } from 'echain-qa-agent';

class CustomReportGenerator {
  private reportGenerator: ReportGenerator;

  constructor() {
    this.reportGenerator = new ReportGenerator();
  }

  async generateCustomReport(results: CheckResults): Promise<string> {
    const summary = this.createSummary(results);
    const details = this.createDetails(results);
    const recommendations = this.createRecommendations(results);

    return this.formatReport(summary, details, recommendations);
  }

  private createSummary(results: CheckResults) {
    // Create custom summary
  }

  private createDetails(results: CheckResults) {
    // Create custom details
  }

  private createRecommendations(results: CheckResults) {
    // Generate recommendations
  }

  private formatReport(summary: any, details: any, recommendations: any): string {
    // Format as custom report
  }
}
```

## 📁 Directory Structure

```
examples/
├── quick-start/
│   ├── basic-cli/
│   ├── basic-config/
│   └── programmatic/
├── frameworks/
│   ├── hardhat/
│   ├── foundry/
│   ├── truffle/
│   ├── brownie/
│   └── fullstack/
├── plugins/
│   ├── checker/
│   ├── reporter/
│   └── hook/
├── configurations/
│   ├── minimal/
│   ├── development/
│   ├── production/
│   └── ci-cd/
├── cicd/
│   ├── github-actions/
│   ├── gitlab-ci/
│   ├── jenkins/
│   └── pre-commit/
└── advanced/
    ├── custom-scripts/
    ├── programmatic-api/
    └── custom-reporting/
```

## 📖 Next Steps

- **[User Guide](../user-guide/)**: Complete usage guide
- **[Configuration](../configuration/)**: Configuration reference
- **[Plugin Development](../developer-guide/plugins.md)**: Create custom plugins
- **[Troubleshooting](../troubleshooting.md)**: Common issues and solutions

For more examples and templates, explore the subdirectories in this examples folder.</content>
<parameter name="filePath">e:\Polymath Universata\EchainQaAgent\docs\examples\README.md