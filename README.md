# echain-qa-agent

[![npm version](https://badge.fury.io/js/echain-qa-agent.svg)](https://badge.fury.io/js/echain-qa-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

A comprehensive QA automation tool designed specifically for blockchain and Web3 projects. This package provides automated code quality checks, testing, security scanning, and documentation updates to ensure your project maintains high standards.


## 📚 Documentation

API documentation is automatically generated and available in [`docs/api`](E:\Polymath Universata\EchainQaAgent\docs\api/).

## ✨ New in v2.1.0

- 🚀 **Progress Indicators**: Visual progress bars for all long-running operations
- 💾 **Result Caching**: Intelligent caching system for faster repeated runs
- 🔌 **Plugin Architecture**: Extensible system for custom QA checks
- ⚙️ **Configuration Validation**: JSON schema validation for QA configurations
- 🔄 **CI/CD Integration**: GitHub Actions and Jenkins pipeline templates
- 🪝 **Enhanced Git Hooks**: Cross-platform hook support with PowerShell for Windows
- 📊 **Performance Monitoring**: Load testing capabilities for large codebases
- 🔄 **Version Checking**: Automatic QA agent version checking in git hooks
- 🚫 **Bypass Options**: Environment variables and commit tags to skip QA checks

## Features

- 🧹 **Code Quality**: Automated linting and formatting for TypeScript, JavaScript, and Solidity
- 🧪 **Testing**: Runs unit tests, integration tests, and blockchain-specific tests
- 🔒 **Security**: Dependency auditing and secret detection with progress tracking
- 🏗️ **Build Verification**: Ensures production builds work correctly
- 📚 **Documentation**: Automatic documentation updates and QA logging
- ⚡ **Fast**: Built with TypeScript for optimal performance and caching
- 🔧 **Extensible**: Plugin system for custom QA checks
- 📈 **Progress Tracking**: Visual feedback for all operations
- 🚀 **CI/CD Ready**: Pre-built pipelines for GitHub Actions and Jenkins

## Installation

### Local Installation (Recommended for Projects)

For automatic git hook setup in your project:

```bash
npm install --save-dev echain-qa-agent
# or
bun add -d echain-qa-agent
```

*Git hooks will be automatically installed after installation.*

### Global Installation

For system-wide usage:

```bash
npm install -g echain-qa-agent
# or
bun add -g echain-qa-agent
```

*Run `echain-qa setup-hooks` or `echain setup-hooks` in your project directory to enable automatic git hooks.*

## Quick Start

1. **Install the QA agent locally** (recommended):
   ```bash
   npm install --save-dev echain-qa-agent
   ```
   *Git hooks are automatically set up!*

2. **Or install globally and set up hooks manually**:
   ```bash
   npm install -g echain-qa-agent
   npx echain-qa setup-hooks
   ```

3. **Run your first QA check**:
   ```bash
   npx echain-qa run
   ```

The QA agent will automatically detect your project structure and run appropriate checks!

## Git Hooks Setup

After installing the QA agent, you can set up git hooks for automatic QA checks on every commit and push.

The hooks include:
- **pre-commit hook**: Runs fast QA checks (dry-run) before each commit
- **pre-push hook**: Runs comprehensive QA checks before pushing to remote

To set up the hooks, run:

```bash
npx echain-qa setup-hooks
```

This will install hooks that automatically run QA checks. You'll see a message during installation about setting up hooks.

To test the hooks:
1. Make a small change to any file
2. Run: `git add . && git commit -m 'test'`

The QA agent will automatically run checks before your commit!

### Script Wrapping

The QA agent can automatically wrap your npm scripts to run QA checks before common development commands.

To wrap scripts automatically:
```bash
npx echain-qa wrap-scripts
```

This will modify scripts like `build`, `start`, `dev`, and `test` in your `package.json` to run QA checks first.

For example:
- `"build": "webpack"` becomes `"build": "echain-qa run --dry-run --quiet && webpack"` (or use `echain run --dry-run --quiet`)

To remove the wrapping:
```bash
npx echain-qa unwrap-scripts
```

Configure which scripts to wrap in `.qa-config.json`:
```json
{
  "hooks": {
    "wrapScripts": true,
    "scriptsToWrap": ["build", "start", "dev", "deploy"]
  }
}
```

### Version Checking

The hooks automatically check if you're using the latest version of the QA agent:
- Compares your installed version with the latest on npm
- Warns if a newer version is available
- Suggests update commands but doesn't block commits/pushes

### Cross-Platform Support

The QA agent includes enhanced cross-platform support:
- **Unix/Linux**: Bash-based hooks
- **Windows**: PowerShell-based hooks with Git for Windows compatibility
- **macOS**: Native bash support

## Command Line Interface

After global installation, use the `echain-qa` or `echain` command:

```bash
# Run full QA suite (with progress bars and caching)
echain-qa run

# Run only linting
echain-qa lint

# Run only tests
echain-qa test

# Run only security checks
echain-qa security

# Run only build verification
echain-qa build

# Initialize QA configuration
echain-qa init

# Set up git hooks
echain-qa setup-hooks

# Wrap npm scripts with QA checks
echain-qa wrap-scripts

# Remove QA checks from scripts
echain-qa unwrap-scripts

# Check hook status
echain-qa check-hooks

# Remove hooks
echain-qa remove-hooks

# Run with dry-run mode (no actual changes)
echain-qa run --dry-run

# Quiet mode (for script wrapping)
echain-qa run --quiet

# Verbose output
echain-qa run --verbose
```

### Programmatic Usage

```typescript
import { QAAgent } from 'echain-qa-agent';

const qaAgent = new QAAgent({
  verbose: true,
  dryRun: false,
  projectRoot: '/path/to/your/project'
});

// Run full QA suite with caching and plugins
const results = await qaAgent.runFullSuite();

console.log(`QA completed in ${results.duration}s`);
console.log(`Errors: ${results.errors}, Warnings: ${results.warnings}`);
```

## Project Structure

The QA agent expects your project to follow this structure:

```
your-project/
├── frontend/          # Next.js, React, or other web app
├── blockchain/        # Hardhat, Foundry, or other blockchain tools
├── docs/             # Documentation files
├── scripts/          # Build and deployment scripts
├── .qa-plugins/      # Custom QA plugins (optional)
├── .qa-config.json   # QA configuration
├── qa-report.json    # Generated QA reports
└── docs/qalog.md     # QA session logs
```

## Configuration

Create a `.qa-config.json` file in your project root to customize behavior:

```json
{
  "version": "2.1.0",
  "project": {
    "name": "My Blockchain Project",
    "type": "blockchain",
    "frameworks": ["hardhat", "nextjs"]
  },
  "checks": {
    "linting": true,
    "testing": true,
    "security": true,
    "build": true,
    "performance": false
  },
  "qualityGates": {
    "failOnLintErrors": true,
    "failOnTestFailures": true,
    "failOnBuildFailures": true,
    "failOnSecurityVulnerabilities": false,
    "failOnPerformanceIssues": false,
    "requireTests": false,
    "requireTestCoverage": false,
    "minTestCoverage": 80
  },
  "caching": {
    "enabled": true,
    "ttlHours": 24
  },
  "plugins": {
    "enabled": true,
    "autoLoad": true
  },
  "paths": {
    "frontend": "frontend",
    "blockchain": "blockchain",
    "docs": "docs",
    "tests": "test",
    "plugins": ".qa-plugins"
  },
  "hooks": {
    "preCommit": true,
    "prePush": true,
    "autoInstall": true
  }
}
```

### Quality Gates Configuration

The `qualityGates` section allows you to configure stricter quality requirements:

- `requireTests`: Set to `true` to fail QA if no tests are found
- `requireTestCoverage`: Set to `true` to enforce minimum test coverage
- `minTestCoverage`: Minimum test coverage percentage (requires coverage reports)
- `failOnSecurityVulnerabilities`: Treat security issues as errors instead of warnings

## Plugin System

Extend the QA agent with custom checks by creating plugins in the `.qa-plugins/` directory:

```typescript
// .qa-plugins/custom-check.js
module.exports = {
  name: 'custom-check',
  description: 'My custom QA check',

  async run(context) {
    // Your custom logic here
    const issues = [];

    // Example: Check for TODO comments
    const files = await context.glob('**/*.{js,ts}');
    for (const file of files) {
      const content = await context.readFile(file);
      if (content.includes('TODO')) {
        issues.push({
          file,
          message: 'TODO comment found',
          severity: 'warning'
        });
      }
    }

    return { errors: 0, warnings: issues.length, issues };
  }
};
```

## CI/CD Integration

### GitHub Actions

Use the provided workflow template (`.github/workflows/qa-checks.yml`):

```yaml
name: QA Checks
on: [push, pull_request]

jobs:
  qa-checks:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run qa
```

### Jenkins Pipeline

Use the provided `Jenkinsfile`:

```groovy
pipeline {
    agent any

    stages {
        stage('QA Checks') {
            steps {
                sh 'npm run qa'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'qa-report.json,docs/qalog.md', allowEmptyArchive: true
        }
    }
}
```

## QA Checks Performed

### Code Quality
- ESLint for TypeScript/JavaScript with progress tracking
- TypeScript compilation checks
- Solidity linting with Solhint (Hardhat, Foundry, Truffle)
- Code formatting verification

### Testing
- **Runs existing tests only** - no enforcement of test coverage or presence
- Unit tests for blockchain contracts (Hardhat, Foundry, Truffle)
- Frontend component tests (if configured)
- Integration tests (if `scripts/run_all_tests.sh` exists)
- **Note**: Projects can pass QA without any tests

### Security
- NPM audit for dependency vulnerabilities
- Secret detection in source code with progress bars
- Exposed API keys and private keys scanning
- Custom security rules via plugins

### Build Verification
- Frontend production build with progress tracking
- Smart contract compilation
- Bundle size checks

### Quality Assurance Gaps
- **No test coverage validation** - doesn't require minimum test coverage
- **No error handling checks** - doesn't validate exception handling patterns
- **No code complexity analysis** - doesn't enforce complexity limits
- **No documentation requirements** - doesn't validate docstring coverage

## Extending QA Coverage

For comprehensive quality assurance, extend the QA agent with custom plugins:

### Test Coverage Plugin
```typescript
// .qa-plugins/test-coverage.js
const { execSync } = require('child_process');

module.exports = {
  name: 'test-coverage-validator',
  description: 'Validates minimum test coverage requirements',

  async run(context) {
    const issues = [];
    
    // Check if test coverage report exists
    try {
      const coverage = JSON.parse(
        require('fs').readFileSync('coverage/coverage-summary.json', 'utf8')
      );
      
      const minCoverage = 80; // 80% minimum
      
      if (coverage.total.lines.pct < minCoverage) {
        issues.push({
          file: 'coverage/coverage-summary.json',
          message: `Test coverage ${coverage.total.lines.pct}% below minimum ${minCoverage}%`,
          severity: 'error'
        });
      }
    } catch (error) {
      issues.push({
        file: 'coverage/',
        message: 'Test coverage report not found - run tests with coverage',
        severity: 'warning'
      });
    }

    return { 
      errors: issues.filter(i => i.severity === 'error').length, 
      warnings: issues.filter(i => i.severity === 'warning').length, 
      issues 
    };
  }
};
```

### Error Handling Plugin
```typescript
// .qa-plugins/error-handling.js
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'error-handling-validator',
  description: 'Validates error handling patterns in source code',

  async run(context) {
    const issues = [];
    
    // Scan TypeScript/JavaScript files for error handling
    const files = await context.glob('src/**/*.{ts,js}');
    
    for (const file of files) {
      const content = await context.readFile(file);
      const lines = content.split('\n');
      
      // Check for async functions without try-catch
      const asyncFunctions = content.match(/async\s+\w+\s*\([^)]*\)\s*{/g) || [];
      const tryCatchBlocks = (content.match(/try\s*{/g) || []).length;
      
      if (asyncFunctions.length > tryCatchBlocks) {
        issues.push({
          file,
          message: 'Async function detected without corresponding try-catch block',
          severity: 'warning'
        });
      }
      
      // Check for Promise usage without error handling
      const promises = content.match(/\.then\(/g) || [];
      const catches = content.match(/\.catch\(/g) || [];
      
      if (promises.length > catches.length) {
        issues.push({
          file,
          message: 'Promise chain detected without error handling (.catch)',
          severity: 'warning'
        });
      }
    }

    return { errors: 0, warnings: issues.length, issues };
  }
};
```

## Caching System

The QA agent includes intelligent caching to speed up repeated runs:

- **Result Caching**: Caches linting, testing, and build results for 24 hours
- **File Hashing**: Uses MD5 hashing to detect file changes
- **Selective Cache Invalidation**: Security checks always run fresh
- **Cache Management**: Automatic cleanup of expired cache entries

## Output

The QA agent generates:

1. **Console Output**: Real-time progress bars and colored results
2. **QA Log**: `docs/qalog.md` with detailed session logs and timestamps
3. **JSON Report**: `qa-report.json` with structured results for CI/CD
4. **Plugin Reports**: Custom reports from loaded plugins

## Exit Codes

- `0`: All checks passed
- `1`: Critical errors found
- `2`: Configuration or setup issues

## Requirements

- Node.js >= 18.0.0
- NPM or Bun package manager
- For blockchain projects: Hardhat, Foundry, or Truffle
- For frontend projects: Next.js, React, or similar

## Troubleshooting

### Common Issues

**Hooks not running:**
- Ensure you're in a git repository
- Check that hooks are executable: `ls -la .git/hooks/`
- Verify hooks contain QA logic: `cat .git/hooks/pre-commit`

**QA agent not found:**
- Install as dev dependency: `npm install --save-dev echain-qa-agent`
- Or globally: `npm install -g echain-qa-agent`

**NPM install failures:**
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall
- Check Node.js version (>= 18.0.0)

**Permission denied on hooks:**
- Make hooks executable: `chmod +x .git/hooks/pre-commit`
- On Windows, ensure git hooks are enabled

**Tests failing:**
- Install dependencies in subprojects (frontend/, blockchain/)
- Check configuration in `.qa-config.json`

**Caching issues:**
- Clear cache: `rm -rf .qa-cache/`
- Disable caching in config: `"caching": {"enabled": false}`

## Project Examples

### Hardhat Project
```
my-hardhat-project/
├── contracts/          # Solidity contracts
├── test/              # Contract tests
├── scripts/           # Deployment scripts
├── frontend/          # React/Next.js frontend
├── .qa-config.json    # QA configuration
└── package.json
```

### Next.js + Blockchain Project
```
my-fullstack-project/
├── frontend/          # Next.js app
│   ├── components/
│   ├── pages/
│   └── package.json
├── blockchain/        # Hardhat project
│   ├── contracts/
│   ├── test/
│   └── hardhat.config.js
├── .qa-plugins/       # Custom QA plugins
├── .github/workflows/ # CI/CD workflows
└── package.json
```

## Usage Recommendations

### For Users
- **Install as dev dependency** in all blockchain/Web3 projects for automatic QA
- **Enable pre-commit hooks** for immediate feedback on code quality
- **Run regular updates** to get latest security checks and improvements
- **Use dry-run mode** (`--dry-run`) for testing QA setup
- **Configure caching** for faster repeated runs in development

### For Teams
- **Set up CI/CD pipelines** using provided templates
- **Create custom plugins** for team-specific checks
- **Configure notifications** for QA failures
- **Use the QA log** for audit trails and debugging

### Version Management
- Follows **semantic versioning** (MAJOR.MINOR.PATCH)
- **Major versions** may include breaking changes
- **Minor versions** add new features
- **Patch versions** contain bug fixes
- Consider **beta releases** for new major features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run the QA suite: `npm run qa`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- 📧 Email: support@echain.dev
- 🐛 Issues: [GitHub Issues](https://github.com/polymathuniversata/echain-qa-agent/issues)
- 📖 Docs: [Full Documentation](https://docs.echain.dev/qa-agent)# Test bypass functionality
# Another test
