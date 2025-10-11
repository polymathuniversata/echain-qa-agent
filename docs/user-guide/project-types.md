# 🏗️ Project Types & Frameworks

Configure echain-qa-agent for different blockchain frameworks and project types with optimized settings and framework-specific checks.

## 📋 Table of Contents

- [Supported Frameworks](#-supported-frameworks)
- [Hardhat Projects](#-hardhat-projects)
- [Foundry Projects](#-foundry-projects)
- [Truffle Projects](#-truffle-projects)
- [Brownie Projects](#-brownie-projects)
- [Frontend Integration](#-frontend-integration)
- [Multi-framework Projects](#-multi-framework-projects)
- [Custom Framework Support](#-custom-framework-support)
- [Framework Detection](#-framework-detection)

## 🔍 Supported Frameworks

### Overview

echain-qa-agent automatically detects and configures for popular blockchain development frameworks:

| Framework | Language | Detection | Status |
|-----------|----------|-----------|---------|
| **Hardhat** | Solidity + TypeScript | `hardhat.config.*` | ✅ Full Support |
| **Foundry** | Solidity + Rust | `foundry.toml` | ✅ Full Support |
| **Truffle** | Solidity + JavaScript | `truffle-config.js` | ✅ Full Support |
| **Brownie** | Solidity + Python | `brownie-config.yaml` | ✅ Full Support |
| **OpenZeppelin** | Solidity | `contracts/**/*.sol` | ✅ Integrated |
| **Next.js** | TypeScript/React | `next.config.js` | ✅ Frontend Support |
| **Vite** | TypeScript/React | `vite.config.*` | ✅ Frontend Support |
| **Hardhat + Next.js** | Full-stack | Both configs | ✅ Full-stack Support |

### Framework Capabilities

| Feature | Hardhat | Foundry | Truffle | Brownie |
|---------|---------|---------|---------|---------|
| **Smart Contract Compilation** | ✅ | ✅ | ✅ | ✅ |
| **Unit Testing** | ✅ | ✅ | ✅ | ✅ |
| **Integration Testing** | ✅ | ✅ | ✅ | ✅ |
| **Gas Optimization** | ✅ | ✅ | ⚠️ | ⚠️ |
| **Security Analysis** | ✅ | ✅ | ✅ | ✅ |
| **Code Coverage** | ✅ | ✅ | ✅ | ✅ |
| **Deployment Scripts** | ✅ | ✅ | ✅ | ✅ |

## ⚒️ Hardhat Projects

### Project Structure

```
my-hardhat-project/
├── contracts/           # Solidity contracts
├── scripts/            # Deployment scripts
├── test/               # Test files
├── hardhat.config.ts   # Hardhat configuration
├── package.json        # Node.js dependencies
└── .qa-config.json     # QA configuration
```

### Default Configuration

```json
{
  "project": {
    "name": "MyHardhatProject",
    "type": "blockchain",
    "frameworks": ["hardhat"],
    "language": "solidity"
  },
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19",
        "optimizer": true,
        "viaIR": false
      },
      "typescript": {
        "strict": true,
        "noImplicitAny": true
      }
    },
    "testing": {
      "unit": {
        "pattern": "test/**/*.ts",
        "timeout": 20000
      },
      "integration": {
        "pattern": "test/**/*.integration.ts",
        "forking": true
      }
    },
    "security": {
      "slither": true,
      "mythril": false,
      "gasEstimator": true
    },
    "build": {
      "compile": "npx hardhat compile",
      "test": "npx hardhat test",
      "coverage": "npx hardhat coverage"
    }
  }
}
```

### Hardhat-specific Checks

```json
{
  "hardhat": {
    "gasReporter": {
      "enabled": true,
      "currency": "USD",
      "gasPrice": 20
    },
    "contractSizer": {
      "enabled": true,
      "strict": true
    },
    "abiExporter": {
      "enabled": true,
      "path": "./abi",
      "clear": true
    },
    "typechain": {
      "enabled": true,
      "target": "ethers-v5"
    }
  }
}
```

### Example Commands

```bash
# Basic QA run
echain-qa run

# Hardhat-specific checks
echain-qa run --check-gas --check-size

# Compile and test
npx hardhat compile && npx hardhat test

# With QA integration
echain-qa build  # Runs compile + test + coverage
```

## 🔨 Foundry Projects

### Project Structure

```
my-foundry-project/
├── src/                # Solidity contracts
├── test/               # Test files (.t.sol)
├── script/             # Deployment scripts
├── foundry.toml        # Foundry configuration
├── remappings.txt      # Import remappings
└── .qa-config.json     # QA configuration
```

### Default Configuration

```json
{
  "project": {
    "name": "MyFoundryProject",
    "type": "blockchain",
    "frameworks": ["foundry"],
    "language": "solidity"
  },
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19",
        "optimizer": true,
        "optimizerRuns": 200
      },
      "forge": {
        "fmt": true,
        "check": true
      }
    },
    "testing": {
      "unit": {
        "pattern": "test/**/*.sol",
        "fuzz": {
          "runs": 1000,
          "maxTestRejects": 60000
        }
      },
      "integration": {
        "pattern": "test/**/*.integration.sol",
        "fork": true
      }
    },
    "security": {
      "slither": true,
      "halmos": false,
      "invariantTesting": true
    },
    "build": {
      "compile": "forge build",
      "test": "forge test",
      "coverage": "forge coverage"
    }
  }
}
```

### Foundry-specific Checks

```json
{
  "foundry": {
    "gasSnapshot": {
      "enabled": true,
      "path": ".gas-snapshot"
    },
    "storageLayout": {
      "enabled": true,
      "path": "out/.storage-layout"
    },
    "invariant": {
      "enabled": true,
      "runs": 10,
      "depth": 100
    },
    "fuzz": {
      "enabled": true,
      "runs": 1000,
      "seed": "0x1234567890abcdef"
    }
  }
}
```

### Example Commands

```bash
# Basic QA run
echain-qa run

# Foundry-specific checks
echain-qa run --check-invariant --check-fuzz

# Build and test
forge build && forge test

# With QA integration
echain-qa build  # Runs build + test + coverage
```

## 🏗️ Truffle Projects

### Project Structure

```
my-truffle-project/
├── contracts/          # Solidity contracts
├── migrations/         # Deployment scripts
├── test/              # Test files
├── truffle-config.js  # Truffle configuration
├── package.json       # Node.js dependencies
└── .qa-config.json    # QA configuration
```

### Default Configuration

```json
{
  "project": {
    "name": "MyTruffleProject",
    "type": "blockchain",
    "frameworks": ["truffle"],
    "language": "solidity"
  },
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19",
        "optimizer": {
          "enabled": true,
          "runs": 200
        }
      }
    },
    "testing": {
      "unit": {
        "pattern": "test/**/*.js",
        "network": "development"
      },
      "integration": {
        "pattern": "test/**/*.integration.js",
        "network": "kovan"
      }
    },
    "security": {
      "slither": true,
      "mythril": true
    },
    "build": {
      "compile": "npx truffle compile",
      "test": "npx truffle test",
      "migrate": "npx truffle migrate"
    }
  }
}
```

### Truffle-specific Checks

```json
{
  "truffle": {
    "networks": {
      "development": {
        "host": "127.0.0.1",
        "port": 8545,
        "network_id": "*"
      },
      "kovan": {
        "network_id": 42,
        "gas": 4465030
      }
    },
    "compilers": {
      "solc": {
        "version": "0.8.19",
        "settings": {
          "optimizer": {
            "enabled": true,
            "runs": 200
          }
        }
      }
    }
  }
}
```

## 🐍 Brownie Projects

### Project Structure

```
my-brownie-project/
├── contracts/          # Solidity contracts
├── scripts/           # Deployment scripts
├── tests/             # Test files
├── brownie-config.yaml # Brownie configuration
├── requirements.txt   # Python dependencies
└── .qa-config.json    # QA configuration
```

### Default Configuration

```json
{
  "project": {
    "name": "MyBrownieProject",
    "type": "blockchain",
    "frameworks": ["brownie"],
    "language": "solidity"
  },
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19",
        "optimizer": {
          "enabled": true,
          "runs": 200
        }
      }
    },
    "testing": {
      "unit": {
        "pattern": "tests/test_*.py",
        "gas": true,
        "coverage": true
      },
      "integration": {
        "pattern": "tests/integration/*.py",
        "network": "mainnet-fork"
      }
    },
    "security": {
      "slither": true,
      "echidna": false
    },
    "build": {
      "compile": "brownie compile",
      "test": "brownie test",
      "coverage": "brownie test --coverage"
    }
  }
}
```

## 🎨 Frontend Integration

### Next.js Projects

```json
{
  "project": {
    "name": "DeFi Frontend",
    "type": "frontend",
    "frameworks": ["nextjs", "hardhat"],
    "language": "typescript"
  },
  "checks": {
    "codeQuality": {
      "typescript": {
        "strict": true,
        "noUnusedLocals": true
      },
      "react": {
        "rules": {
          "react-hooks/exhaustive-deps": "error"
        }
      },
      "nextjs": {
        "rules": {
          "@next/next/no-img-element": "error"
        }
      }
    },
    "testing": {
      "unit": {
        "pattern": "**/*.test.{ts,tsx}",
        "environment": "jsdom"
      },
      "e2e": {
        "pattern": "**/*.cy.{ts,tsx}",
        "browser": "electron"
      }
    },
    "build": {
      "next": "npm run build",
      "export": "npm run export"
    }
  }
}
```

### Vite Projects

```json
{
  "project": {
    "name": "DApp Frontend",
    "type": "frontend",
    "frameworks": ["vite", "foundry"],
    "language": "typescript"
  },
  "checks": {
    "codeQuality": {
      "typescript": {
        "strict": true
      },
      "vite": {
        "build": true,
        "preview": false
      }
    },
    "testing": {
      "unit": {
        "pattern": "**/*.test.{ts,tsx}",
        "environment": "jsdom"
      },
      "integration": {
        "pattern": "**/*.spec.{ts,tsx}"
      }
    },
    "build": {
      "vite": "npm run build",
      "preview": "npm run preview"
    }
  }
}
```

## 🔄 Multi-framework Projects

### Hardhat + Next.js

```json
{
  "project": {
    "name": "FullStack DeFi",
    "type": "fullstack",
    "frameworks": ["hardhat", "nextjs"],
    "structure": {
      "contracts": "./contracts",
      "frontend": "./frontend",
      "backend": "./backend"
    }
  },
  "checks": {
    "codeQuality": {
      "solidity": { "path": "contracts/**" },
      "typescript": { "path": "frontend/**" },
      "nodejs": { "path": "backend/**" }
    },
    "testing": {
      "unit": {
        "contracts": "contracts/test/**",
        "frontend": "frontend/**/*.test.*",
        "backend": "backend/**/*.test.*"
      },
      "integration": {
        "e2e": "e2e/**"
      }
    },
    "build": {
      "contracts": "npm run compile",
      "frontend": "cd frontend && npm run build",
      "backend": "cd backend && npm run build"
    }
  }
}
```

### Foundry + React

```json
{
  "project": {
    "name": "Foundry DApp",
    "type": "fullstack",
    "frameworks": ["foundry", "vite"],
    "structure": {
      "contracts": "./src",
      "frontend": "./frontend"
    }
  },
  "checks": {
    "codeQuality": {
      "solidity": { "path": "src/**" },
      "typescript": { "path": "frontend/**" }
    },
    "testing": {
      "contracts": "forge test",
      "frontend": "cd frontend && npm test"
    },
    "build": {
      "contracts": "forge build",
      "frontend": "cd frontend && npm run build"
    }
  }
}
```

## 🛠️ Custom Framework Support

### Adding Custom Frameworks

```typescript
// custom-framework-checker.ts
import { FrameworkChecker, Project } from 'echain-qa-agent';

export class CustomFrameworkChecker implements FrameworkChecker {
  name = 'custom-framework';
  priority = 10;

  async detect(project: Project): Promise<boolean> {
    // Check for framework-specific files
    return await project.hasFile('custom-config.yaml');
  }

  async configure(project: Project): Promise<FrameworkConfig> {
    return {
      language: 'solidity',
      compiler: 'custom-compiler',
      testRunner: 'custom-test',
      buildCommand: 'custom build'
    };
  }

  async getChecks(): Promise<Check[]> {
    return [
      {
        name: 'custom-lint',
        command: 'custom-lint check',
        category: 'codeQuality'
      },
      {
        name: 'custom-test',
        command: 'custom-test run',
        category: 'testing'
      }
    ];
  }
}
```

### Registering Custom Frameworks

```json
{
  "frameworks": {
    "custom": {
      "enabled": true,
      "checker": "./custom-framework-checker.ts",
      "config": {
        "version": "1.0.0",
        "strict": true
      }
    }
  }
}
```

### Framework Plugin System

```typescript
// framework-plugin.ts
import { FrameworkPlugin } from 'echain-qa-agent';

export class CustomFrameworkPlugin implements FrameworkPlugin {
  async init(config: FrameworkConfig): Promise<void> {
    // Initialize framework-specific tools
  }

  async preCheck(project: Project): Promise<void> {
    // Setup before checks
  }

  async postCheck(results: CheckResults): Promise<void> {
    // Process results
  }

  async cleanup(): Promise<void> {
    // Cleanup resources
  }
}
```

## 🔍 Framework Detection

### Automatic Detection

```bash
# Detect framework automatically
echain-qa run  # Auto-detects based on files

# Force specific framework
echain-qa run --framework hardhat
echain-qa run --framework foundry

# Detect and show info
echain-qa detect-framework
```

### Detection Logic

The QA agent detects frameworks by checking for:

| Framework | Detection Files | Priority |
|-----------|----------------|----------|
| Hardhat | `hardhat.config.*`, `artifacts/` | High |
| Foundry | `foundry.toml`, `lib/forge-std/` | High |
| Truffle | `truffle-config.js`, `migrations/` | Medium |
| Brownie | `brownie-config.yaml`, `build/` | Medium |
| Next.js | `next.config.js`, `pages/`, `app/` | Low |
| Vite | `vite.config.*`, `index.html` | Low |

### Manual Configuration

```json
{
  "frameworks": {
    "override": ["hardhat", "nextjs"],
    "exclude": ["truffle"],
    "custom": {
      "name": "my-framework",
      "version": "1.0.0",
      "config": "./my-framework-config.json"
    }
  }
}
```

### Detection Debugging

```bash
# Show detection process
echain-qa detect-framework --verbose

# Test framework configuration
echain-qa test-framework hardhat

# Validate framework setup
echain-qa validate-framework
```

## 📊 Framework Comparison

### Performance Metrics

| Framework | Compile Time | Test Time | Memory Usage |
|-----------|--------------|-----------|--------------|
| Hardhat | ~15s | ~30s | ~200MB |
| Foundry | ~8s | ~12s | ~150MB |
| Truffle | ~25s | ~45s | ~300MB |
| Brownie | ~20s | ~35s | ~250MB |

### Feature Comparison

| Feature | Hardhat | Foundry | Truffle | Brownie |
|---------|---------|---------|---------|---------|
| **TypeScript Support** | ✅ | ❌ | ⚠️ | ❌ |
| **Parallel Testing** | ✅ | ✅ | ❌ | ⚠️ |
| **Gas Reporting** | ✅ | ✅ | ⚠️ | ✅ |
| **Fuzzing** | ⚠️ | ✅ | ❌ | ❌ |
| **Invariant Testing** | ⚠️ | ✅ | ❌ | ❌ |
| **Deployment Tools** | ✅ | ✅ | ✅ | ✅ |
| **IDE Integration** | ✅ | ⚠️ | ✅ | ⚠️ |

## 🔧 Framework-specific Troubleshooting

### Hardhat Issues

```bash
# Clear cache
npx hardhat clean

# Check configuration
npx hardhat check

# Debug compilation
npx hardhat compile --verbose
```

### Foundry Issues

```bash
# Clean and rebuild
forge clean && forge build

# Update dependencies
forge update

# Debug tests
forge test --debug
```

### Common Issues

```bash
# Compiler version mismatch
echain-qa run --fix-compiler-versions

# Dependency conflicts
echain-qa run --resolve-conflicts

# Network issues
echain-qa run --offline-mode
```

## 📚 Next Steps

- **[Best Practices](./best-practices.md)**: Optimization and maintenance
- **[Configuration Reference](../configuration/)**: Detailed setup options
- **[Examples](../examples/frameworks/)**: Framework-specific examples
- **[Troubleshooting](../troubleshooting/)**: Framework issues

Need help? Check the [FAQ](../faq.md) or create an [issue](https://github.com/polymathuniversata/echain-qa-agent/issues).</content>
<parameter name="filePath">e:\Polymath Universata\EchainQaAgent\docs\user-guide\project-types.md