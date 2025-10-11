import path from 'path';
import fse from 'fs-extra';

/**
 * Results from code quality checks (linting, formatting, type checking)
 */
export interface CodeQualityResults {
  /** Number of errors found */
  errors: number;
  /** Number of warnings found */
  warnings: number;
  /** Duration of the checks in seconds */
  duration: number;
  /** Timestamp when checks completed */
  timestamp: Date;
}

/**
 * CodeQualityChecker handles linting, formatting, and type checking for
 * frontend and blockchain projects across different frameworks.
 */
export class CodeQualityChecker {
  private projectRoot: string;
  private commandExecutor: any; // Reference to CommandExecutor

  /**
   * Creates a new CodeQualityChecker instance
   * @param projectRoot Root directory of the project
   * @param commandExecutor CommandExecutor instance for running checks
   */
  constructor(projectRoot: string, commandExecutor: any) {
    this.projectRoot = projectRoot;
    this.commandExecutor = commandExecutor;
  }

  /**
   * Runs comprehensive code quality checks including linting, formatting, and type checking
   * @param autoFix Whether to automatically fix linting issues when possible
   * @param config QA configuration object
   * @returns Promise resolving to code quality results
   */
  async runLinting(autoFix = false, config?: any): Promise<CodeQualityResults> {
    const startTime = Date.now();
    let totalErrors = 0;
    let totalWarnings = 0;

    console.log('INFO: Starting code quality checks...');

    // Frontend linting
    const frontendPath = path.join(this.projectRoot, 'frontend');
    if (await fse.pathExists(frontendPath)) {
      const success = await this.commandExecutor.runCommand(
        `cd frontend && npm run lint${autoFix ? ' -- --fix' : ''}`,
        'Frontend ESLint'
      );
      if (!success) {
        if (config?.qualityGates?.failOnLintErrors !== false) {
          totalErrors++;
        } else {
          console.log('WARNING: Frontend linting failed but continuing due to configuration');
          totalWarnings++;
        }
      }

      const tsSuccess = await this.commandExecutor.runCommand(
        'cd frontend && npm run type-check',
        'Frontend TypeScript check'
      );
      if (!tsSuccess) {
        if (config?.qualityGates?.failOnLintErrors !== false) {
          totalErrors++;
        } else {
          console.log('WARNING: TypeScript compilation failed but continuing due to configuration');
          totalWarnings++;
        }
      }
    }

    // Blockchain linting - detect framework
    const blockchainPath = path.join(this.projectRoot, 'blockchain');
    if (await fse.pathExists(blockchainPath)) {
      const framework = await this.detectBlockchainFramework(blockchainPath);

      switch (framework) {
        case 'hardhat': {
          const hardhatLintSuccess = await this.commandExecutor.runCommand(
            'cd blockchain && npm run fix:eslint',
            'Blockchain ESLint (Hardhat)'
          );
          if (!hardhatLintSuccess) {
            if (config?.qualityGates?.failOnLintErrors !== false) {
              totalErrors++;
            } else {
              console.log('WARNING: Blockchain ESLint failed but continuing due to configuration');
              totalWarnings++;
            }
          }

          // Solidity checks for Hardhat
          await this.commandExecutor.runCommand(
            'cd blockchain && npm run fix:prettier',
            'Solidity formatting (Hardhat)'
          );

          const hardhatSolHintSuccess = await this.commandExecutor.runCommand(
            "cd blockchain && npx solhint --fix --noPrompt 'contracts/**/*.sol'",
            'Solidity linting (Hardhat)'
          );
          if (!hardhatSolHintSuccess) {
            console.log('WARNING: Solidity linting completed with warnings (non-blocking)');
            totalWarnings++;
          }
          break;
        }

        case 'foundry': {
          // Foundry uses different linting tools
          const foundryFormatSuccess = await this.commandExecutor.runCommand(
            'cd blockchain && forge fmt --check',
            'Solidity formatting (Foundry)'
          );
          if (!foundryFormatSuccess) {
            console.log('WARNING: Solidity formatting issues found (non-blocking)');
            totalWarnings++;
          }

          // Foundry doesn't have built-in linting, but we can check for common issues
          console.log('INFO: Foundry detected - using forge fmt for code formatting');
          break;
        }

        case 'truffle': {
          const truffleLintSuccess = await this.commandExecutor.runCommand(
            'cd blockchain && npm run lint',
            'Blockchain ESLint (Truffle)'
          );
          if (!truffleLintSuccess) {
            if (config?.qualityGates?.failOnLintErrors !== false) {
              totalErrors++;
            } else {
              console.log('WARNING: Blockchain ESLint failed but continuing due to configuration');
              totalWarnings++;
            }
          }

          // Solidity checks for Truffle
          const truffleSolHintSuccess = await this.commandExecutor.runCommand(
            "cd blockchain && npx solhint --fix --noPrompt 'contracts/**/*.sol'",
            'Solidity linting (Truffle)'
          );
          if (!truffleSolHintSuccess) {
            console.log('WARNING: Solidity linting completed with warnings (non-blocking)');
            totalWarnings++;
          }
          break;
        }

        default:
          console.log(
            'WARNING: No supported blockchain framework detected for linting. Supported: Hardhat, Foundry, Truffle'
          );
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log('SUCCESS: Code quality checks completed');

    return {
      errors: totalErrors,
      warnings: totalWarnings,
      duration,
      timestamp: new Date(),
    };
  }

  /**
   * Detects which blockchain framework is being used in the project
   * @param blockchainPath Path to the blockchain directory
   * @returns Detected framework or null if none found
   * @private
   */
  private async detectBlockchainFramework(
    blockchainPath: string
  ): Promise<'hardhat' | 'foundry' | 'truffle' | null> {
    // Check for Hardhat
    if (
      (await fse.pathExists(path.join(blockchainPath, 'hardhat.config.js'))) ||
      (await fse.pathExists(path.join(blockchainPath, 'hardhat.config.ts')))
    ) {
      return 'hardhat';
    }

    // Check for Foundry
    if (await fse.pathExists(path.join(blockchainPath, 'foundry.toml'))) {
      return 'foundry';
    }

    // Check for Truffle
    if (
      (await fse.pathExists(path.join(blockchainPath, 'truffle-config.js'))) ||
      (await fse.pathExists(path.join(blockchainPath, 'truffle.js')))
    ) {
      return 'truffle';
    }

    return null;
  }
}
