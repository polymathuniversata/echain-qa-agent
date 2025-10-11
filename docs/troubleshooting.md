# Troubleshooting Guide

Common issues and solutions when using echain-qa-agent.

## Table of Contents

- [Installation Issues](#-installation-issues)
- [Configuration Problems](#-configuration-problems)
- [Runtime Errors](#-runtime-errors)
- [Plugin Issues](#-plugin-issues)
- [Performance Problems](#-performance-problems)
- [Reporting Issues](#-reporting-issues)
- [Framework-Specific Issues](#-framework-specific-issues)

## 🛠️ Installation Issues

### Node.js Version Issues

**Problem:** Getting errors about unsupported Node.js version.

**Solution:**
```bash
# Check your Node.js version
node --version

# Install Node.js 18+ if needed
# Using nvm (recommended)
nvm install 18
nvm use 18

# Or download from nodejs.org
```

**Error Message:**
```
Error: echain-qa-agent requires Node.js version >= 18.0.0
```

### npm/yarn/bun Issues

**Problem:** Package installation fails.

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# For yarn
yarn cache clean
rm -rf node_modules yarn.lock
yarn install

# For bun
bun install --force
```

### Permission Issues

**Problem:** EACCES permission errors during installation.

**Solutions:**
```bash
# Install globally with sudo (not recommended)
sudo npm install -g echain-qa-agent

# Use nvm and install locally
nvm use 18
npm install echain-qa-agent

# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

## ⚙️ Configuration Problems

### Invalid Configuration File

**Problem:** Configuration file has syntax errors.

**Solutions:**
```bash
# Validate JSON syntax
cat .qa-config.json | jq .

# For YAML configs
cat .qa-config.yaml | yamllint -

# Use online JSON validator
# Or check with Node.js
node -e "console.log(JSON.parse(require('fs').readFileSync('.qa-config.json', 'utf8')))"
```

**Common Issues:**
- Missing commas in JSON
- Incorrect indentation in YAML
- Invalid property names
- Wrong data types

### Framework Not Detected

**Problem:** Framework-specific checks not running.

**Solutions:**
```json
{
  "project": {
    "frameworks": ["hardhat", "foundry"]
  }
}
```

```bash
# Check if framework files exist
ls -la hardhat.config.*
ls -la foundry.toml

# Run with explicit framework
npx echain-qa run --framework hardhat
```

### File Pattern Issues

**Problem:** Files not being analyzed.

**Solutions:**
```json
{
  "project": {
    "files": [
      "contracts/**/*.sol",
      "test/**/*.ts",
      "src/**/*.ts"
    ],
    "exclude": [
      "node_modules/**",
      "artifacts/**"
    ]
  }
}
```

```bash
# Test glob patterns
npx glob "contracts/**/*.sol"
```

## 🚨 Runtime Errors

### Command Not Found

**Problem:** `echain-qa` command not found.

**Solutions:**
```bash
# Install globally
npm install -g echain-qa-agent

# Use npx
npx echain-qa run

# Add to package.json scripts
{
  "scripts": {
    "qa": "echain-qa run"
  }
}
npm run qa
```

### Timeout Errors

**Problem:** Checks timing out.

**Solutions:**
```json
{
  "checks": {
    "testing": {
      "timeout": 120000
    }
  },
  "performance": {
    "parallel": false
  }
}
```

```bash
# Run with increased timeout
npx echain-qa run --timeout 300000
```

### Memory Issues

**Problem:** Out of memory errors.

**Solutions:**
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 node_modules/.bin/echain-qa run

# Run with reduced parallelism
npx echain-qa run --max-concurrency 1
```

### Network Issues

**Problem:** Network requests failing.

**Solutions:**
```bash
# Check network connectivity
curl -I https://registry.npmjs.org

# Configure proxy if needed
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080

# Use different registry
npm config set registry https://registry.npmmirror.com
```

## 🔌 Plugin Issues

### Plugin Not Loading

**Problem:** Custom plugin not being recognized.

**Solutions:**
```json
{
  "plugins": [
    {
      "name": "./plugins/my-plugin",
      "enabled": true
    }
  ]
}
```

```typescript
// Check plugin exports
export class MyPlugin implements CheckerPlugin {
  name = 'my-plugin';
  version = '1.0.0';
  // ...
}
```

### Plugin Sandbox Errors

**Problem:** Plugin failing in sandbox mode.

**Solutions:**
```json
{
  "plugins": [
    {
      "name": "./plugins/my-plugin",
      "sandbox": false
    }
  ]
}
```

```typescript
// Ensure plugin follows security guidelines
// Avoid file system access outside project directory
// Use provided APIs instead of direct system calls
```

### Plugin Dependencies

**Problem:** Plugin missing dependencies.

**Solutions:**
```json
// In plugin's package.json
{
  "dependencies": {
    "echain-qa-agent": "^1.0.0"
  }
}
```

```bash
# Install plugin dependencies
cd plugins/my-plugin
npm install
```

## 🐌 Performance Problems

### Slow Execution

**Problem:** QA checks taking too long.

**Solutions:**
```json
{
  "caching": {
    "enabled": true,
    "ttl": {
      "results": "1h"
    }
  },
  "performance": {
    "parallel": true,
    "maxConcurrency": 2
  }
}
```

```bash
# Run specific checks only
npx echain-qa run --checks codeQuality

# Skip heavy checks
npx echain-qa run --skip security
```

### High Memory Usage

**Problem:** Process using too much memory.

**Solutions:**
```bash
# Run with memory limits
node --max-old-space-size=2048 node_modules/.bin/echain-qa run

# Process files in batches
npx echain-qa run --batch-size 10
```

### Disk Space Issues

**Problem:** Running out of disk space during checks.

**Solutions:**
```json
{
  "caching": {
    "enabled": false
  },
  "reporting": {
    "output": "/tmp/qa-reports"
  }
}
```

```bash
# Clean up old reports
rm -rf qa-reports/
```

## 📊 Reporting Issues

### Report Not Generated

**Problem:** No report files created.

**Solutions:**
```bash
# Specify output directory
npx echain-qa run --output ./qa-reports

# Check write permissions
ls -la qa-reports/

# Use different format
npx echain-qa run --report json
```

### Incomplete Reports

**Problem:** Report missing some check results.

**Solutions:**
```json
{
  "reporting": {
    "includeDetails": true,
    "includeSuggestions": true
  }
}
```

```bash
# Run with verbose output
npx echain-qa run --verbose

# Check individual check results
npx echain-qa run --checks codeQuality --report json
```

### Report Format Issues

**Problem:** Report format not as expected.

**Solutions:**
```bash
# Generate multiple formats
npx echain-qa run --report html,json,junit

# Validate JSON reports
cat qa-reports/results.json | jq .

# Check HTML reports in browser
open qa-reports/index.html
```

## 🏗️ Framework-Specific Issues

### Hardhat Issues

**Problems & Solutions:**

```bash
# Compilation errors
npx hardhat compile

# Test failures
npx hardhat test --verbose

# Gas estimation issues
npx hardhat run scripts/deploy.ts --network localhost
```

```json
{
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19",
        "optimizer": true
      }
    }
  }
}
```

### Foundry Issues

**Problems & Solutions:**

```bash
# Installation issues
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup

# Compilation errors
forge build

# Test failures
forge test -vv
```

```json
{
  "checks": {
    "codeQuality": {
      "solidity": {
        "compiler": "0.8.19"
      }
    }
  }
}
```

### Truffle Issues

**Problems & Solutions:**

```bash
# Compilation errors
npx truffle compile

# Migration issues
npx truffle migrate --network development

# Test failures
npx truffle test
```

### Brownie Issues

**Problems & Solutions:**

```bash
# Installation issues
pip install eth-brownie

# Compilation errors
brownie compile

# Test failures
brownie test -v
```

## 🔧 Advanced Troubleshooting

### Debug Mode

Enable debug logging for detailed information:

```bash
DEBUG=echain-qa:* npx echain-qa run
```

### Verbose Output

```bash
npx echain-qa run --verbose --debug
```

### Check System Resources

```bash
# Check available memory
free -h

# Check disk space
df -h

# Check Node.js version
node --version
npm --version
```

### Isolate Issues

```bash
# Test with minimal config
npx echain-qa run --config minimal-config.json

# Test individual checks
npx echain-qa run --checks codeQuality

# Test without plugins
npx echain-qa run --no-plugins
```

### Clean Environment

```bash
# Clear all caches
rm -rf node_modules/.cache
rm -rf .echain-qa-cache
npm cache clean --force

# Reset configuration
rm .qa-config.json
npx echain-qa init
```

## 📞 Getting Help

If you continue to have issues:

1. **Check the logs:** Run with `--verbose` and check output
2. **Update dependencies:** Ensure you're using the latest version
3. **Check GitHub Issues:** Search for similar problems
4. **Create an issue:** Provide detailed information including:
   - Your OS and Node.js version
   - Full error message
   - Your configuration file
   - Steps to reproduce

### System Information

```bash
# Get system info for bug reports
npx echain-qa --version
node --version
npm --version
uname -a
```

## 🚀 Quick Fixes

### Emergency Stop

```bash
# Kill all QA processes
pkill -f echain-qa

# Clean up temporary files
rm -rf /tmp/echain-qa-*
```

### Reset to Defaults

```bash
# Remove custom config
rm .qa-config.json

# Reinitialize
npx echain-qa init

# Clear caches
rm -rf .echain-qa-cache
```

### Update Everything

```bash
# Update echain-qa-agent
npm update echain-qa-agent

# Update dependencies
npm audit fix

# Clear all caches
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```</content>
<parameter name="filePath">e:\Polymath Universata\EchainQaAgent\docs\troubleshooting.md