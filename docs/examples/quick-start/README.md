# Quick Start Examples

Get up and running with echain-qa-agent quickly using these basic examples.

## Basic CLI Usage

### Simple Project Setup

```bash
# Create a new directory for your project
mkdir my-blockchain-project
cd my-blockchain-project

# Initialize npm project
npm init -y

# Install echain-qa-agent
npm install --save-dev echain-qa-agent

# Initialize QA configuration
npx echain-qa init

# Run all checks
npx echain-qa run
```

### Basic Configuration File

Create a `.qa-config.json` file in your project root:

```json
{
  "project": {
    "name": "MyBlockchainProject",
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

### Running Checks

```bash
# Run all checks
npx echain-qa run

# Run specific checks only
npx echain-qa run --checks codeQuality,testing

# Run with verbose output
npx echain-qa run --verbose

# Generate HTML report
npx echain-qa run --report html --output ./qa-reports

# Fix auto-fixable issues
npx echain-qa run --fix
```

## Basic Configuration Examples

### Minimal Configuration

For a simple project with default settings:

```json
{
  "project": {
    "name": "SimpleProject",
    "type": "blockchain"
  }
}
```

### Hardhat Project

For a Hardhat-based project:

```json
{
  "project": {
    "name": "HardhatProject",
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
        "compiler": "0.8.19"
      },
      "typescript": true
    },
    "testing": {
      "command": "npx hardhat test"
    },
    "security": {
      "slither": true
    }
  }
}
```

### Foundry Project

For a Foundry-based project:

```json
{
  "project": {
    "name": "FoundryProject",
    "type": "blockchain",
    "frameworks": ["foundry"]
  },
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19"
      }
    },
    "testing": {
      "command": "forge test"
    },
    "security": {
      "slither": true
    }
  }
}
```

## Programmatic Usage

### Basic API Usage

Create a `qa-runner.js` file:

```javascript
const { QAAgent } = require('echain-qa-agent');

async function runQA() {
  const agent = new QAAgent({
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
  });

  try {
    const result = await agent.run();
    console.log('QA Results:', result.summary);
  } catch (error) {
    console.error('QA failed:', error);
    process.exit(1);
  }
}

runQA();
```

### TypeScript API Usage

Create a `qa-runner.ts` file:

```typescript
import { QAAgent, QAConfig } from 'echain-qa-agent';

async function runQA(): Promise<void> {
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

  if (result.summary.failedChecks > 0) {
    console.log('Issues found:');
    Object.entries(result.details).forEach(([check, detail]) => {
      if (detail.status === 'failed') {
        console.log(`- ${check}: ${detail.message}`);
      }
    });
  }
}

runQA().catch(console.error);
```

## Watch Mode

### Development Workflow

```bash
# Run in watch mode for continuous checking
npx echain-qa watch

# Watch specific files
npx echain-qa watch --files "contracts/**/*.sol,test/**/*.ts"

# Watch with custom config
npx echain-qa watch --config ./dev-config.json
```

### Development Configuration

Create a `dev-config.json` for development:

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

## Integration Examples

### package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "qa": "echain-qa run",
    "qa:watch": "echain-qa watch",
    "qa:fix": "echain-qa run --fix",
    "qa:ci": "echain-qa run --config .qa-config.ci.json"
  }
}
```

### Git Hooks

Create a `.pre-commit-config.yaml` for pre-commit hooks:

```yaml
repos:
  - repo: local
    hooks:
      - id: qa-checks
        name: QA Checks
        entry: npx echain-qa run --checks codeQuality
        language: system
        files: \.(sol|ts|js)$
        pass_filenames: false
```

## Next Steps

- **[Getting Started](../user-guide/getting-started.md)**: Complete setup guide
- **[Basic Usage](../user-guide/basic-usage.md)**: Learn basic usage patterns
- **[Framework Examples](./frameworks/)**: Framework-specific examples
- **[Configuration Templates](./configurations/)**: More configuration examples</content>
<parameter name="filePath">e:\Polymath Universata\EchainQaAgent\docs\examples\quick-start\README.md