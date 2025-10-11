# 🛠️ Basic Usage

Learn the core commands and workflows for using echain-qa-agent effectively in your development process.

## 📋 Table of Contents

- [Core Commands](#-core-commands)
- [Command Options](#-command-options)
- [Workflow Examples](#-workflow-examples)
- [Output Interpretation](#-output-interpretation)
- [Exit Codes](#-exit-codes)

## 🏃 Core Commands

### Primary Commands

| Command | Description | Use Case |
|---------|-------------|----------|
| `echain-qa run` | Full QA suite | Complete project check |
| `echain-qa lint` | Code quality only | Quick code review |
| `echain-qa test` | Testing only | Verify functionality |
| `echain-qa security` | Security scan only | Check vulnerabilities |
| `echain-qa build` | Build verification | Ensure deployability |

### Setup Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `echain-qa init` | Initialize configuration | First-time setup |
| `echain-qa setup-hooks` | Install git hooks | Enable automation |
| `echain-qa wrap-scripts` | Wrap npm scripts | Add QA to workflows |
| `echain-qa check-hooks` | Verify hook status | Troubleshoot hooks |

### Utility Commands

| Command | Description |
|---------|-------------|
| `echain-qa --help` | Show help | Learn commands |
| `echain-qa --version` | Show version | Check installation |

## ⚙️ Command Options

### Global Options

```bash
echain-qa run [options]
```

| Option | Short | Description | Example |
|--------|-------|-------------|---------|
| `--verbose` | `-v` | Detailed output | `echain-qa run -v` |
| `--quiet` | `-q` | Minimal output | `echain-qa run -q` |
| `--dry-run` | | Show what would run | `echain-qa run --dry-run` |
| `--config <file>` | | Custom config file | `echain-qa run --config custom.json` |
| `--project-root <dir>` | | Project directory | `echain-qa run --project-root ./my-project` |

### Check-Specific Options

```bash
# Skip specific checks
echain-qa run --skip-linting --skip-testing

# Skip categories
echain-qa run --skip-security --skip-build

# Force fresh run (ignore cache)
echain-qa run --no-cache
```

### Output Control

```bash
# JSON output for scripts/tools
echain-qa run --json

# Save report to specific file
echain-qa run --output my-report.json

# Custom log file
echain-qa run --log-file custom-log.md
```

## 🚀 Workflow Examples

### Daily Development

```bash
# Quick check before committing
echain-qa run --dry-run --quiet

# Full check before pushing
echain-qa run

# Check only what you changed
echain-qa lint
```

### CI/CD Pipeline

```bash
# Fast feedback (lint + tests)
echain-qa run --skip-security --skip-build

# Comprehensive check
echain-qa run --verbose

# Security-focused check
echain-qa security --verbose
```

### Debugging Issues

```bash
# Verbose output for troubleshooting
echain-qa run --verbose

# Isolate failing check
echain-qa test --verbose

# Check configuration
echain-qa run --dry-run --verbose
```

### Script Integration

```bash
# In package.json scripts
{
  "scripts": {
    "qa": "echain-qa run",
    "qa:quick": "echain-qa run --dry-run --quiet",
    "qa:ci": "echain-qa run --skip-security"
  }
}
```

## 📊 Output Interpretation

### Success Output

```
🚀 Starting QA Suite v2.1.0
📊 Project: MyProject (Hardhat)

🔍 Code Quality Check...
✅ ESLint: 0 errors, 0 warnings
✅ Prettier: All files formatted

🧪 Testing Phase...
✅ Unit tests: 15 passed, 0 failed
✅ Integration tests: 5 passed, 0 failed

🔒 Security Scan...
✅ Dependencies: No vulnerabilities
✅ Secrets: No exposed keys

🏗️ Build Verification...
✅ Smart contracts: Compiled successfully
✅ Frontend: Build completed

🎉 All checks passed! (2.8s)
Report: qa-report.json
Logs: docs/qalog.md
```

### Warning Output

```
🚀 Starting QA Suite v2.1.0
📊 Project: MyProject (Hardhat)

🔍 Code Quality Check...
⚠️ ESLint: 0 errors, 3 warnings
✅ Prettier: All files formatted

🧪 Testing Phase...
✅ Unit tests: 15 passed, 0 failed

🎉 Checks completed with warnings! (2.1s)
Report: qa-report.json
```

### Error Output

```
🚀 Starting QA Suite v2.1.0
📊 Project: MyProject (Hardhat)

🔍 Code Quality Check...
❌ ESLint: 2 errors, 1 warning
✅ Prettier: All files formatted

🧪 Testing Phase...
❌ Unit tests: 12 passed, 3 failed

💥 Checks failed! (3.2s)
Report: qa-report.json
Fix issues and try again.
```

### Progress Indicators

The QA agent shows progress for long-running operations:

```
🔍 Code Quality Check...
⠋ Analyzing files... (45/120)
✅ ESLint completed
⠙ Checking formatting... (78/120)
✅ Prettier completed
```

## 📁 Generated Files

### QA Report (`qa-report.json`)

```json
{
  "summary": {
    "passed": true,
    "duration": 2800,
    "timestamp": "2025-10-10T14:30:00.000Z",
    "errors": 0,
    "warnings": 0
  },
  "project": {
    "name": "MyProject",
    "type": "blockchain",
    "frameworks": ["hardhat", "nextjs"]
  },
  "checks": {
    "codeQuality": {
      "status": "passed",
      "duration": 1200,
      "details": {
        "eslint": { "errors": 0, "warnings": 0 },
        "prettier": { "formatted": true }
      }
    },
    "testing": {
      "status": "passed",
      "duration": 800,
      "details": {
        "unit": { "passed": 15, "failed": 0 },
        "integration": { "passed": 5, "failed": 0 }
      }
    }
  },
  "system": {
    "nodeVersion": "v18.17.0",
    "platform": "linux",
    "agentVersion": "2.1.0"
  }
}
```

### QA Logs (`docs/qalog.md`)

```
## 🛡️ QA Session: QA_2025-10-10T14_30_00_000Z
**Started:** 2025-10-10T14:30:00.000Z
**Trigger:** CLI

| Time | Level | Message |
|------|--------|---------|
| 2:30:00 PM | INFO | Starting comprehensive QA suite... |
| 2:30:01 PM | INFO | Project detected: Hardhat + Next.js |
| 2:30:01 PM | SUCCESS | Code quality checks completed |
| 2:30:02 PM | SUCCESS | Testing completed |
| 2:30:02 PM | SUCCESS | Security scan completed |
| 2:30:03 PM | SUCCESS | Build verification completed |

**Duration:** 2.8s | **Errors:** 0 | **Warnings:** 0
---
```

## 🏷️ Exit Codes

The QA agent uses standard exit codes:

| Code | Meaning | Description |
|------|---------|-------------|
| `0` | Success | All checks passed |
| `1` | Failure | One or more checks failed |
| `2` | Error | Configuration or system error |

### Usage in Scripts

```bash
# Build only if QA passes
echain-qa run && npm run build

# Deploy only if QA passes
echain-qa run --quiet && npm run deploy

# Handle failures
if echain-qa run --quiet; then
  echo "✅ QA passed, proceeding..."
else
  echo "❌ QA failed, please fix issues"
  exit 1
fi
```

## 🎯 Best Practices

### Development Workflow

```bash
# 1. Quick check during development
echain-qa run --dry-run --quiet

# 2. Full check before commits
echain-qa run

# 3. Specific checks for focused work
echain-qa lint    # Code changes
echain-qa test    # Logic changes
echain-qa build   # Deployment changes
```

### CI/CD Optimization

```bash
# Fast feedback pipeline
echain-qa run --skip-security --quiet

# Comprehensive nightly build
echain-qa run --verbose

# Security-focused checks
echain-qa security --verbose
```

### Performance Tips

```bash
# Use caching for faster runs
echain-qa run  # Cache enabled by default

# Skip unnecessary checks
echain-qa run --skip-build  # For logic-only changes

# Parallel processing
echain-qa run --parallel  # When available
```

## 🔧 Troubleshooting

### Common Issues

**Command not found:**
```bash
# Use npx for local installation
npx echain-qa run

# Check global installation
which echain-qa
```

**Slow performance:**
```bash
# Enable caching
echain-qa run  # Cache is enabled by default

# Skip heavy checks
echain-qa run --skip-security --skip-build
```

**Unexpected failures:**
```bash
# Verbose output
echain-qa run --verbose

# Check configuration
cat .qa-config.json

# Validate project structure
echain-qa run --dry-run --verbose
```

## 📚 Next Steps

- **[Advanced Features](./advanced-features.md)**: Caching, plugins, customization
- **[Git Integration](./git-integration.md)**: Hooks, automation, CI/CD
- **[Configuration](../configuration/)**: Detailed setup options
- **[Troubleshooting](../troubleshooting/)**: Common issues and solutions

Need help? Check the [FAQ](../faq.md) or create an [issue](https://github.com/polymathuniversata/echain-qa-agent/issues).</content>
<parameter name="filePath">e:\Polymath Universata\EchainQaAgent\docs\user-guide\basic-usage.md