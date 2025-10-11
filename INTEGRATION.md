# QA Agent Integration Guide

This guide shows how to automatically trigger QA Agent checks in crucial development scenarios.

## 🚀 Quick Setup

### 1. Install QA Agent
```bash
# Globally (recommended for all projects)
npm install -g @echain/qa-agent

# Or locally in your project
npm install --save-dev @echain/qa-agent
```

### 2. Initialize QA Configuration
```bash
echain-qa init
```

### 3. Setup Git Hooks (Automatic)
```bash
# Run once in any project to enable automatic QA checks
npm run setup:hooks
# or
./scripts/setup-hooks.sh
```

## 🎯 Automatic Triggers

### Git Operations
- **Pre-commit**: Fast QA checks before every commit
- **Pre-push**: Comprehensive QA checks before pushing to remote

### Development Workflow
- **Dev Server**: QA checks run automatically when starting development servers
- **Build Process**: QA verification integrated into build pipelines
- **CI/CD**: Automated QA checks in continuous integration

### IDE Integration
- **VS Code Tasks**: One-click QA checks from Command Palette
- **Problem Matchers**: Direct error navigation in editor

## 📋 Detailed Setup Instructions

### Git Hooks Setup

The `setup-hooks.sh` script automatically installs pre-commit and pre-push hooks:

```bash
# Install hooks in current project
./scripts/setup-hooks.sh

# Or use npm script
npm run setup:hooks
```

**What the hooks do:**
- **pre-commit**: Runs fast QA checks (`echain-qa run --dry-run`)
- **pre-push**: Runs comprehensive QA checks (`echain-qa run`)

### Development Server Integration

Use the QA-enabled dev server script instead of direct npm/yarn/bun commands:

```bash
# Instead of: npm run dev
npm run dev:qa

# Instead of: yarn dev
yarn dev:qa

# Instead of: bun run dev
bun run dev:qa
```

This automatically runs QA checks before starting your dev server.

### CI/CD Integration

#### GitHub Actions
Copy the workflow from `.github/workflows/qa-agent-ci.yml` to your project:

```yaml
# In your .github/workflows/ci.yml
- name: Run QA Agent
  run: npx echain-qa run
```

#### Other CI Systems
Use the CI pipeline script:

```bash
# In your CI configuration
./scripts/ci-pipeline.sh

# With environment variables
DRY_RUN=true VERBOSE=true STRICT_MODE=false ./scripts/ci-pipeline.sh

# Skip specific checks for faster CI runs
SKIP_TESTING=true SKIP_BUILD=true ./scripts/ci-pipeline.sh
```

### VS Code Integration

The `.vscode/tasks.json` provides one-click QA commands:

- **Ctrl+Shift+P** → "Tasks: Run Task" → "QA: Run Full Suite"
- **Ctrl+Shift+P** → "Tasks: Run Task" → "QA: Run Linting"
- **Ctrl+Shift+P** → "Tasks: Run Task" → "Dev Server with QA Checks"

### Package.json Integration

Add these scripts to your project's package.json:

```json
{
  "scripts": {
    "qa": "echain-qa run",
    "qa:lint": "echain-qa lint",
    "qa:test": "echain-qa test",
    "qa:security": "echain-qa security",
    "qa:build": "echain-qa build",
    "dev:qa": "./scripts/dev-with-qa.sh",
    "precommit": "echain-qa run --dry-run",
    "prepush": "echain-qa run"
  }
}
```

## 🔧 Advanced Configuration

### Custom QA Configuration

Create `.qa-config.json` in your project root:

```json
{
  "version": "2.0.0",
  "project": {
    "name": "My Project",
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
  "paths": {
    "frontend": "frontend",
    "blockchain": "blockchain",
    "docs": "docs",
    "tests": "test"
  }
}
```

### Environment Variables

Control QA behavior with environment variables:

```bash
# CI/CD mode
DRY_RUN=true VERBOSE=true STRICT_MODE=false ./scripts/ci-pipeline.sh

# Development mode
DRY_RUN=false VERBOSE=true

# Strict mode (fail on warnings)
STRICT_MODE=true
```

## 🎯 Trigger Points Summary

| Trigger Point | Command/Script | When | Check Level |
|---------------|----------------|------|-------------|
| Git Commit | `pre-commit` hook | Before commit | Fast (dry-run) |
| Git Push | `pre-push` hook | Before push | Comprehensive |
| Dev Server | `dev-with-qa.sh` | Server start | Fast checks |
| CI/CD | `ci-pipeline.sh` | Build pipeline | Full suite |
| Manual | `echain-qa run` | On-demand | Configurable |
| VS Code | Tasks menu | IDE workflow | All checks |

## 🛠️ Troubleshooting

### Hooks Not Running
```bash
# Check hook permissions
ls -la .git/hooks/pre-commit

# Reinstall hooks
npm run setup:hooks
```

### QA Agent Not Found
```bash
# Install globally
npm install -g @echain/qa-agent

# Or locally
npm install --save-dev @echain/qa-agent
```

### Permission Issues
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

## 📊 Monitoring & Reports

QA Agent generates:
- **Console Output**: Real-time progress and results
- **QA Log**: `docs/qalog.md` with detailed session logs
- **JSON Report**: `qa-report.json` with structured results

## 🎉 Benefits

✅ **Automatic Quality Assurance** - No more forgetting to run checks
✅ **Early Error Detection** - Catch issues before they reach CI/CD
✅ **Consistent Standards** - Same checks across all team members
✅ **Faster Feedback** - Immediate results in development workflow
✅ **CI/CD Integration** - Seamless integration with existing pipelines

---

**Ready to get started?** Run `echain-qa init` in your project! 🚀