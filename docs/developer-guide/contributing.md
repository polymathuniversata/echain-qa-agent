# 🤝 Contributing Guide

Welcome to echain-qa-agent! This guide explains how to contribute to the project, including development setup, coding standards, testing, and the contribution process.

## 📋 Table of Contents

- [Getting Started](#-getting-started)
- [Development Setup](#-development-setup)
- [Project Structure](#-project-structure)
- [Coding Standards](#-coding-standards)
- [Testing](#-testing)
- [Submitting Changes](#-submitting-changes)
- [Review Process](#-review-process)
- [Community Guidelines](#-community-guidelines)
- [Resources](#-resources)

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18.0.0 or higher**
- **TypeScript 5.0+**
- **Git**
- **A code editor** (VS Code recommended)

### Quick Setup

```bash
# Fork and clone the repository
git clone https://github.com/your-username/echain-qa-agent.git
cd echain-qa-agent

# Install dependencies
npm install

# Run setup script
npm run setup

# Build the project
npm run build

# Run tests
npm test
```

### Development Workflow

1. **Choose an issue** from our [GitHub Issues](https://github.com/echain-qa/echain-qa-agent/issues)
2. **Create a branch** for your work
3. **Make changes** following our coding standards
4. **Write tests** for new functionality
5. **Run the test suite** to ensure everything works
6. **Submit a pull request**

## 🛠️ Development Setup

### Environment Setup

```bash
# Install Node.js (using nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install global dependencies
npm install -g typescript eslint prettier jest

# Clone and setup
git clone https://github.com/echain-qa/echain-qa-agent.git
cd echain-qa-agent
npm install
```

### Development Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run build:watch  # Build with file watching

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report

# Quality
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript type checking

# Documentation
npm run docs         # Generate API documentation
npm run docs:serve   # Serve documentation locally

# Utilities
npm run clean        # Clean build artifacts
npm run setup        # Initial project setup
```

### IDE Setup

For VS Code, install these recommended extensions:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-jest",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-markdownlint"
  ]
}
```

## 🏗️ Project Structure

```
echain-qa-agent/
├── src/                          # Source code
│   ├── api-server.ts            # HTTP API server
│   ├── cli.ts                   # Command-line interface
│   ├── qa-agent.ts              # Main QA orchestration
│   ├── plugin-manager.ts        # Plugin system
│   ├── configuration-manager.ts # Configuration handling
│   ├── cache-manager.ts         # Caching system
│   ├── command-executor.ts      # External command execution
│   ├── project-detector.ts      # Project type detection
│   ├── code-quality-checker.ts  # Code quality checks
│   ├── security-scanner.ts      # Security analysis
│   ├── test-runner.ts           # Test execution
│   ├── report-generator.ts      # Report generation
│   ├── logger.ts                # Logging system
│   ├── secure-plugin-loader.ts  # Plugin security
│   ├── build-verifier.ts        # Build verification
│   └── index.ts                 # Main entry point
├── test/                        # Test files
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── e2e/                     # End-to-end tests
├── docs/                        # Documentation
├── scripts/                     # Build and utility scripts
├── examples/                    # Example configurations
├── coverage/                    # Test coverage reports
├── package.json
├── tsconfig.json
├── jest.config.cjs
└── README.md
```

### Key Directories

- **`src/`**: Core application code
- **`test/`**: All test files (unit, integration, e2e)
- **`docs/`**: Documentation and guides
- **`examples/`**: Usage examples and templates
- **`scripts/`**: Build, deployment, and utility scripts

## 📝 Coding Standards

### TypeScript Guidelines

```typescript
// ✅ Good: Use explicit types
interface User {
  id: number;
  name: string;
  email: string;
}

class UserService {
  constructor(private readonly db: Database) {}

  async getUser(id: number): Promise<User | null> {
    return this.db.users.find(id);
  }
}

// ❌ Bad: Avoid any, use proper types
function process(data: any): any {
  return data;
}
```

### Naming Conventions

```typescript
// Classes: PascalCase
class ConfigurationManager { }

// Interfaces: PascalCase with I prefix optional
interface QAConfig { }
interface IPlugin { }

// Functions/Methods: camelCase
function loadConfiguration() { }
class ConfigManager {
  getConfigValue() { }
}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 5000;

// Private members: camelCase with underscore prefix
class Service {
  private _config: Config;
}
```

### File Organization

```typescript
// One class/interface per file (preferred)
export class QAAgent { }

// Multiple related items in one file (acceptable)
export interface QAConfig { }
export interface CheckResult { }
export type CheckStatus = 'passed' | 'failed' | 'warning';
```

### Error Handling

```typescript
// ✅ Good: Specific error types with context
class ValidationError extends Error {
  constructor(field: string, value: any) {
    super(`Invalid value for ${field}: ${value}`);
    this.name = 'ValidationError';
  }
}

function validateConfig(config: any): void {
  if (!config.name) {
    throw new ValidationError('name', config.name);
  }
}

// ❌ Bad: Generic errors without context
function validateConfig(config: any): void {
  if (!config.name) {
    throw new Error('Invalid config');
  }
}
```

### Async/Await Patterns

```typescript
// ✅ Good: Proper async/await usage
async function processFiles(files: string[]): Promise<Result[]> {
  const results: Result[] = [];

  for (const file of files) {
    try {
      const result = await processFile(file);
      results.push(result);
    } catch (error) {
      logger.error(`Failed to process ${file}:`, error);
      // Handle error appropriately
    }
  }

  return results;
}

// ✅ Good: Parallel processing when possible
async function processFilesParallel(files: string[]): Promise<Result[]> {
  const promises = files.map(file => processFile(file));
  return Promise.all(promises);
}
```

## 🧪 Testing

### Test Structure

```typescript
// Unit test example
import { QAAgent } from '../src/qa-agent';
import { ConfigManager } from '../src/configuration-manager';

describe('QAAgent', () => {
  let agent: QAAgent;
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
    agent = new QAAgent(configManager);
  });

  describe('run', () => {
    it('should execute all checks successfully', async () => {
      const config = { /* test config */ };
      const result = await agent.run(config);

      expect(result.status).toBe('passed');
      expect(result.checks).toHaveLength(3);
    });

    it('should handle check failures gracefully', async () => {
      // Test failure scenarios
    });
  });
});
```

### Testing Best Practices

1. **Test Isolation**: Each test should be independent
2. **Descriptive Names**: Use clear, descriptive test names
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Mock External Dependencies**: Use mocks for external services
5. **Test Edge Cases**: Cover error conditions and edge cases

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- test/unit/qa-agent.test.ts

# Run with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run integration tests only
npm run test:integration

# Run e2e tests only
npm run test:e2e
```

### Test Coverage Requirements

- **Statements**: ≥ 80%
- **Branches**: ≥ 75%
- **Functions**: ≥ 85%
- **Lines**: ≥ 80%

## 📤 Submitting Changes

### Commit Guidelines

We follow conventional commits:

```bash
# Feature commits
feat: add support for custom checkers
feat: implement plugin caching system

# Bug fixes
fix: resolve memory leak in plugin loader
fix: handle timeout errors in test runner

# Documentation
docs: update API reference for new methods
docs: add plugin development guide

# Refactoring
refactor: simplify configuration validation logic
refactor: extract common utilities to shared module

# Testing
test: add unit tests for configuration manager
test: add integration test for plugin system

# Breaking changes
feat!: change plugin API interface (breaking change)
```

### Pull Request Process

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-number-description
   ```

2. **Make Changes**
   - Follow coding standards
   - Write tests for new functionality
   - Update documentation if needed
   - Ensure all tests pass

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Then create PR on GitHub
   ```

### Pull Request Template

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change
- [ ] Documentation update
- [ ] Refactoring
- [ ] Test additions

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Commit messages follow conventional format
```

## 🔍 Review Process

### Code Review Guidelines

**Reviewers should check for:**

1. **Code Quality**
   - Follows coding standards
   - Proper error handling
   - Type safety
   - Performance considerations

2. **Testing**
   - Adequate test coverage
   - Tests follow best practices
   - Edge cases covered

3. **Documentation**
   - Code is well-documented
   - README/docs updated if needed
   - API changes documented

4. **Security**
   - No security vulnerabilities
   - Proper input validation
   - Safe handling of sensitive data

### Review Checklist

```markdown
## Code Review Checklist

### Functionality
- [ ] Code compiles without errors
- [ ] Logic is correct and handles edge cases
- [ ] No breaking changes without proper migration
- [ ] Performance impact considered

### Quality
- [ ] Code follows style guidelines
- [ ] Proper TypeScript types used
- [ ] Error handling is appropriate
- [ ] Code is well-documented

### Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added if needed
- [ ] Tests pass and provide good coverage
- [ ] No flaky tests introduced

### Security
- [ ] Input validation implemented
- [ ] No sensitive data exposure
- [ ] Dependencies are secure
- [ ] Sandboxing considered for plugins

### Documentation
- [ ] Code has appropriate comments
- [ ] API documentation updated
- [ ] README/examples updated if needed
- [ ] Breaking changes documented
```

## 🤝 Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- **Be Respectful**: Treat all contributors with respect
- **Be Constructive**: Provide helpful feedback
- **Be Inclusive**: Welcome contributors from all backgrounds
- **Be Patient**: Allow time for responses and reviews

### Communication

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Pull Request Comments**: For code review feedback
- **Discord/Slack**: For real-time communication (if available)

### Getting Help

If you need help:

1. Check the [documentation](../README.md)
2. Search existing [GitHub Issues](https://github.com/echain-qa/echain-qa-agent/issues)
3. Ask in [GitHub Discussions](https://github.com/echain-qa/echain-qa-agent/discussions)
4. Create a new issue if needed

## 📚 Resources

### Documentation

- **[User Guide](../user-guide/)**: How to use echain-qa-agent
- **[API Reference](./api.md)**: Complete API documentation
- **[Plugin Development](./plugins.md)**: Create custom plugins
- **[Architecture](./architecture.md)**: System design overview

### Development Tools

- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)**: TypeScript documentation
- **[Node.js Docs](https://nodejs.org/en/docs/)**: Node.js documentation
- **[Jest Docs](https://jestjs.io/docs/getting-started)**: Testing framework
- **[ESLint Docs](https://eslint.org/docs/user-guide/)**: Linting rules

### Related Projects

- **[Hardhat](https://hardhat.org/)**: Ethereum development environment
- **[Foundry](https://book.getfoundry.sh/)**: Portable and modular toolkit for Ethereum application development
- **[Truffle](https://trufflesuite.com/truffle/)**: Development environment for Ethereum
- **[OpenZeppelin](https://openzeppelin.com/)**: Secure smart contract library

### Learning Resources

- **[Solidity Documentation](https://docs.soliditylang.org/)**: Smart contract programming
- **[Ethereum Developer Resources](https://ethereum.org/en/developers/)**: Blockchain development
- **[JavaScript Info](https://javascript.info/)**: JavaScript/TypeScript learning
- **[Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)**: Node.js development best practices

## 🙏 Recognition

Contributors are recognized through:

- **GitHub Contributors**: Listed in repository contributors
- **Changelog**: Mentioned in release notes
- **Documentation**: Attribution in relevant docs
- **Community**: Recognition in community discussions

## 📞 Support

For contribution questions:

- **Documentation Issues**: Create an issue with the `documentation` label
- **Code Questions**: Ask in GitHub Discussions
- **Bug Reports**: Use the bug report template
- **Feature Requests**: Use the feature request template

Thank you for contributing to echain-qa-agent! 🚀</content>
<parameter name="filePath">e:\Polymath Universata\EchainQaAgent\docs\developer-guide\contributing.md