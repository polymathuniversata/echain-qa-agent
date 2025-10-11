# 🔧 Framework-Specific Configurations

Detailed configuration examples for different blockchain frameworks and development stacks.

## 📋 Table of Contents

- [Hardhat Projects](#-hardhat-projects)
- [Foundry Projects](#-foundry-projects)
- [Truffle Projects](#-truffle-projects)
- [Brownie Projects](#-brownie-projects)
- [Multi-Framework Projects](#-multi-framework-projects)
- [Frontend Integration](#-frontend-integration)
- [Full-Stack Projects](#-full-stack-projects)

## ⚒️ Hardhat Projects

### Basic Hardhat Configuration

```json
{
  "project": {
    "name": "MyHardhatProject",
    "type": "blockchain",
    "frameworks": ["hardhat"],
    "files": [
      "contracts/**/*.sol",
      "test/**/*.ts",
      "scripts/**/*.ts",
      "tasks/**/*.ts"
    ],
    "exclude": [
      "**/node_modules/**",
      "**/artifacts/**",
      "**/cache/**",
      "**/typechain/**",
      "**/coverage/**"
    ]
  },
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19",
        "optimizer": {
          "enabled": true,
          "runs": 200
        }
      },
      "typescript": {
        "strict": true,
        "noImplicitAny": true
      },
      "eslint": {
        "extends": ["@nomiclabs/hardhat-waffle"]
      }
    },
    "testing": {
      "unit": {
        "command": "npx hardhat test",
        "timeout": 30000,
        "grep": "unit"
      },
      "integration": {
        "command": "npx hardhat test --grep integration",
        "network": "localhost"
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
        "command": "slither .",
        "excludeDependencies": true,
        "detectors": [
          "reentrancy",
          "unchecked-low-level-call",
          "tx-origin"
        ]
      }
    },
    "build": {
      "compile": {
        "command": "npx hardhat compile",
        "checkGas": true
      }
    }
  }
}
```

### Advanced Hardhat Configuration

```json
{
  "project": {
    "name": "AdvancedHardhatDeFi",
    "type": "blockchain",
    "version": "1.0.0",
    "frameworks": ["hardhat"],
    "buildCommand": "npm run compile",
    "testCommand": "npm run test",
    "installCommand": "npm ci"
  },
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19",
        "optimizer": true,
        "viaIR": false,
        "metadata": {
          "bytecodeHash": "none"
        }
      },
      "typescript": {
        "strict": true,
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true
      }
    },
    "testing": {
      "unit": {
        "pattern": "**/*.test.ts",
        "timeout": 10000,
        "slowTestThreshold": 5000,
        "bail": false
      },
      "integration": {
        "pattern": "**/*.integration.test.ts",
        "network": "hardhat",
        "accounts": 10
      },
      "coverage": {
        "enabled": true,
        "include": [
          "contracts/**/*.sol"
        ],
        "exclude": [
          "contracts/mocks/**",
          "contracts/test/**"
        ],
        "threshold": {
          "global": {
            "branches": 75,
            "functions": 80,
            "lines": 80,
            "statements": 80
          }
        }
      }
    },
    "security": {
      "slither": {
        "excludeInformational": true,
        "excludeLow": false,
        "triageMode": false,
        "configFile": "./slither.config.json"
      },
      "secrets": {
        "enabled": true,
        "patterns": [
          "private_key",
          "mnemonic",
          "infura_key"
        ]
      }
    },
    "build": {
      "compile": {
        "optimizer": {
          "enabled": true,
          "runs": 1000000
        },
        "outputSelection": {
          "*": {
            "*": ["evm.bytecode", "evm.deployedBytecode", "abi"]
          }
        }
      },
      "verify": {
        "etherscan": {
          "apiKey": "${ETHERSCAN_API_KEY}",
          "networks": {
            "mainnet": "etherscan",
            "polygon": "polygonscan"
          }
        }
      },
      "size": {
        "contract": "24kb",
        "warning": "20kb",
        "error": "25kb"
      }
    }
  },
  "caching": {
    "enabled": true,
    "ttl": {
      "results": "30m",
      "build": "1h",
      "security": "4h"
    }
  },
  "plugins": [
    {
      "name": "@echain-qa/hardhat-gas-reporter",
      "config": {
        "enabled": true,
        "currency": "USD",
        "gasPrice": 20
      }
    },
    {
      "name": "@echain-qa/solidity-coverage",
      "config": {
        "skipFiles": ["mocks/", "test/"]
      }
    }
  ]
}
```

## 🔨 Foundry Projects

### Basic Foundry Configuration

```json
{
  "project": {
    "name": "MyFoundryProject",
    "type": "blockchain",
    "frameworks": ["foundry"],
    "files": [
      "src/**/*.sol",
      "test/**/*.sol",
      "script/**/*.sol"
    ],
    "exclude": [
      "**/node_modules/**",
      "**/out/**",
      "**/cache/**",
      "**/broadcast/**"
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
        "verbosity": 2,
        "gasReports": ["*"]
      },
      "coverage": {
        "command": "forge coverage",
        "report": ["lcov", "summary"]
      }
    },
    "security": {
      "slither": {
        "command": "slither .",
        "excludeDependencies": true
      }
    },
    "build": {
      "compile": {
        "command": "forge build",
        "sizes": true
      }
    }
  }
}
```

### Advanced Foundry Configuration

```json
{
  "project": {
    "name": "AdvancedFoundryProtocol",
    "type": "blockchain",
    "frameworks": ["foundry"],
    "buildCommand": "forge build",
    "testCommand": "forge test",
    "installCommand": "forge install"
  },
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19",
        "optimizer": {
          "enabled": true,
          "runs": 1000000
        },
        "viaIR": true
      }
    },
    "testing": {
      "unit": {
        "command": "forge test --gas-report",
        "matchPath": "test/unit/**/*.sol",
        "noMatchPath": "test/integration/**",
        "verbosity": 3,
        "gasReports": ["ContractName"]
      },
      "integration": {
        "command": "forge test --match-path test/integration",
        "forkUrl": "${MAINNET_RPC_URL}",
        "verbosity": 2
      },
      "coverage": {
        "command": "forge coverage --report lcov --report summary",
        "exclude": [
          "test/",
          "script/",
          "src/mocks/"
        ],
        "threshold": {
          "branches": 70,
          "functions": 75,
          "lines": 75,
          "statements": 75
        }
      }
    },
    "security": {
      "slither": {
        "command": "slither . --exclude-dependencies",
        "detectors": [
          "reentrancy",
          "unchecked-low-level-call",
          "arbitrary-send",
          "suicidal"
        ],
        "filterPaths": "lib/"
      }
    },
    "build": {
      "compile": {
        "command": "forge build --sizes",
        "optimizerRuns": 1000000,
        "viaIR": true
      },
      "verify": {
        "command": "forge verify-contract --etherscan-api-key ${ETHERSCAN_API_KEY}"
      }
    }
  },
  "caching": {
    "enabled": true,
    "directory": "./cache/foundry",
    "ttl": {
      "build": "30m",
      "test": "15m"
    }
  },
  "plugins": [
    {
      "name": "@echain-qa/foundry-invariant-tester",
      "config": {
        "depth": 100,
        "runs": 1000,
        "shrink": true
      }
    }
  ],
  "performance": {
    "parallel": true,
    "maxConcurrency": 2
  }
}
```

## 🏗️ Truffle Projects

### Basic Truffle Configuration

```json
{
  "project": {
    "name": "MyTruffleProject",
    "type": "blockchain",
    "frameworks": ["truffle"],
    "files": [
      "contracts/**/*.sol",
      "test/**/*.js",
      "migrations/**/*.js"
    ],
    "exclude": [
      "**/node_modules/**",
      "**/build/**"
    ]
  },
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19"
      },
      "javascript": {
        "eslint": true
      }
    },
    "testing": {
      "unit": {
        "command": "truffle test",
        "network": "development"
      }
    },
    "security": {
      "slither": true
    },
    "build": {
      "compile": {
        "command": "truffle compile"
      }
    }
  }
}
```

### Advanced Truffle Configuration

```json
{
  "project": {
    "name": "EnterpriseTruffleSuite",
    "type": "blockchain",
    "frameworks": ["truffle"],
    "buildCommand": "npm run compile",
    "testCommand": "npm run test",
    "installCommand": "npm ci"
  },
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19",
        "optimizer": {
          "enabled": true,
          "runs": 200
        }
      },
      "javascript": {
        "eslint": {
          "extends": ["truffle"]
        }
      }
    },
    "testing": {
      "unit": {
        "command": "truffle test --network development",
        "grep": "unit",
        "timeout": 60000
      },
      "integration": {
        "command": "truffle test --network ganache",
        "grep": "integration"
      },
      "coverage": {
        "enabled": true,
        "command": "truffle run coverage",
        "network": "coverage",
        "threshold": {
          "branches": 75,
          "functions": 80,
          "lines": 80,
          "statements": 80
        }
      }
    },
    "security": {
      "slither": {
        "excludeDependencies": true,
        "triageMode": true
      },
      "mythril": {
        "command": "mythril analyze --maxDepth 12"
      }
    },
    "build": {
      "compile": {
        "command": "truffle compile --all",
        "network": "development"
      },
      "verify": {
        "truffle": {
          "network": "mainnet",
          "apiKey": "${TRUFFLE_API_KEY}"
        }
      }
    }
  },
  "plugins": [
    {
      "name": "@echain-qa/truffle-security",
      "config": {
        "level": "moderate",
        "exclude": ["low"]
      }
    }
  ]
}
```

## 🐍 Brownie Projects

### Basic Brownie Configuration

```json
{
  "project": {
    "name": "MyBrownieProject",
    "type": "blockchain",
    "frameworks": ["brownie"],
    "files": [
      "contracts/**/*.sol",
      "contracts/**/*.vy",
      "tests/**/*.py",
      "scripts/**/*.py"
    ],
    "exclude": [
      "**/node_modules/**",
      "**/build/**",
      "**/__pycache__/**"
    ]
  },
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19"
      },
      "python": {
        "pylint": true,
        "black": true
      }
    },
    "testing": {
      "unit": {
        "command": "brownie test",
        "network": "development"
      }
    },
    "security": {
      "slither": true
    },
    "build": {
      "compile": {
        "command": "brownie compile"
      }
    }
  }
}
```

### Advanced Brownie Configuration

```json
{
  "project": {
    "name": "AdvancedBrownieProtocol",
    "type": "blockchain",
    "frameworks": ["brownie"],
    "buildCommand": "brownie compile",
    "testCommand": "brownie test",
    "installCommand": "pip install -r requirements.txt"
  },
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19",
        "optimizer": {
          "enabled": true,
          "runs": 200
        }
      },
      "python": {
        "pylint": {
          "disable": ["C0103", "R0913"],
          "maxLineLength": 100
        },
        "black": {
          "lineLength": 100,
          "targetVersion": ["py38"]
        },
        "mypy": {
          "strict": true
        }
      }
    },
    "testing": {
      "unit": {
        "command": "brownie test tests/unit/",
        "network": "development",
        "gas": true,
        "coverage": true
      },
      "integration": {
        "command": "brownie test tests/integration/ --network mainnet-fork",
        "gas": true
      },
      "coverage": {
        "enabled": true,
        "threshold": {
          "branches": 70,
          "functions": 75,
          "lines": 75,
          "statements": 75
        }
      }
    },
    "security": {
      "slither": {
        "excludeDependencies": true,
        "detectors": ["reentrancy", "unchecked-low-level-call"]
      }
    },
    "build": {
      "compile": {
        "command": "brownie compile --size",
        "optimize": true,
        "runs": 200
      }
    }
  },
  "plugins": [
    {
      "name": "@echain-qa/brownie-gas-profiler",
      "config": {
        "enabled": true,
        "reportFormat": "table"
      }
    }
  ]
}
```

## 🔗 Multi-Framework Projects

### Hardhat + Foundry Configuration

```json
{
  "project": {
    "name": "MultiFrameworkDeFi",
    "type": "blockchain",
    "frameworks": ["hardhat", "foundry"],
    "files": [
      "contracts/**/*.sol",
      "src/**/*.sol",
      "test/**/*.ts",
      "test/**/*.sol",
      "script/**/*.ts",
      "script/**/*.sol"
    ],
    "exclude": [
      "**/node_modules/**",
      "**/artifacts/**",
      "**/out/**",
      "**/cache/**",
      "**/typechain/**"
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
        "parallel": [
          {
            "name": "hardhat-tests",
            "command": "npx hardhat test",
            "pattern": "**/*.test.ts"
          },
          {
            "name": "foundry-tests",
            "command": "forge test",
            "pattern": "**/*.t.sol"
          }
        ]
      },
      "coverage": {
        "parallel": [
          {
            "name": "hardhat-coverage",
            "command": "npx hardhat coverage"
          },
          {
            "name": "foundry-coverage",
            "command": "forge coverage"
          }
        ]
      }
    },
    "security": {
      "slither": {
        "command": "slither .",
        "excludeDependencies": true
      }
    },
    "build": {
      "compile": {
        "parallel": [
          {
            "name": "hardhat-compile",
            "command": "npx hardhat compile"
          },
          {
            "name": "foundry-build",
            "command": "forge build"
          }
        ]
      }
    }
  },
  "caching": {
    "enabled": true,
    "ttl": {
      "build": "1h",
      "test": "30m"
    }
  }
}
```

### Full-Stack Blockchain Project

```json
{
  "project": {
    "name": "FullStackDeFiApp",
    "type": "fullstack",
    "frameworks": ["hardhat", "nextjs", "react"],
    "files": [
      "contracts/**/*.sol",
      "frontend/src/**/*.{ts,tsx}",
      "frontend/pages/**/*.{ts,tsx}",
      "backend/src/**/*.ts",
      "test/**/*.ts",
      "test/**/*.sol"
    ],
    "exclude": [
      "**/node_modules/**",
      "**/artifacts/**",
      "**/cache/**",
      "**/build/**",
      "**/dist/**",
      "**/.next/**"
    ]
  },
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19",
        "optimizer": true
      },
      "typescript": {
        "strict": true,
        "noImplicitAny": true
      },
      "eslint": {
        "extends": ["next/core-web-vitals", "@nomiclabs/hardhat-waffle"]
      },
      "prettier": {
        "write": true
      }
    },
    "testing": {
      "unit": {
        "parallel": [
          {
            "name": "contract-tests",
            "command": "npx hardhat test",
            "pattern": "**/*.test.ts"
          },
          {
            "name": "frontend-tests",
            "command": "cd frontend && npm test",
            "pattern": "**/*.test.{ts,tsx}"
          }
        ]
      },
      "integration": {
        "command": "npm run test:integration",
        "network": "localhost"
      },
      "e2e": {
        "command": "npm run test:e2e",
        "browser": "chromium"
      },
      "coverage": {
        "parallel": [
          {
            "name": "contract-coverage",
            "command": "npx hardhat coverage"
          },
          {
            "name": "frontend-coverage",
            "command": "cd frontend && npm run coverage"
          }
        ]
      }
    },
    "security": {
      "slither": {
        "excludeDependencies": true
      },
      "secrets": {
        "enabled": true,
        "patterns": [
          "private_key",
          "mnemonic",
          "api_key",
          "secret"
        ]
      }
    },
    "build": {
      "compile": {
        "parallel": [
          {
            "name": "contracts",
            "command": "npx hardhat compile"
          },
          {
            "name": "frontend",
            "command": "cd frontend && npm run build"
          }
        ]
      }
    }
  },
  "caching": {
    "enabled": true,
    "ttl": {
      "results": "1h",
      "build": "2h",
      "security": "24h"
    }
  },
  "plugins": [
    {
      "name": "@echain-qa/fullstack-checker",
      "config": {
        "contractFrontendIntegration": true,
        "apiConsistency": true
      }
    }
  ],
  "performance": {
    "parallel": true,
    "maxConcurrency": 3
  }
}
```

## 🎨 Frontend Integration

### Next.js + Hardhat Configuration

```json
{
  "project": {
    "name": "DeFiFrontend",
    "type": "fullstack",
    "frameworks": ["nextjs", "hardhat", "react"],
    "files": [
      "contracts/**/*.sol",
      "src/**/*.{ts,tsx}",
      "pages/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "lib/**/*.ts",
      "utils/**/*.ts"
    ]
  },
  "checks": {
    "codeQuality": {
      "typescript": {
        "strict": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true
      },
      "eslint": {
        "extends": ["next/core-web-vitals"],
        "rules": {
          "react-hooks/exhaustive-deps": "error"
        }
      },
      "solidity": {
        "compiler": "0.8.19"
      }
    },
    "testing": {
      "unit": {
        "parallel": [
          {
            "name": "contract-tests",
            "command": "npx hardhat test"
          },
          {
            "name": "component-tests",
            "command": "npm run test:components",
            "environment": "jsdom"
          }
        ]
      },
      "integration": {
        "command": "npm run test:integration",
        "setupFiles": ["./test/setup.ts"]
      },
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
      "secrets": {
        "exclude": ["**/public/**", "**/*.config.js"]
      }
    }
  },
  "plugins": [
    {
      "name": "@echain-qa/nextjs-analyzer",
      "config": {
        "checkBundleSize": true,
        "maxBundleSize": "500kb"
      }
    }
  ]
}
```

## 📖 Usage Examples

### Loading Framework-Specific Configs

```typescript
import { ConfigurationManager } from 'echain-qa-agent';

// Load Hardhat-specific configuration
const hardhatConfig = await configManager.loadProjectConfig('./hardhat-project');

// Load Foundry-specific configuration
const foundryConfig = await configManager.loadProjectConfig('./foundry-project');

// Merge configurations for multi-framework project
const mergedConfig = configManager.mergeConfigs([hardhatConfig, foundryConfig]);
```

### Environment-Specific Configurations

```javascript
// qa.config.js with environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isCI = process.env.CI === 'true';

module.exports = {
  project: {
    name: 'MyProject',
    type: 'blockchain',
    frameworks: ['hardhat']
  },
  checks: {
    codeQuality: true,
    testing: true,
    security: !isCI, // Skip security in CI for speed
    build: {
      verify: isProduction // Only verify in production
    }
  },
  caching: {
    enabled: !isCI // Disable caching in CI
  }
};
```

## 📚 Next Steps

- **[Configuration Reference](README.md)**: Complete configuration guide
- **[Examples](../../examples/)**: More configuration examples
- **[Plugin Development](../../developer-guide/plugins.md)**: Create custom configurations
- **[Troubleshooting](../../troubleshooting.md)**: Configuration issues

For more examples, see the [examples](../../examples/) directory.</content>
<parameter name="filePath">e:\Polymath Universata\EchainQaAgent\docs\configuration\frameworks.md