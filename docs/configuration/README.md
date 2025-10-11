# ⚙️ Configuration Reference

Complete guide to configuring echain-qa-agent for different project types, frameworks, and use cases.

## 📋 Table of Contents

- [Configuration Overview](#-configuration-overview)
- [Core Configuration](#-core-configuration)
- [Check Configurations](#-check-configurations)
- [Plugin Configuration](#-plugin-configuration)
- [Framework-Specific Configs](#-framework-specific-configs)
- [Advanced Options](#-advanced-options)
- [Configuration Files](#-configuration-files)
- [Environment Variables](#-environment-variables)
- [Validation](#-validation)
- [Examples](#-examples)

## 🔍 Configuration Overview

echain-qa-agent uses a hierarchical configuration system that allows you to:

- **Configure globally** for all projects
- **Override per-project** with local configuration
- **Use environment variables** for sensitive data
- **Support multiple formats** (JSON, YAML, JavaScript)
- **Validate configuration** automatically
- **Merge configurations** intelligently

### Configuration Hierarchy

```
1. Global config (~/.echain-qa/config.json)
2. Project config (./.qa-config.json)
3. Environment variables
4. Command-line overrides
5. Default values
   (lower number = higher priority)
```

### Configuration Sources

- **Global Configuration**: `~/.echain-qa/config.json` or `~/.echain-qa/config.yaml`
- **Project Configuration**: `./.qa-config.json`, `./.qa-config.yaml`, or `./qa.config.js`
- **Environment Variables**: Prefixed with `ECHAIN_QA_`
- **CLI Overrides**: `--config.key=value` syntax

## 🏗️ Core Configuration

### QAConfig Interface

The main configuration interface that defines all available options.

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

### ProjectConfig

Defines project-specific information and settings.

```typescript
export interface ProjectConfig {
  // Basic project info
  name: string;
  type: 'blockchain' | 'frontend' | 'fullstack' | 'other';
  version?: string;

  // Framework detection and configuration
  frameworks: string[];
  detectedFrameworks?: FrameworkInfo[];

  // File patterns
  root?: string;
  files?: string[];
  exclude?: string[];
  include?: string[];

  // Build and test configuration
  buildCommand?: string;
  testCommand?: string;
  installCommand?: string;

  // Environment
  environment?: 'development' | 'staging' | 'production';
  nodeVersion?: string;
}
```

#### Basic Project Configuration

```json
{
  "project": {
    "name": "MyDeFiProject",
    "type": "blockchain",
    "version": "1.0.0",
    "frameworks": ["hardhat", "nextjs"],
    "root": "./",
    "exclude": [
      "**/node_modules/**",
      "**/artifacts/**",
      "**/cache/**",
      "**/coverage/**",
      "**/.git/**"
    ]
  }
}
```

#### Advanced Project Configuration

```json
{
  "project": {
    "name": "ComplexDeFiProtocol",
    "type": "blockchain",
    "version": "2.1.0",
    "frameworks": ["hardhat", "foundry"],
    "root": "./",
    "files": [
      "contracts/**/*.sol",
      "test/**/*.sol",
      "scripts/**/*.js",
      "src/**/*.ts"
    ],
    "exclude": [
      "**/node_modules/**",
      "**/artifacts/**",
      "**/cache/**",
      "**/typechain/**",
      "**/coverage/**"
    ],
    "buildCommand": "npm run compile",
    "testCommand": "npm run test",
    "installCommand": "npm ci",
    "environment": "development",
    "nodeVersion": "18.0.0"
  }
}
```

## 🔍 Check Configurations

### CheckConfig Interface

Controls which checks are enabled and their specific configurations.

```typescript
export interface CheckConfig {
  // Enable/disable checks
  codeQuality?: boolean | CodeQualityConfig;
  testing?: boolean | TestingConfig;
  security?: boolean | SecurityConfig;
  build?: boolean | BuildConfig;

  // Custom checks
  custom?: CustomCheckConfig[];

  // Global check options
  parallel?: boolean;
  failFast?: boolean;
  timeout?: number;
  retries?: number;
}
```

### Code Quality Configuration

```typescript
export interface CodeQualityConfig {
  // Linting
  eslint?: boolean | ESLintConfig;
  prettier?: boolean | PrettierConfig;

  // Language-specific
  solidity?: boolean | SolidityConfig;
  typescript?: boolean | TypeScriptConfig;
  javascript?: boolean | JavaScriptConfig;

  // General options
  fix?: boolean;
  strict?: boolean;
  ignorePatterns?: string[];
}
```

#### Code Quality Examples

```json
{
  "checks": {
    "codeQuality": {
      "eslint": {
        "fix": true,
        "configFile": "./.eslintrc.js",
        "ignorePatterns": ["**/generated/**", "**/artifacts/**"]
      },
      "prettier": {
        "write": true,
        "configFile": "./.prettierrc"
      },
      "solidity": {
        "compiler": "0.8.19",
        "optimizer": true,
        "viaIR": false
      },
      "typescript": {
        "strict": true,
        "noImplicitAny": true
      }
    }
  }
}
```

### Testing Configuration

```typescript
export interface TestingConfig {
  // Test types
  unit?: boolean | UnitTestConfig;
  integration?: boolean | IntegrationTestConfig;
  e2e?: boolean | E2ETestConfig;

  // Coverage
  coverage?: boolean | CoverageConfig;

  // Test options
  timeout?: number;
  parallel?: boolean;
  bail?: boolean;
}
```

#### Testing Examples

```json
{
  "checks": {
    "testing": {
      "unit": {
        "pattern": "**/*.test.ts",
        "timeout": 10000,
        "slowTestThreshold": 5000
      },
      "integration": {
        "pattern": "**/*.integration.test.ts",
        "setupFile": "./test/setup.ts",
        "network": "hardhat"
      },
      "coverage": {
        "enabled": true,
        "threshold": {
          "branches": 80,
          "functions": 85,
          "lines": 80,
          "statements": 80
        },
        "exclude": [
          "**/node_modules/**",
          "**/test/**",
          "**/artifacts/**"
        ],
        "reporter": ["text", "lcov", "html"]
      }
    }
  }
}
```

### Security Configuration

```typescript
export interface SecurityConfig {
  // Vulnerability scanners
  slither?: boolean | SlitherConfig;
  mythril?: boolean | MythrilConfig;

  // Code analysis
  audit?: boolean | AuditConfig;
  secrets?: boolean | SecretsConfig;

  // Custom security rules
  rules?: SecurityRule[];
}
```

#### Security Examples

```json
{
  "checks": {
    "security": {
      "slither": {
        "excludeDependencies": true,
        "excludeInformational": false,
        "detectors": [
          "reentrancy",
          "unchecked-low-level-call",
          "tx-origin",
          "unprotected-upgrade"
        ]
      },
      "mythril": {
        "maxDepth": 22,
        "solverTimeout": 25000,
        "parallelSolving": true
      },
      "secrets": {
        "enabled": true,
        "patterns": [
          "password",
          "secret",
          "key",
          "token"
        ],
        "exclude": [
          "**/test/**",
          "**/*.md"
        ]
      }
    }
  }
}
```

### Build Configuration

```typescript
export interface BuildConfig {
  // Build verification
  compile?: boolean | CompileConfig;
  verify?: boolean | VerifyConfig;

  // Build artifacts
  artifacts?: boolean | ArtifactsConfig;

  // Size limits
  size?: SizeLimitConfig;
}
```

#### Build Examples

```json
{
  "checks": {
    "build": {
      "compile": {
        "solcVersion": "0.8.19",
        "optimizer": {
          "enabled": true,
          "runs": 200
        },
        "viaIR": false
      },
      "verify": {
        "etherscan": {
          "apiKey": "${ETHERSCAN_API_KEY}",
          "network": "mainnet"
        }
      },
      "artifacts": {
        "outputDir": "./artifacts",
        "include": ["*.json", "*.dbg.json"],
        "exclude": ["**/build-info/**"]
      },
      "size": {
        "contract": "24kb",
        "warning": "20kb"
      }
    }
  }
}
```

## 🔌 Plugin Configuration

### PluginConfig Interface

Configuration for individual plugins.

```typescript
export interface PluginConfig {
  // Plugin identification
  name: string;
  version?: string;
  enabled?: boolean;

  // Plugin-specific configuration
  config?: Record<string, any>;

  // Plugin options
  priority?: number;
  timeout?: number;
  retries?: number;
}
```

#### Plugin Configuration Examples

```json
{
  "plugins": [
    {
      "name": "@echain-qa/solidity-analyzer",
      "version": "^1.0.0",
      "enabled": true,
      "config": {
        "maxComplexity": 10,
        "ignorePatterns": ["**/test/**", "**/mocks/**"]
      },
      "priority": 5
    },
    {
      "name": "@echain-qa/gas-optimizer",
      "enabled": true,
      "config": {
        "threshold": 3000000,
        "recommendations": true
      }
    },
    {
      "name": "custom-checker",
      "enabled": false,
      "config": {
        "customRules": {
          "no-console": "error",
          "max-lines": 300
        }
      }
    }
  ]
}
```

### Plugin Discovery

Plugins can be loaded from:

- **NPM Packages**: `@echain-qa/plugin-name`
- **Local Paths**: `./plugins/my-plugin`
- **Git URLs**: `https://github.com/user/plugin.git`
- **Built-in Plugins**: Included with echain-qa-agent

## 🏗️ Framework-Specific Configs

### Hardhat Configuration

```json
{
  "project": {
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
      }
    },
    "testing": {
      "unit": {
        "pattern": "**/*.test.ts",
        "network": "hardhat"
      }
    },
    "build": {
      "compile": {
        "command": "npx hardhat compile"
      }
    }
  }
}
```

### Foundry Configuration

```json
{
  "project": {
    "frameworks": ["foundry"],
    "files": [
      "src/**/*.sol",
      "test/**/*.sol",
      "script/**/*.sol"
    ]
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
        "pattern": "**/*.t.sol"
      }
    },
    "build": {
      "compile": {
        "command": "forge build"
      }
    }
  }
}
```

### Next.js Configuration

```json
{
  "project": {
    "frameworks": ["nextjs", "react"],
    "files": [
      "src/**/*.{ts,tsx,js,jsx}",
      "pages/**/*.{ts,tsx,js,jsx}",
      "components/**/*.{ts,tsx,js,jsx}",
      "lib/**/*.ts"
    ]
  },
  "checks": {
    "codeQuality": {
      "typescript": {
        "strict": true,
        "noUnusedLocals": true
      },
      "eslint": {
        "extends": ["next/core-web-vitals"]
      }
    },
    "testing": {
      "unit": {
        "pattern": "**/*.test.{ts,tsx}",
        "environment": "jsdom"
      }
    }
  }
}
```

## ⚡ Advanced Options

### Caching Configuration

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

#### Caching Examples

```json
{
  "caching": {
    "enabled": true,
    "directory": "./.qa-cache",
    "maxSize": "1GB",
    "compression": true,
    "ttl": {
      "results": "30m",
      "deps": "24h",
      "build": "1h",
      "security": "6h"
    },
    "invalidation": {
      "onFileChange": true,
      "onConfigChange": true
    }
  }
}
```

### Performance Configuration

```typescript
export interface PerformanceConfig {
  // Parallel execution
  parallel?: boolean;
  maxConcurrency?: number;

  // Timeouts
  timeout?: number;
  checkTimeout?: Record<string, number>;

  // Resource limits
  memoryLimit?: string;
  cpuLimit?: number;

  // Optimization
  skipUnchanged?: boolean;
  incremental?: boolean;
}
```

#### Performance Examples

```json
{
  "performance": {
    "parallel": true,
    "maxConcurrency": 4,
    "timeout": 300000,
    "checkTimeout": {
      "security": 120000,
      "testing": 180000
    },
    "memoryLimit": "2GB",
    "cpuLimit": 2,
    "skipUnchanged": true,
    "incremental": true
  }
}
```

### Security Configuration

```typescript
export interface SecurityConfig {
  // Sandboxing
  sandbox?: boolean;
  allowedPaths?: string[];
  blockedCommands?: string[];

  // Network access
  allowNetwork?: boolean;
  allowedHosts?: string[];

  // Plugin security
  pluginSandbox?: boolean;
  trustedPlugins?: string[];
}
```

#### Security Examples

```json
{
  "security": {
    "sandbox": true,
    "allowedPaths": [
      "./",
      "./node_modules"
    ],
    "blockedCommands": [
      "rm",
      "del",
      "format"
    ],
    "allowNetwork": true,
    "allowedHosts": [
      "*.etherscan.io",
      "*.infura.io",
      "api.npmjs.org"
    ],
    "pluginSandbox": true,
    "trustedPlugins": [
      "@echain-qa/*"
    ]
  }
}
```

## 📁 Configuration Files

### Supported Formats

echain-qa-agent supports multiple configuration file formats:

- **JSON**: `.qa-config.json`
- **YAML**: `.qa-config.yaml` or `.qa-config.yml`
- **JavaScript**: `qa.config.js` or `.qa-config.js`
- **TypeScript**: `qa.config.ts` or `.qa-config.ts`

### File Resolution Order

1. `.qa-config.ts` (TypeScript)
2. `.qa-config.js` (JavaScript)
3. `qa.config.ts` (TypeScript)
4. `qa.config.js` (JavaScript)
5. `.qa-config.yaml` (YAML)
6. `.qa-config.yml` (YAML)
7. `.qa-config.json` (JSON)

### JavaScript Configuration

```javascript
// qa.config.js
module.exports = {
  project: {
    name: process.env.PROJECT_NAME || 'MyProject',
    type: 'blockchain',
    frameworks: ['hardhat']
  },
  checks: {
    codeQuality: true,
    testing: true,
    security: process.env.NODE_ENV === 'production'
  }
};
```

### TypeScript Configuration

```typescript
// qa.config.ts
import { QAConfig } from 'echain-qa-agent';

const config: QAConfig = {
  project: {
    name: 'TypeScriptProject',
    type: 'blockchain',
    frameworks: ['hardhat', 'foundry']
  },
  checks: {
    codeQuality: {
      typescript: {
        strict: true
      }
    }
  }
};

export default config;
```

## 🌍 Environment Variables

### Configuration via Environment

Environment variables can override configuration values using the `ECHAIN_QA_` prefix:

```bash
# Project configuration
export ECHAIN_QA_PROJECT_NAME="MyProject"
export ECHAIN_QA_PROJECT_TYPE="blockchain"

# Check configuration
export ECHAIN_QA_CHECKS_CODEQUALITY=true
export ECHAIN_QA_CHECKS_TESTING=true

# Plugin configuration
export ECHAIN_QA_PLUGINS_0_NAME="@echain-qa/solidity-checker"

# Security configuration
export ECHAIN_QA_SECURITY_SANDBOX=true
export ETHERSCAN_API_KEY="your-api-key"
```

### Environment Variable Mapping

- `ECHAIN_QA_PROJECT_NAME` → `project.name`
- `ECHAIN_QA_CHECKS_CODEQUALITY` → `checks.codeQuality`
- `ECHAIN_QA_CACHING_ENABLED` → `caching.enabled`
- `ECHAIN_QA_PERFORMANCE_PARALLEL` → `performance.parallel`

### Sensitive Data

Use environment variables for sensitive configuration:

```json
{
  "checks": {
    "build": {
      "verify": {
        "etherscan": {
          "apiKey": "${ETHERSCAN_API_KEY}",
          "network": "${NETWORK}"
        }
      }
    }
  }
}
```

## ✅ Validation

### Configuration Validation

echain-qa-agent automatically validates configuration using JSON Schema:

```typescript
import { ConfigurationManager } from 'echain-qa-agent';

const configManager = new ConfigurationManager();

try {
  const config = await configManager.loadConfig();
  const validation = configManager.validateConfig(config);

  if (!validation.valid) {
    console.error('Configuration errors:');
    validation.errors.forEach(error => {
      console.error(`- ${error.field}: ${error.message}`);
    });
  }
} catch (error) {
  console.error('Failed to load configuration:', error);
}
```

### Validation Rules

- **Required Fields**: `project.name`, `project.type`
- **Type Validation**: Ensures correct data types
- **Enum Validation**: Validates against allowed values
- **Dependency Validation**: Checks plugin dependencies
- **Path Validation**: Verifies file paths exist

### Custom Validation

```typescript
// Custom validation function
function validateCustomConfig(config: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Custom validation logic
  if (config.customValue && typeof config.customValue !== 'string') {
    errors.push({
      field: 'customValue',
      message: 'Must be a string'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: []
  };
}
```

## 📚 Examples

### Minimal Configuration

```json
{
  "project": {
    "name": "SimpleProject",
    "type": "blockchain",
    "frameworks": ["hardhat"]
  }
}
```

### Full Configuration

```json
{
  "project": {
    "name": "AdvancedDeFiProject",
    "type": "blockchain",
    "version": "2.0.0",
    "frameworks": ["hardhat", "foundry", "nextjs"],
    "exclude": ["**/node_modules/**", "**/artifacts/**"]
  },
  "checks": {
    "codeQuality": {
      "eslint": true,
      "prettier": true,
      "solidity": true,
      "typescript": true
    },
    "testing": {
      "unit": true,
      "integration": true,
      "coverage": {
        "threshold": {
          "branches": 80,
          "functions": 85,
          "lines": 80,
          "statements": 80
        }
      }
    },
    "security": {
      "slither": true,
      "secrets": true
    },
    "build": {
      "compile": true,
      "verify": true
    }
  },
  "caching": {
    "enabled": true,
    "ttl": {
      "results": "1h",
      "security": "24h"
    }
  },
  "plugins": [
    {
      "name": "@echain-qa/gas-optimizer",
      "config": {
        "threshold": 3000000
      }
    }
  ],
  "performance": {
    "parallel": true,
    "maxConcurrency": 4
  },
  "reporting": {
    "format": "html",
    "outputDir": "./qa-reports"
  }
}
```

### Framework-Specific Examples

See the [examples](../examples/) directory for complete configuration examples for different frameworks and project types.

## 📖 Next Steps

- **[User Guide](../user-guide/)**: How to use echain-qa-agent
- **[Plugin Development](../developer-guide/plugins.md)**: Create custom plugins
- **[Examples](../examples/)**: Configuration examples
- **[Troubleshooting](../troubleshooting.md)**: Common issues and solutions

For questions about configuration, see the [FAQ](../faq.md) or create an issue on GitHub.</content>
<parameter name="filePath">e:\Polymath Universata\EchainQaAgent\docs\configuration\README.md