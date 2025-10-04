# echain-qa-agent

[![npm version](https://badge.fury.io/js/echain-qa-agent.svg)](https://badge.fury.io/js/echain-qa-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

A comprehensive QA automation tool designed specifically for blockchain and Web3 projects. This package provides automated code quality checks, testing, security scanning, and documentation updates to ensure your project maintains high standards.

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

### Global Installation (Recommended)

```bash
npm install -g echain-qa-agent
# or
bun add -g echain-qa-agent
```

### Local Installation

```bash
npm install --save-dev echain-qa-agent
# or
bun add -d echain-qa-agent
```

## Quick Start

1. **Install the QA agent**:
   ```bash
   npm install --save-dev echain-qa-agent
   ```

2. **Initialize QA configuration**:
   ```bash
   npx echain-qa init
   ```

3. **Run your first QA check**:
   ```bash
   npx echain-qa run
   ```

The QA agent will automatically detect your project structure and run appropriate checks!

## Git Hooks Setup

When you install the QA agent as a dev dependency (`npm install --save-dev echain-qa-agent`), you can optionally set up git hooks for automatic QA checks.

The hooks include:
- **pre-commit hook**: Runs fast QA checks (dry-run) before each commit
- **pre-push hook**: Runs comprehensive QA checks before pushing to remote

To set up the hooks, run:

```bash
npx echain-qa setup-hooks
# or
bash ./node_modules/.bin/setup-hooks.sh
```

The hooks will automatically detect and use the QA agent if available.

To test the hooks:
1. Make a small change to any file
2. Run: `git add . && git commit -m 'test'`

### Bypassing QA Checks

As a developer working on the QA agent itself, you may need to bypass checks during development:

#### Environment Variable Bypass
```bash
# Skip QA checks for commit
SKIP_QA_CHECKS=1 git commit -m "your message"

# Skip QA checks for push
SKIP_QA_CHECKS=1 git push origin main
```

#### Commit Message Tag Bypass
Add one of these tags to your commit message:
```bash
git commit -m "feat: new feature [skip.qa]"
git commit -m "fix: bug fix [no.qa]"
git commit -m "refactor: code cleanup [bypass.qa]"
```

The pre-push hook will also check recent commits for skip tags.

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

After global installation, use the `echain-qa` command:

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

# Run with dry-run mode (no actual changes)
echain-qa run --dry-run

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
- Unit tests for blockchain contracts (Hardhat, Foundry, Truffle)
- Frontend component tests
- Integration tests
- End-to-end tests (if configured)

### Security
- NPM audit for dependency vulnerabilities
- Secret detection in source code with progress bars
- Exposed API keys and private keys scanning
- Custom security rules via plugins

### Build Verification
- Frontend production build with progress tracking
- Smart contract compilation
- Bundle size checks

### Performance (Optional)
- Load testing for large codebases
- Bundle analysis
- Custom performance metrics via plugins

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
