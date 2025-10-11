# Frequently Asked Questions

Common questions and answers about echain-qa-agent.

## Table of Contents

- [General Questions](#-general-questions)
- [Installation & Setup](#-installation--setup)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Frameworks](#-frameworks)
- [Plugins](#-plugins)
- [Performance](#-performance)
- [Troubleshooting](#-troubleshooting)

## ❓ General Questions

### What is echain-qa-agent?

**echain-qa-agent** is a comprehensive quality assurance tool for blockchain projects. It automates code quality checks, testing, security analysis, and reporting for smart contract development across multiple frameworks like Hardhat, Foundry, Truffle, and Brownie.

### Why do I need QA for blockchain projects?

Blockchain projects require higher quality standards due to:
- **Financial value**: Smart contracts handle real money
- **Immutability**: Deployed contracts cannot be easily changed
- **Security risks**: Vulnerabilities can lead to significant losses
- **Complexity**: Multi-framework, multi-language projects

### What's the difference between echain-qa-agent and other QA tools?

echain-qa-agent is specifically designed for blockchain development with:
- **Framework awareness**: Native support for Hardhat, Foundry, Truffle, Brownie
- **Security focus**: Integrated security scanning with Slither, Mythril
- **Multi-language support**: Solidity, TypeScript, JavaScript
- **Plugin architecture**: Extensible for custom checks
- **Performance optimization**: Parallel execution and intelligent caching

### Is it free to use?

Yes! echain-qa-agent is open source and free to use under the MIT license.

## 📦 Installation & Setup

### What are the system requirements?

- **Node.js**: Version 18.0.0 or higher
- **Operating System**: Linux, macOS, or Windows
- **Memory**: At least 2GB RAM recommended
- **Disk Space**: 500MB for installation and caches

### Can I use it with npm/yarn/bun?

Yes, all major package managers are supported:

```bash
# npm
npm install --save-dev echain-qa-agent

# yarn
yarn add --dev echain-qa-agent

# bun
bun add --dev echain-qa-agent
```

### How do I install globally?

```bash
npm install -g echain-qa-agent
```

### Can I use it in CI/CD?

Absolutely! It's designed for CI/CD pipelines. See our [CI/CD examples](../examples/cicd/) for GitHub Actions, GitLab CI, and Jenkins configurations.

## ⚙️ Configuration

### Do I need a configuration file?

No, echain-qa-agent can auto-detect your project setup. However, a configuration file gives you full control over checks and behavior.

### What configuration formats are supported?

- JSON (`.qa-config.json`)
- YAML (`.qa-config.yaml`)
- JavaScript (`.qa-config.js`)

### Where should I place the config file?

In your project root directory, named one of:
- `.qa-config.json`
- `.qa-config.yaml`
- `.qa-config.js`
- `qa-config.json`
- `qa-config.yaml`
- `qa-config.js`

### Can I use environment variables?

Yes! Environment variables override configuration values:

```bash
# Override project name
QA_PROJECT_NAME=MyProject npx echain-qa run

# Override check settings
QA_CHECKS_CODEQUALITY_ENABLED=false npx echain-qa run
```

### How do I exclude files?

```json
{
  "project": {
    "exclude": [
      "node_modules/**",
      "artifacts/**",
      "cache/**",
      "coverage/**"
    ]
  }
}
```

## 🚀 Usage

### How do I run QA checks?

```bash
# Run all checks
npx echain-qa run

# Run specific checks
npx echain-qa run --checks codeQuality,testing

# Run with custom config
npx echain-qa run --config ./my-config.json
```

### What's the difference between `run` and `watch`?

- **`run`**: Executes checks once and exits
- **`watch`**: Continuously monitors files and runs checks on changes

### Can I generate reports?

Yes! Multiple formats supported:

```bash
# HTML report (default)
npx echain-qa run --report html

# JSON report
npx echain-qa run --report json

# JUnit for CI/CD
npx echain-qa run --report junit

# Multiple formats
npx echain-qa run --report html,json,junit
```

### How do I fix issues automatically?

```bash
# Attempt to fix auto-fixable issues
npx echain-qa run --fix

# Preview fixes without applying
npx echain-qa run --fix --dry-run
```

## 🏗️ Frameworks

### Which frameworks are supported?

- **Hardhat**: Full support with compilation, testing, coverage
- **Foundry**: Complete integration with Forge tools
- **Truffle**: Legacy framework support
- **Brownie**: Python-based smart contract framework
- **Custom**: Plugin system for other frameworks

### Can I use multiple frameworks in one project?

Yes! echain-qa-agent detects and supports multi-framework projects:

```json
{
  "project": {
    "frameworks": ["hardhat", "foundry"]
  }
}
```

### What if my framework isn't supported?

You can:
1. **Use generic checks**: Basic code quality and security scans
2. **Create a plugin**: Extend support for your framework
3. **Request support**: Open a GitHub issue for new framework requests

### Do I need framework-specific tools installed?

For full functionality:
- **Hardhat**: Node.js and npm/yarn
- **Foundry**: Rust and Cargo (for Forge)
- **Truffle**: Node.js
- **Brownie**: Python and pip

## 🔌 Plugins

### What are plugins?

Plugins extend echain-qa-agent's functionality:
- **Checker plugins**: Add new quality checks
- **Reporter plugins**: Create custom report formats
- **Hook plugins**: Execute custom logic at specific points

### How do I install plugins?

```json
{
  "plugins": [
    {
      "name": "my-custom-checker",
      "enabled": true,
      "config": {
        "strict": true
      }
    }
  ]
}
```

### Are plugins safe?

Plugins run in a sandboxed environment by default. You can disable sandboxing for trusted plugins, but this reduces security.

### Can I create my own plugins?

Yes! See our [plugin development guide](../developer-guide/plugins.md) and [examples](../examples/plugins/).

## ⚡ Performance

### Why is it slow?

Common causes:
- **Large codebase**: Many files to analyze
- **Heavy security checks**: Slither/Mythril can be slow
- **No caching**: First run without cached results
- **Parallel execution**: Too many concurrent processes

### How can I speed it up?

```json
{
  "caching": {
    "enabled": true,
    "ttl": {
      "results": "1h",
      "security": "24h"
    }
  },
  "performance": {
    "parallel": true,
    "maxConcurrency": 2
  }
}
```

```bash
# Skip slow checks for development
npx echain-qa run --skip security

# Run only fast checks
npx echain-qa run --checks codeQuality
```

### What's the caching strategy?

echain-qa-agent caches:
- **Check results**: Based on file content hashes
- **Security scans**: For expensive operations like Slither
- **Compilation artifacts**: For Solidity compilation
- **Test results**: When tests haven't changed

### Can I disable caching?

Yes, for debugging or fresh runs:

```json
{
  "caching": {
    "enabled": false
  }
}
```

## 🔧 Troubleshooting

### Why are my checks failing?

Common reasons:
- **Syntax errors**: Fix compilation issues first
- **Missing dependencies**: Install required packages
- **Configuration errors**: Validate your config file
- **Framework issues**: Ensure framework tools are working

### How do I debug issues?

```bash
# Verbose output
npx echain-qa run --verbose

# Debug mode
DEBUG=echain-qa:* npx echain-qa run

# Single check debugging
npx echain-qa run --checks codeQuality --verbose
```

### What do I do if a check hangs?

```bash
# Increase timeout
npx echain-qa run --timeout 300000

# Run without parallelism
npx echain-qa run --max-concurrency 1

# Skip problematic check
npx echain-qa run --skip security
```

### How do I reset everything?

```bash
# Clear caches
rm -rf .echain-qa-cache

# Reset config
rm .qa-config.json
npx echain-qa init

# Clean dependencies
rm -rf node_modules package-lock.json
npm install
```

## 🤝 Contributing

### How can I contribute?

- **Report bugs**: Open GitHub issues with detailed information
- **Suggest features**: Describe your use case and requirements
- **Write documentation**: Help improve guides and examples
- **Create plugins**: Share your custom plugins with the community
- **Submit code**: Fork and create pull requests

### Can I request new features?

Yes! Open a GitHub issue with:
- **Use case**: What problem are you trying to solve?
- **Current workaround**: How do you handle it now?
- **Proposed solution**: What would you like to see?
- **Priority**: How important is this to you?

### How do I report security issues?

Please report security vulnerabilities privately:
1. Don't create public GitHub issues
2. Email security@echain-qa-agent.com (placeholder)
3. Include detailed reproduction steps
4. Allow time for fixes before public disclosure

## 📈 Advanced Topics

### Can I use it programmatically?

Yes! Full API access:

```typescript
import { QAAgent } from 'echain-qa-agent';

const agent = new QAAgent(config);
const results = await agent.run();
```

### What's the plugin API?

Plugins implement specific interfaces:
- `CheckerPlugin`: For quality checks
- `ReporterPlugin`: For custom reports
- `HookPlugin`: For lifecycle hooks

### Can I integrate with other tools?

Yes! echain-qa-agent works with:
- **Code editors**: VS Code, Cursor, Windsurf
- **CI/CD**: GitHub Actions, GitLab CI, Jenkins
- **Monitoring**: Custom dashboards and alerts
- **Other QA tools**: ESLint, Prettier, etc.

### What's the roadmap?

Current focus areas:
- **Performance improvements**: Faster execution and better caching
- **New framework support**: More blockchain frameworks
- **Enhanced security**: Additional security scanners
- **Better reporting**: More report formats and integrations
- **Plugin ecosystem**: Community plugin marketplace

## 📞 Support

### Where can I get help?

1. **Documentation**: Check this FAQ and our guides
2. **GitHub Issues**: Search existing issues or create new ones
3. **Community**: Join our Discord/GitHub Discussions
4. **Professional Support**: Contact us for enterprise support

### What information should I include in bug reports?

- **Version**: `npx echain-qa --version`
- **Environment**: Node.js version, OS, framework
- **Configuration**: Your config file (sanitize sensitive data)
- **Steps to reproduce**: Minimal example that reproduces the issue
- **Expected vs actual behavior**: What should happen vs what does happen
- **Logs**: Verbose output with `--verbose` flag

### How quickly are issues addressed?

- **Bug fixes**: Within 24-48 hours for critical issues
- **Feature requests**: Evaluated within 1 week
- **Documentation**: Updated within hours for critical fixes
- **Community support**: Best effort, typically within 24 hours

---

Still have questions? Check our [troubleshooting guide](../troubleshooting.md) or open a [GitHub issue](https://github.com/your-org/echain-qa-agent/issues).</content>
<parameter name="filePath">e:\Polymath Universata\EchainQaAgent\docs\faq.md