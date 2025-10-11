# 🚀 Getting Started

Welcome to echain-qa-agent! This guide will help you install and set up the QA agent for your blockchain or Web3 project.

## 📋 Prerequisites

Before installing, ensure you have:

- **Node.js** ≥18.0.0 ([Download](https://nodejs.org/))
- **npm** or **bun** package manager
- **Git** (for hooks and version control)
- A **blockchain/Web3 project** (optional but recommended)

### Verify Installation

```bash
# Check Node.js version
node --version
# Should show v18.0.0 or higher

# Check npm version
npm --version
# Should show a recent version

# Check git
git --version
# Should show git version info
```

## 🛠️ Installation Options

### Option 1: Local Installation (Recommended)

Install as a dev dependency in your project:

```bash
# Using npm
npm install --save-dev echain-qa-agent

# Using bun
bun add -d echain-qa-agent

# Using yarn
yarn add -d echain-qa-agent
```

**Benefits:**
- Automatic git hook setup
- Project-specific installation
- Version controlled with your project

### Option 2: Global Installation

Install system-wide for multiple projects:

```bash
# Using npm
npm install -g echain-qa-agent

# Using bun
bun add -g echain-qa-agent
```

**Benefits:**
- Available across all projects
- Single installation for multiple repos

## ⚙️ Initial Setup

### For Local Installation

After installation, the QA agent automatically:
1. Sets up git hooks (pre-commit, pre-push)
2. Creates initial configuration
3. Detects your project structure

You should see output like:
```
✅ echain-qa-agent installed successfully
✅ Git hooks configured
✅ Configuration initialized
```

### For Global Installation

After global installation, set up hooks manually:

```bash
# Navigate to your project
cd /path/to/your/project

# Set up git hooks
echain-qa setup-hooks
# or
npx echain-qa setup-hooks
```

## 🔍 Project Detection

The QA agent automatically detects your project type:

### Supported Frameworks

| Framework | Detection | Features |
|-----------|-----------|----------|
| **Hardhat** | `hardhat.config.js/ts` | Solidity compilation, testing |
| **Foundry** | `foundry.toml` | Forge tests, contract verification |
| **Truffle** | `truffle-config.js` | Migration testing, deployment |
| **Next.js** | `next.config.js` | React testing, build verification |
| **Vite** | `vite.config.js/ts` | Modern web app testing |
| **Custom** | Manual config | Full customization |

### Detection Process

1. Scans for framework configuration files
2. Analyzes `package.json` scripts and dependencies
3. Checks for common project structures
4. Applies framework-specific defaults

## 🧪 First QA Run

### Quick Test

Run your first QA check:

```bash
# If installed locally
npx echain-qa run

# If installed globally
echain-qa run
```

You should see output like:
```
🔍 Starting QA analysis...
📊 Project detected: Hardhat + Next.js
⚡ Running checks...

✅ Code Quality: Passed
✅ Testing: Passed
✅ Security: Passed
✅ Build: Passed

🎉 All checks passed! (2.3s)
```

### Understanding the Output

- **Project Detection**: Shows detected frameworks
- **Progress Bars**: Visual feedback during checks
- **Results**: Pass/fail status for each check
- **Timing**: Total execution time

## 📁 Project Structure

The QA agent expects this structure:

```
your-project/
├── contracts/          # Smart contracts (Solidity/Vyper)
├── test/              # Test files
├── scripts/           # Deployment/build scripts
├── frontend/          # Web interface (optional)
├── .qa-config.json    # QA configuration (auto-created)
├── qa-report.json     # QA results (generated)
└── docs/qalog.md      # QA logs (generated)
```

### Auto-Created Files

After first run, you'll have:
- **`.qa-config.json`**: Configuration file
- **`qa-report.json`**: Detailed results
- **`docs/qalog.md`**: Session logs

## 🔧 Basic Configuration

### Default Configuration

The agent creates a `.qa-config.json` with smart defaults:

```json
{
  "version": "2.1.0",
  "project": {
    "name": "Your Project",
    "type": "blockchain",
    "frameworks": ["hardhat"]
  },
  "checks": {
    "linting": true,
    "testing": true,
    "security": true,
    "build": true
  }
}
```

### Customization

Edit `.qa-config.json` to customize:

```json
{
  "checks": {
    "linting": true,
    "testing": true,
    "security": false,  // Disable security checks
    "build": true
  },
  "qualityGates": {
    "failOnTestFailures": true,
    "requireTestCoverage": false
  }
}
```

## 🪝 Git Hooks Setup

### Automatic Setup

Local installation sets up hooks automatically. Verify:

```bash
# Check hook files
ls -la .git/hooks/
# Should show pre-commit and pre-push hooks

# Test hooks
cat .git/hooks/pre-commit
# Should contain QA agent commands
```

### Manual Setup

If needed, set up hooks manually:

```bash
# Install hooks
echain-qa setup-hooks

# Verify installation
echain-qa check-hooks
```

### Hook Behavior

- **pre-commit**: Fast checks (dry-run mode)
- **pre-push**: Full checks before pushing
- **Bypass**: Use `--no-verify` to skip hooks

## 🚨 Troubleshooting Installation

### Common Issues

#### "Command not found"
```bash
# For local installation, use npx
npx echain-qa run

# For global, check PATH
which echain-qa
echo $PATH
```

#### "Git hooks not working"
```bash
# Make hooks executable
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push

# Reinstall hooks
echain-qa setup-hooks
```

#### "Permission denied"
```bash
# On Windows, ensure git hooks are enabled
git config core.hooksPath .git/hooks

# On Linux/Mac, check permissions
ls -la .git/hooks/
```

#### "Node version too old"
```bash
# Update Node.js
# Using nvm
nvm install 18
nvm use 18

# Check version
node --version
```

### Getting Help

If you encounter issues:
1. Check the [Troubleshooting](../troubleshooting/) guide
2. Review [FAQ](../faq.md)
3. Search existing [issues](https://github.com/polymathuniversata/echain-qa-agent/issues)
4. Create a new issue with your setup details

## 🎯 Next Steps

Now that you're set up:

1. **Run QA checks** regularly during development
2. **Customize configuration** for your needs
3. **Set up CI/CD** integration
4. **Explore plugins** for additional checks

Continue to:
- [Quick Start](./quick-start.md) - Hands-on tutorial
- [Basic Usage](./basic-usage.md) - Core commands
- [Configuration](../configuration/) - Advanced setup

Happy coding! 🚀</content>
<parameter name="filePath">e:\Polymath Universata\EchainQaAgent\docs\user-guide\getting-started.md