# echain-qa-agent

A comprehensive QA automation tool designed specifically for blockchain and Web3 projects. This package provides automated code quality checks, testing, security scanning, and documentation updates to ensure your project maintains high standards.

## Features

- 🧹 **Code Quality**: Automated linting and formatting for TypeScript, JavaScript, and Solidity
- 🧪 **Testing**: Runs unit tests, integration tests, and blockchain-specific tests
- 🔒 **Security**: Dependency auditing and secret detection
- 🏗️ **Build Verification**: Ensures production builds work correctly
- 📚 **Documentation**: Automatic documentation updates and QA logging
- ⚡ **Fast**: Built with TypeScript for optimal performance

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

## Usage

### Command Line Interface

After global installation, use the `echain-qa` command:

```bash
# Run full QA suite
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
```

### Programmatic Usage

```typescript
```typescript
import { QAAgent } from 'echain-qa-agent';
```

const qaAgent = new QAAgent({
  verbose: true,
  projectRoot: '/path/to/your/project'
});

// Run full QA suite
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
└── qa-report.json    # Generated QA reports
```

## Configuration

Create a `.qa-config.json` file in your project root to customize behavior:

```json
{
  "version": "2.0.0",
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
  "paths": {
    "frontend": "frontend",
    "blockchain": "blockchain",
    "docs": "docs",
    "tests": "test"
  }
}
```

## QA Checks Performed

### Code Quality
- ESLint for TypeScript/JavaScript
- TypeScript compilation checks
- Solidity linting with Solhint
- Code formatting verification

### Testing
- Unit tests for blockchain contracts
- Frontend component tests
- Integration tests
- End-to-end tests (if configured)

### Security
- NPM audit for dependency vulnerabilities
- Secret detection in source code
- Exposed API keys and private keys scanning

### Build Verification
- Frontend production build
- Smart contract compilation
- Bundle size checks

## Output

The QA agent generates:

1. **Console Output**: Real-time progress and results
2. **QA Log**: `docs/qalog.md` with detailed session logs
3. **JSON Report**: `qa-report.json` with structured results

## Exit Codes

- `0`: All checks passed
- `1`: Critical errors found
- `2`: Configuration or setup issues

## Requirements

- Node.js >= 18.0.0
- NPM or Bun package manager
- For blockchain projects: Hardhat or similar tooling
- For frontend projects: Next.js, React, or similar

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
- 🐛 Issues: [GitHub Issues](https://github.com/Emertechs-Labs/echain-qa-agent/issues)
- 📖 Docs: [Full Documentation](https://docs.echain.dev/qa-agent)