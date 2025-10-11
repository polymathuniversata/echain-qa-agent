# 🔗 Git Integration

Integrate echain-qa-agent seamlessly into your Git workflow with hooks, automation, and CI/CD pipelines for continuous quality assurance.

## 📋 Table of Contents

- [Git Hooks](#-git-hooks)
- [Pre-commit Hooks](#-pre-commit-hooks)
- [Pre-push Hooks](#-pre-push-hooks)
- [CI/CD Integration](#-cicd-integration)
- [GitHub Actions](#-github-actions)
- [GitLab CI/CD](#-gitlab-cicd)
- [Jenkins Pipeline](#-jenkins-pipeline)
- [Branch Protection](#-branch-protection)
- [Automated Fixes](#-automated-fixes)
- [Git-aware Features](#-git-aware-features)

## 🎣 Git Hooks

### Hook Types

Git hooks are scripts that run automatically at specific points in the Git workflow. echain-qa-agent provides pre-configured hooks for quality assurance.

| Hook | Timing | Purpose | QA Action |
|------|--------|---------|-----------|
| **pre-commit** | Before commit | Code quality check | Lint, format, basic tests |
| **pre-push** | Before push | Full validation | All checks, security scan |
| **commit-msg** | After commit message | Message validation | Format validation |
| **post-commit** | After commit | Logging | Update QA logs |
| **post-merge** | After merge | Dependency check | Update dependencies |

### Installing Hooks

```bash
# Automatic installation
echain-qa setup-hooks

# Manual installation
echain-qa setup-hooks --manual

# Install specific hooks
echain-qa setup-hooks --hooks pre-commit,pre-push

# Dry run to see what would be installed
echain-qa setup-hooks --dry-run
```

### Hook Configuration

```json
{
  "hooks": {
    "pre-commit": {
      "enabled": true,
      "checks": ["lint", "format", "unit-tests"],
      "failOnWarnings": false,
      "autoFix": true
    },
    "pre-push": {
      "enabled": true,
      "checks": ["all"],
      "failOnWarnings": true,
      "timeout": 300
    },
    "commit-msg": {
      "enabled": true,
      "pattern": "^(feat|fix|docs|style|refactor|test|chore): .+",
      "caseSensitive": false
    }
  }
}
```

## 🛡️ Pre-commit Hooks

### Purpose

Pre-commit hooks run before each commit to catch issues early and maintain code quality.

### Default Behavior

```bash
# Runs automatically on 'git commit'
# Checks: linting, formatting, unit tests
# Duration: ~5-15 seconds
# Fails commit if issues found
```

### Configuration Options

```json
{
  "hooks": {
    "pre-commit": {
      "enabled": true,
      "checks": [
        "eslint",
        "prettier",
        "unit-tests"
      ],
      "failOnWarnings": false,
      "autoFix": true,
      "stagedOnly": true,
      "timeout": 60
    }
  }
}
```

### Auto-fix Feature

```bash
# Automatically fix formatting issues
git add .
git commit -m "feat: add new feature"
# Pre-commit hook runs, fixes formatting, stages fixes
# Commit proceeds with fixed code
```

### Skipping Hooks

```bash
# Skip all hooks (not recommended)
git commit --no-verify -m "urgent fix"

# Skip specific checks
SKIP_QA_CHECKS=linting,testing git commit -m "temp commit"
```

## 🚀 Pre-push Hooks

### Purpose

Pre-push hooks run before pushing to remote repositories to ensure comprehensive quality checks.

### Default Behavior

```bash
# Runs automatically on 'git push'
# Checks: all QA checks including security
# Duration: ~30-120 seconds
# Prevents pushing broken code
```

### Configuration Options

```json
{
  "hooks": {
    "pre-push": {
      "enabled": true,
      "checks": ["all"],
      "failOnWarnings": true,
      "remoteOnly": true,
      "branches": ["main", "develop"],
      "timeout": 300,
      "retry": {
        "enabled": true,
        "maxAttempts": 2,
        "delay": 5
      }
    }
  }
}
```

### Branch-specific Rules

```json
{
  "hooks": {
    "pre-push": {
      "branchRules": {
        "main": {
          "checks": ["all"],
          "strict": true
        },
        "develop": {
          "checks": ["code-quality", "testing"],
          "strict": false
        },
        "feature/*": {
          "checks": ["lint", "unit-tests"],
          "strict": false
        }
      }
    }
  }
}
```

## 🔄 CI/CD Integration

### CI/CD Strategies

| Strategy | Use Case | Benefits | Drawbacks |
|----------|----------|----------|-----------|
| **Gates** | Quality gates | Prevents bad merges | Slower feedback |
| **Parallel** | Fast feedback | Quick results | Resource intensive |
| **Incremental** | Large projects | Faster builds | Complex setup |
| **Scheduled** | Nightly checks | Comprehensive | Delayed feedback |

### Basic CI Pipeline

```yaml
# Basic quality gate
name: QA Gate
on: [push, pull_request]

jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx echain-qa run --json
```

## 🐙 GitHub Actions

### Complete Workflow

```yaml
# .github/workflows/qa.yml
name: Quality Assurance
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '18'

jobs:
  # Fast feedback job
  qa-fast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: ~/.npm
          key: npm-${{ hashFiles('package-lock.json') }}
      - name: Install dependencies
        run: npm ci
      - name: Run fast QA checks
        run: npx echain-qa run --skip-security --skip-build --json --output qa-fast.json
      - name: Upload fast QA report
        uses: actions/upload-artifact@v3
        with:
          name: qa-fast-report
          path: qa-fast.json

  # Comprehensive QA job
  qa-full:
    runs-on: ubuntu-latest
    needs: qa-fast
    if: github.event_name == 'push' || github.event.pull_request.head.repo.full_name == github.repository
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: ~/.npm
          key: npm-${{ hashFiles('package-lock.json') }}
      - name: Install dependencies
        run: npm ci
      - name: Run comprehensive QA
        run: npx echain-qa run --verbose --json --output qa-full.json
      - name: Upload QA report
        uses: actions/upload-artifact@v3
        with:
          name: qa-full-report
          path: qa-full.json
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('qa-full.json', 'utf8'));

            const status = report.summary.status === 'passed' ? '✅' : '❌';
            const comment = `## QA Results ${status}

            **Status:** ${report.summary.status}
            **Duration:** ${report.summary.duration}ms
            **Errors:** ${report.summary.errors}
            **Warnings:** ${report.summary.warnings}

            [View full report](https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }})`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Matrix Testing

```yaml
# Test across multiple Node versions and environments
name: QA Matrix
on: [push, pull_request]

jobs:
  qa-matrix:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: ['16', '18', '20']
        framework: ['hardhat', 'foundry']
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - name: Setup framework
        run: |
          if [ "${{ matrix.framework }}" = "hardhat" ]; then
            npm install --save-dev hardhat
          elif [ "${{ matrix.framework }}" = "foundry" ]; then
            # Install Foundry
            curl -L https://foundry.paradigm.xyz | bash
          fi
      - name: Install dependencies
        run: npm ci
      - name: Run QA
        run: npx echain-qa run --framework ${{ matrix.framework }} --json
```

### Status Checks

```yaml
# Required status checks for branch protection
# GitHub Settings > Branches > Branch protection rules
# Require status checks to pass before merging

required_status_checks:
  strict: true  # Require branches to be up to date
  contexts:
    - qa-fast
    - qa-full
    - test
    - lint
```

## 🏃 GitLab CI/CD

### Basic Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - qa
  - test
  - deploy

qa:
  stage: qa
  image: node:18
  before_script:
    - npm ci
  script:
    - npx echain-qa run --json --output qa-report.json
  artifacts:
    reports:
      junit: qa-report.json
    paths:
      - qa-report.json
    expire_in: 1 week
  only:
    - merge_requests
    - main

qa:full:
  stage: qa
  image: node:18
  before_script:
    - npm ci
  script:
    - npx echain-qa run --verbose --json --output qa-full-report.json
  artifacts:
    reports:
      junit: qa-full-report.json
    paths:
      - qa-full-report.json
    expire_in: 1 week
  only:
    - main
```

### Advanced GitLab Pipeline

```yaml
# Comprehensive QA pipeline with caching and parallel jobs
stages:
  - prepare
  - qa
  - report

variables:
  NODE_VERSION: "18"

# Cache dependencies
cache:
  key:
    files:
      - package-lock.json
  paths:
    - node_modules/
    - .npm/

prepare:
  stage: prepare
  image: node:${NODE_VERSION}
  script:
    - npm ci --cache .npm --prefer-offline
  artifacts:
    paths:
      - node_modules/
    expire_in: 1 hour

qa:lint:
  stage: qa
  image: node:${NODE_VERSION}
  dependencies:
    - prepare
  script:
    - npx echain-qa lint --json --output lint-report.json
  artifacts:
    reports:
      codequality: lint-report.json
    paths:
      - lint-report.json

qa:test:
  stage: qa
  image: node:${NODE_VERSION}
  dependencies:
    - prepare
  script:
    - npx echain-qa test --json --output test-report.json
  artifacts:
    reports:
      junit: test-report.json
    paths:
      - test-report.json

qa:security:
  stage: qa
  image: node:${NODE_VERSION}
  dependencies:
    - prepare
  script:
    - npx echain-qa security --json --output security-report.json
  artifacts:
    reports:
      sast: security-report.json
    paths:
      - security-report.json

qa:build:
  stage: qa
  image: node:${NODE_VERSION}
  dependencies:
    - prepare
  script:
    - npx echain-qa build --json --output build-report.json
  artifacts:
    paths:
      - build-report.json

report:
  stage: report
  image: node:${NODE_VERSION}
  dependencies:
    - qa:lint
    - qa:test
    - qa:security
    - qa:build
  script:
    - npx echain-qa report --merge *.json --output merged-report.json
  artifacts:
    reports:
      junit: merged-report.json
    paths:
      - merged-report.json
  only:
    - merge_requests
```

## 🔧 Jenkins Pipeline

### Declarative Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent {
        docker {
            image 'node:18'
            args '-u root'
        }
    }

    environment {
        NODE_ENV = 'production'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('QA Checks') {
            steps {
                sh 'npx echain-qa run --json --output qa-report.json'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'qa-report.json', fingerprint: true
                    publishCoverage adapters: [istanbul(mergeToOneReport: true, path: 'coverage')]
                }
                failure {
                    script {
                        def report = readJSON file: 'qa-report.json'
                        echo "QA Failed: ${report.summary.errors} errors, ${report.summary.warnings} warnings"
                    }
                }
            }
        }

        stage('Security Scan') {
            when {
                anyOf {
                    branch 'main'
                    changeRequest()
                }
            }
            steps {
                sh 'npx echain-qa security --verbose --json --output security-report.json'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'security-report.json', fingerprint: true
                }
            }
        }
    }

    post {
        always {
            sh 'npx echain-qa report --html --output qa-report.html'
            publishHTML target: [
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: '.',
                reportFiles: 'qa-report.html',
                reportName: 'QA Report'
            ]
        }
        failure {
            script {
                // Send notification on failure
                echo 'QA checks failed!'
            }
        }
    }
}
```

### Scripted Pipeline

```groovy
// Jenkinsfile (scripted)
node {
    try {
        stage('Checkout') {
            checkout scm
        }

        stage('Setup') {
            docker.image('node:18').inside {
                sh 'npm ci'
            }
        }

        stage('QA') {
            docker.image('node:18').inside {
                sh 'npx echain-qa run --json --output qa-report.json'
            }
        }

        stage('Archive') {
            archiveArtifacts artifacts: 'qa-report.json', fingerprint: true
        }

    } catch (Exception e) {
        currentBuild.result = 'FAILURE'
        throw e
    } finally {
        // Cleanup and notifications
        sh 'npx echain-qa cleanup || true'
    }
}
```

## 🛡️ Branch Protection

### GitHub Branch Protection

```yaml
# .github/settings.yml (requires GitHub Pro)
repository:
  name: my-blockchain-project
  description: DeFi protocol with comprehensive QA

branches:
  - name: main
    protection:
      required_status_checks:
        required_checks:
          - qa-fast
          - qa-full
          - test
          - security
        strict: true  # Require branches to be up to date
      required_pull_request_reviews:
        required_approving_review_count: 2
        dismiss_stale_reviews: true
        require_code_owner_reviews: true
      restrictions:
        enforce_admins: true
        allow_force_pushes: false
        allow_deletions: false
```

### GitLab Protected Branches

```yaml
# .gitlab-ci.yml (branch protection via rules)
workflow:
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: always
    - if: $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "main"
      when: always
    - when: never

# Protected branch settings in GitLab UI:
# - Settings > Repository > Protected branches
# - Branch: main
# - Allowed to merge: Developers + Maintainers
# - Allowed to push: No one (except maintainers for hotfixes)
# - Require approval: 2 approvals
# - Require status checks: qa-full, security
```

## 🔧 Automated Fixes

### Auto-fix Configuration

```json
{
  "autoFix": {
    "enabled": true,
    "aggressive": false,
    "backup": true,
    "rules": {
      "eslint": {
        "fix": true,
        "fixTypes": ["layout", "problem"]
      },
      "prettier": {
        "write": true,
        "config": ".prettierrc"
      },
      "solidity": {
        "optimize": true,
        "viaIR": false
      }
    }
  }
}
```

### Pre-commit Auto-fix

```bash
# .qa/hooks/pre-commit
#!/bin/bash

echo "🔧 Running auto-fix..."

# Run QA with auto-fix
npx echain-qa run --auto-fix --staged-only --quiet

# Check if there are staged changes
if git diff --cached --quiet; then
  echo "✅ No fixes needed"
else
  echo "🔄 Auto-fixed issues, staging changes..."
  git add .
  echo "✅ Fixes applied and staged"
fi
```

### CI Auto-fix PRs

```yaml
# .github/workflows/auto-fix.yml
name: Auto Fix
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  auto-fix:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run auto-fix
        run: npx echain-qa run --auto-fix --verbose
      - name: Check for changes
        id: changes
        run: |
          if git diff --quiet; then
            echo "no_changes=true" >> $GITHUB_OUTPUT
          else
            echo "no_changes=false" >> $GITHUB_OUTPUT
          fi
      - name: Commit fixes
        if: steps.changes.outputs.no_changes == 'false'
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .
          git commit -m "🔧 Auto-fix: Apply code quality fixes"
          git push
```

## 🎯 Git-aware Features

### Incremental Checks

```bash
# Check only changed files
echain-qa run --incremental

# Check files changed since last commit
echain-qa run --since HEAD~1

# Check files changed in branch
echain-qa run --branch origin/main
```

### Git Integration Configuration

```json
{
  "git": {
    "aware": true,
    "incremental": {
      "enabled": true,
      "fallback": "full"
    },
    "hooks": {
      "autoInstall": true,
      "backupExisting": true
    },
    "ignore": {
      "patterns": [".git/**", "node_modules/**"],
      "files": [".gitignore", ".gitattributes"]
    }
  }
}
```

### Git Status Integration

```bash
# Show QA status with git status
git status
# On branch main
# Your branch is up to date with 'origin/main'.
#
# QA Status: ✅ All checks passed (2.3s ago)
# Last QA: 2025-10-10 14:30:00
#
# Changes to be committed:
#   modified:   src/contracts/Token.sol

# Show QA history
git log --oneline --grep="QA:"
# a1b2c3d 🔧 QA: Fix linting issues
# e4f5g6h ✅ QA: All checks passed
# i7j8k9l ❌ QA: Security vulnerabilities found
```

## 📊 Monitoring & Reporting

### QA Metrics in Git

```bash
# Show QA trends
echain-qa metrics --git --period 30d

# QA Statistics:
# Period: Last 30 days
# Total Commits: 47
# QA Pass Rate: 89%
# Average Duration: 12.3s
# Most Failed Check: Security (3 times)
```

### Integration with Git Tools

```bash
# Git aliases for QA
git config --global alias.qa '!npx echain-qa run'
git config --global alias.qa-quick '!npx echain-qa run --dry-run --quiet'

# Usage
git qa          # Full QA check
git qa-quick    # Fast feedback
```

## 🔧 Troubleshooting

### Hook Issues

```bash
# Check hook status
echain-qa check-hooks

# Reinstall hooks
echain-qa setup-hooks --force

# Debug hook execution
GIT_TRACE=1 git commit -m "test"
```

### CI/CD Issues

```bash
# Test CI configuration locally
echain-qa run --ci-mode

# Debug CI failures
echain-qa run --verbose --debug

# Check CI environment
echain-qa doctor --ci
```

### Performance Issues

```bash
# Profile hook execution
echain-qa run --profile --hooks-only

# Optimize for CI
echain-qa run --ci-optimized

# Cache troubleshooting
echain-qa cache --clear
echain-qa cache --status
```

## 📚 Next Steps

- **[Project Types](./project-types.md)**: Framework-specific configurations
- **[Configuration Reference](../configuration/)**: Complete setup options
- **[CI/CD Examples](../examples/cicd/)**: More pipeline examples
- **[Troubleshooting](../troubleshooting/)**: Common issues and solutions

Need help? Check the [FAQ](../faq.md) or create an [issue](https://github.com/polymathuniversata/echain-qa-agent/issues).</content>
<parameter name="filePath">e:\Polymath Universata\EchainQaAgent\docs\user-guide\git-integration.md