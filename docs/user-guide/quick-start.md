# ⚡ Quick Start Guide

Get up and running with echain-qa-agent in 5 minutes! This hands-on tutorial walks you through your first QA run.

## 🎯 Goal

By the end of this guide, you'll have:
- ✅ QA agent installed and configured
- ✅ First QA check completed
- ✅ Understanding of core features
- ✅ Ready for regular development use

## 📋 Prerequisites

- Node.js ≥18.0.0 installed
- A blockchain/Web3 project (or create a test one)
- Basic terminal/command line knowledge

## 🚀 Step 1: Installation

### Option A: Local Installation (Recommended)

```bash
# Navigate to your project
cd /path/to/your/blockchain-project

# Install as dev dependency
npm install --save-dev echain-qa-agent
```

**Expected output:**
```
+ echain-qa-agent@2.1.0
✅ Git hooks configured automatically
✅ Configuration initialized
```

### Option B: Global Installation

```bash
# Install globally
npm install -g echain-qa-agent

# Navigate to your project
cd /path/to/your/project

# Set up hooks manually
echain-qa setup-hooks
```

## 🔍 Step 2: Project Detection

The QA agent automatically detects your project type. Let's see what it finds:

```bash
# Check project detection
echain-qa run --dry-run --verbose
```

**Example output:**
```
🔍 Analyzing project structure...
📊 Detected frameworks: Hardhat, Next.js
📁 Found directories: contracts/, test/, frontend/
⚙️ Configuration: .qa-config.json created
```

## 🧪 Step 3: First QA Run

Run your first comprehensive QA check:

```bash
# Run full QA suite
echain-qa run
```

**Watch the progress:**
```
🚀 Starting QA Suite v2.1.0
📊 Project: MyBlockchainProject (Hardhat + Next.js)

🔍 Code Quality Check...
✅ ESLint: 0 errors, 2 warnings
✅ Prettier: All files formatted

🧪 Testing Phase...
✅ Unit tests: 24 passed
✅ Integration tests: 8 passed

🔒 Security Scan...
✅ Dependencies: No vulnerabilities
✅ Secrets: No exposed keys detected

🏗️ Build Verification...
✅ Smart contracts: Compiled successfully
✅ Frontend: Build completed

🎉 All checks passed! (3.2s)
Report saved: qa-report.json
```

## 📊 Step 4: Understanding Results

### QA Report Structure

Check the generated `qa-report.json`:

```json
{
  "summary": {
    "passed": true,
    "duration": 3200,
    "errors": 0,
    "warnings": 2
  },
  "checks": {
    "codeQuality": {
      "status": "passed",
      "details": {
        "eslint": { "errors": 0, "warnings": 2 },
        "prettier": { "formatted": true }
      }
    },
    "testing": {
      "status": "passed",
      "details": {
        "unit": { "passed": 24, "failed": 0 },
        "integration": { "passed": 8, "failed": 0 }
      }
    }
  }
}
```

### QA Log

View detailed logs in `docs/qalog.md`:

```
## 🛡️ QA Session: QA_2025-10-10T14_30_00_000Z
**Started:** 2025-10-10T14:30:00.000Z
**Trigger:** CLI

| Time | Level | Message |
|------|--------|---------|
| 2:30:00 PM | INFO | Starting comprehensive QA suite... |
| 2:30:01 PM | SUCCESS | Code quality checks completed |
| 2:30:03 PM | SUCCESS | Testing completed |
| 2:30:03 PM | SUCCESS | Security scan completed |
| 2:30:05 PM | SUCCESS | Build verification completed |

**Duration:** 3.2s | **Errors:** 0 | **Warnings:** 2
```

## ⚙️ Step 5: Basic Customization

### Quick Configuration

Edit `.qa-config.json` for your needs:

```json
{
  "checks": {
    "linting": true,
    "testing": true,
    "security": true,
    "build": true
  },
  "caching": {
    "enabled": true
  }
}
```

### Test Different Commands

```bash
# Run only linting
echain-qa lint

# Run only tests
echain-qa test

# Run only security checks
echain-qa security

# Quick check (dry-run)
echain-qa run --dry-run
```

## 🪝 Step 6: Git Integration

### Test Git Hooks

```bash
# Make a small change
echo "// test comment" >> contracts/MyContract.sol

# Try to commit (hooks will run automatically)
git add .
git commit -m "Test QA integration"
```

**Expected behavior:**
```
🔍 Running pre-commit QA checks...
✅ Code quality: Passed
✅ Tests: Passed
[main abc1234] Test QA integration
```

### Manual Hook Testing

```bash
# Test pre-commit hook directly
./.git/hooks/pre-commit

# Test pre-push hook
./.git/hooks/pre-push
```

## 🚨 Step 7: Handling Issues

### If Checks Fail

Don't worry! Common first-run issues:

```bash
# Run with verbose output
echain-qa run --verbose

# Skip problematic checks temporarily
echain-qa run --skip-security --skip-build

# Get help
echain-qa --help
```

### Common Fixes

**Missing dependencies:**
```bash
npm install
```

**Test failures:**
```bash
# Run tests individually
npm test
```

**Build issues:**
```bash
# Check build manually
npm run build
```

## 📈 Step 8: Optimization

### Enable Caching

Caching speeds up repeated runs:

```bash
# Caching is enabled by default
# Check cache status
echain-qa run --verbose | grep cache
```

### Script Integration

Wrap your npm scripts for automatic QA:

```bash
# Wrap build and test scripts
echain-qa wrap-scripts

# Check package.json changes
cat package.json | grep -A 2 -B 2 '"build"'
```

## 🎉 You're Done!

Congratulations! You now have:

- ✅ QA agent installed and configured
- ✅ Automated checks on commits
- ✅ Understanding of core features
- ✅ Ready for development workflow

## 🛣️ Next Steps

### Immediate Next Actions
- **Regular Development**: Run `echain-qa run` during development
- **Team Setup**: Share configuration with team members
- **CI/CD**: Set up automated checks in your pipeline

### Learning More
- **[Basic Usage](./basic-usage.md)**: Core commands and options
- **[Configuration](../configuration/)**: Advanced customization
- **[Best Practices](./best-practices.md)**: Optimization tips

### Advanced Features
- **[Plugin System](../developer-guide/plugin-development.md)**: Custom checks
- **[API Integration](../developer-guide/api-usage.md)**: Programmatic access
- **[CI/CD Setup](./git-integration.md#cicd-integration)**: Pipeline automation

## 🆘 Need Help?

- **Check output**: Run with `--verbose` for details
- **Review logs**: Check `docs/qalog.md` for history
- **Get help**: See [Troubleshooting](../troubleshooting/) guide
- **Ask questions**: [GitHub Discussions](https://github.com/polymathuniversata/echain-qa-agent/discussions)

Happy QA automating! 🎊</content>
<parameter name="filePath">e:\Polymath Universata\EchainQaAgent\docs\user-guide\quick-start.md