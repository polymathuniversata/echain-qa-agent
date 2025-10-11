# ⚡ Advanced Features

Unlock the full potential of echain-qa-agent with advanced features like caching, plugins, custom configurations, and performance optimizations.

## 📋 Table of Contents

- [Caching System](#-caching-system)
- [Plugin Architecture](#-plugin-architecture)
- [Custom Configurations](#-custom-configurations)
- [Performance Optimization](#-performance-optimization)
- [Parallel Processing](#-parallel-processing)
- [Selective Execution](#-selective-execution)
- [Custom Checkers](#-custom-checkers)
- [Integration APIs](#-integration-apis)

## 🗄️ Caching System

### Overview

The caching system dramatically speeds up repeated QA runs by storing results of expensive operations and reusing them when files haven't changed.

### Cache Types

| Cache Type | Purpose | Location | Lifetime |
|------------|---------|----------|----------|
| **Results Cache** | Check results | `.qa-cache/results/` | Until files change |
| **Dependency Cache** | Package analysis | `.qa-cache/deps/` | Until package.json changes |
| **Build Cache** | Compilation artifacts | `.qa-cache/build/` | Until source changes |
| **Security Cache** | Vulnerability scans | `.qa-cache/security/` | 24 hours |

### Cache Management

```bash
# Clear all caches
echain-qa run --no-cache

# Clear specific cache
echain-qa run --clear-cache results
echain-qa run --clear-cache deps
echain-qa run --clear-cache build

# Show cache status
echain-qa run --cache-status
```

### Cache Configuration

```json
{
  "caching": {
    "enabled": true,
    "maxAge": {
      "results": "1h",
      "deps": "24h",
      "build": "1h",
      "security": "24h"
    },
    "compression": true,
    "maxSize": "500MB"
  }
}
```

### Performance Impact

```
Without Cache: 45.2s
With Cache:     8.7s
Speedup:        5.2x faster
```

## 🔌 Plugin Architecture

### Plugin Types

| Plugin Type | Purpose | Examples |
|-------------|---------|----------|
| **Checker Plugins** | Add new checks | `solidity-checker`, `gas-optimizer` |
| **Reporter Plugins** | Custom output | `slack-reporter`, `jira-updater` |
| **Hook Plugins** | Lifecycle events | `pre-commit-hook`, `ci-optimizer` |
| **Integration Plugins** | External tools | `hardhat-integration`, `foundry-support` |

### Installing Plugins

```bash
# Install from npm
npm install @echain-qa/solidity-checker
npm install @echain-qa/slack-reporter

# Enable in configuration
{
  "plugins": [
    "@echain-qa/solidity-checker",
    "@echain-qa/slack-reporter"
  ]
}
```

### Creating Custom Plugins

```typescript
// plugin/my-custom-checker.ts
import { QAPlugin, CheckResult } from 'echain-qa-agent';

export class MyCustomChecker implements QAPlugin {
  name = 'my-custom-checker';
  version = '1.0.0';

  async check(project: Project): Promise<CheckResult> {
    // Your custom logic here
    return {
      status: 'passed',
      details: { customMetric: 95 }
    };
  }
}

export default MyCustomChecker;
```

### Plugin Configuration

```json
{
  "plugins": {
    "@echain-qa/solidity-checker": {
      "enabled": true,
      "config": {
        "strict": true,
        "ignorePaths": ["test/**"]
      }
    },
    "@echain-qa/slack-reporter": {
      "webhook": "https://hooks.slack.com/...",
      "channel": "#qa-notifications"
    }
  }
}
```

## ⚙️ Custom Configurations

### Configuration Hierarchy

Configurations are merged in this order (later overrides earlier):

1. **Built-in defaults** (`src/config/defaults.json`)
2. **Global config** (`~/.echain-qa/config.json`)
3. **Project config** (`.qa-config.json`)
4. **Environment variables** (`QA_*`)
5. **Command-line flags**

### Project Configuration

```json
{
  "$schema": "./node_modules/echain-qa-agent/schema.json",
  "project": {
    "name": "MyDeFiProtocol",
    "type": "blockchain",
    "frameworks": ["hardhat", "nextjs"],
    "version": "1.0.0"
  },
  "checks": {
    "codeQuality": {
      "enabled": true,
      "eslint": {
        "config": ".eslintrc.js",
        "fix": false
      },
      "prettier": {
        "config": ".prettierrc",
        "write": false
      }
    },
    "testing": {
      "enabled": true,
      "unit": {
        "pattern": "**/*.test.ts",
        "timeout": 10000
      },
      "integration": {
        "pattern": "**/*.integration.test.ts",
        "setup": "./test/setup.ts"
      }
    },
    "security": {
      "enabled": true,
      "audit": {
        "level": "moderate",
        "ignore": ["CVE-2021-12345"]
      },
      "secrets": {
        "patterns": ["*.key", "*.pem"],
        "exclude": ["test/fixtures/**"]
      }
    },
    "build": {
      "enabled": true,
      "commands": [
        "npm run compile",
        "npm run build"
      ],
      "artifacts": ["artifacts/**", "build/**"]
    }
  },
  "caching": {
    "enabled": true,
    "maxAge": "24h"
  },
  "reporting": {
    "format": "json",
    "output": "qa-report.json",
    "includeLogs": true
  }
}
```

### Environment Variables

```bash
# Configuration
export QA_CONFIG_FILE=".qa-config.json"
export QA_VERBOSE="true"
export QA_QUIET="false"

# Project settings
export QA_PROJECT_NAME="MyProject"
export QA_PROJECT_TYPE="blockchain"

# Check settings
export QA_SKIP_LINTING="false"
export QA_SKIP_TESTING="false"
export QA_SKIP_SECURITY="false"

# Output settings
export QA_OUTPUT_FORMAT="json"
export QA_OUTPUT_FILE="qa-report.json"
export QA_LOG_FILE="docs/qalog.md"
```

### Conditional Configuration

```json
{
  "checks": {
    "codeQuality": {
      "enabled": true,
      "rules": {
        "if": { "framework": "hardhat" },
        "then": {
          "solidity": {
            "version": "^0.8.0",
            "optimizer": true
          }
        }
      }
    }
  }
}
```

## 🚀 Performance Optimization

### Optimization Strategies

| Strategy | Impact | Implementation |
|----------|---------|----------------|
| **Caching** | 5-10x speedup | Automatic (default) |
| **Parallel Processing** | 2-4x speedup | `--parallel` flag |
| **Selective Execution** | 2-3x speedup | `--skip-*` flags |
| **Incremental Checks** | 3-5x speedup | Git-aware checking |

### Performance Tuning

```bash
# Maximum performance
echain-qa run --parallel --cache --incremental

# Balanced performance
echain-qa run --parallel

# Minimal resource usage
echain-qa run --sequential --no-cache
```

### Resource Management

```json
{
  "performance": {
    "parallel": {
      "enabled": true,
      "maxWorkers": 4,
      "memoryLimit": "1GB"
    },
    "caching": {
      "enabled": true,
      "compression": true
    },
    "incremental": {
      "enabled": true,
      "gitAware": true
    }
  }
}
```

## ⚡ Parallel Processing

### How It Works

The QA agent can run multiple checks simultaneously to reduce total execution time.

### Parallel Configuration

```json
{
  "parallel": {
    "enabled": true,
    "maxWorkers": 4,
    "strategy": "balanced",
    "groups": {
      "fast": ["linting", "formatting"],
      "slow": ["testing", "security"],
      "sequential": ["build"]
    }
  }
}
```

### Performance Comparison

```
Sequential:  45.2s
Parallel (2): 28.7s  (1.6x speedup)
Parallel (4): 18.3s  (2.5x speedup)
Parallel (8): 15.1s  (3.0x speedup)
```

### Memory Considerations

```json
{
  "parallel": {
    "memoryLimit": "2GB",
    "workerMemory": "512MB",
    "gcThreshold": "1GB"
  }
}
```

## 🎯 Selective Execution

### Skip Options

```bash
# Skip entire categories
echain-qa run --skip-code-quality
echain-qa run --skip-testing
echain-qa run --skip-security
echain-qa run --skip-build

# Skip specific checks
echain-qa run --skip-eslint --skip-prettier
echain-qa run --skip-unit-tests --skip-integration-tests

# Run only specific checks
echain-qa run --only code-quality,testing
```

### Conditional Execution

```json
{
  "checks": {
    "security": {
      "enabled": true,
      "conditions": {
        "branch": "main",
        "event": "push"
      }
    },
    "performance": {
      "enabled": true,
      "conditions": {
        "files": ["src/**/*.sol"],
        "not": { "branch": "feature/*" }
      }
    }
  }
}
```

### Git-Aware Execution

```bash
# Check only changed files
echain-qa run --incremental

# Check specific files
echain-qa run --files "src/contracts/*.sol"

# Check by commit range
echain-qa run --range HEAD~5..HEAD
```

## 🛠️ Custom Checkers

### Creating Checkers

```typescript
import { BaseChecker, CheckResult, Project } from 'echain-qa-agent';

export class CustomSecurityChecker extends BaseChecker {
  name = 'custom-security';
  category = 'security';

  async execute(project: Project): Promise<CheckResult> {
    const issues = await this.scanForIssues(project);

    return {
      status: issues.length === 0 ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      details: {
        issues: issues.map(issue => ({
          file: issue.file,
          line: issue.line,
          message: issue.message,
          severity: issue.severity
        }))
      },
      suggestions: issues.map(issue => `Fix ${issue.message} in ${issue.file}`)
    };
  }

  private async scanForIssues(project: Project): Promise<SecurityIssue[]> {
    // Your custom scanning logic
    return [];
  }
}
```

### Checker Registration

```typescript
// In your plugin
import { CheckerRegistry } from 'echain-qa-agent';

export function registerCheckers(registry: CheckerRegistry) {
  registry.register(new CustomSecurityChecker());
  registry.register(new GasOptimizationChecker());
}
```

### Checker Configuration

```json
{
  "checkers": {
    "custom-security": {
      "enabled": true,
      "config": {
        "strict": true,
        "ignore": ["test/**"]
      }
    }
  }
}
```

## 🔗 Integration APIs

### Programmatic Usage

```typescript
import { QAAgent, QAConfig } from 'echain-qa-agent';

async function runQA() {
  const config: QAConfig = {
    project: { name: 'MyProject', type: 'blockchain' },
    checks: { codeQuality: true, testing: true }
  };

  const agent = new QAAgent(config);
  const result = await agent.run();

  console.log(`Status: ${result.summary.status}`);
  console.log(`Duration: ${result.summary.duration}ms`);
  console.log(`Errors: ${result.summary.errors}`);
}
```

### Event System

```typescript
import { QAAgent, QACheckEvent } from 'echain-qa-agent';

const agent = new QAAgent(config);

agent.on('check:start', (event: QACheckEvent) => {
  console.log(`Starting ${event.checkName}...`);
});

agent.on('check:complete', (event: QACheckEvent) => {
  console.log(`${event.checkName} completed in ${event.duration}ms`);
});

agent.on('error', (error: QAError) => {
  console.error(`QA Error: ${error.message}`);
});

await agent.run();
```

### Custom Reporters

```typescript
import { Reporter, QAResult } from 'echain-qa-agent';

export class SlackReporter implements Reporter {
  constructor(private webhookUrl: string) {}

  async report(result: QAResult): Promise<void> {
    const message = {
      text: `QA ${result.summary.status === 'passed' ? '✅' : '❌'}`,
      attachments: [{
        fields: [
          { title: 'Duration', value: `${result.summary.duration}ms` },
          { title: 'Errors', value: result.summary.errors.toString() },
          { title: 'Warnings', value: result.summary.warnings.toString() }
        ]
      }]
    };

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  }
}
```

### CI/CD Integration

```yaml
# .github/workflows/qa.yml
name: QA Checks
on: [push, pull_request]

jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx echain-qa run --json --output qa-report.json
      - uses: actions/upload-artifact@v3
        with:
          name: qa-report
          path: qa-report.json
```

## 📊 Monitoring & Analytics

### Metrics Collection

```json
{
  "monitoring": {
    "enabled": true,
    "metrics": {
      "performance": true,
      "errors": true,
      "usage": true
    },
    "export": {
      "format": "prometheus",
      "endpoint": "http://metrics.example.com"
    }
  }
}
```

### Performance Dashboard

```
QA Performance Dashboard
════════════════════════

Average Execution Time: 12.3s
Cache Hit Rate: 87%
Parallel Efficiency: 92%

Recent Runs:
• main (45s) ✅
• feature/auth (38s) ⚠️
• hotfix/bug (52s) ❌

Top Slow Checks:
1. Security Scan: 8.2s
2. Integration Tests: 6.1s
3. Build Verification: 4.8s
```

## 🔧 Advanced Troubleshooting

### Debug Mode

```bash
# Enable debug logging
echain-qa run --debug

# Debug specific component
echain-qa run --debug caching,plugins

# Verbose plugin loading
echain-qa run --debug plugins
```

### Performance Profiling

```bash
# Profile execution
echain-qa run --profile

# Profile specific checks
echain-qa run --profile testing,security

# Output profile data
echain-qa run --profile --profile-output profile.json
```

### Memory Analysis

```bash
# Monitor memory usage
echain-qa run --memory-monitor

# Set memory limits
echain-qa run --max-memory 2GB

# Debug memory issues
echain-qa run --debug memory
```

## 📚 Next Steps

- **[Git Integration](./git-integration.md)**: Hooks, automation, CI/CD
- **[Configuration Reference](../configuration/)**: Complete config options
- **[Plugin Development](../developer-guide/plugins.md)**: Create custom plugins
- **[API Reference](../api/)**: Programmatic usage

Need help? Check the [FAQ](../faq.md) or create an [issue](https://github.com/polymathuniversata/echain-qa-agent/issues).</content>
<parameter name="filePath">e:\Polymath Universata\EchainQaAgent\docs\user-guide\advanced-features.md