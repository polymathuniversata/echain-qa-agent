import path from 'path';
import fse from 'fs-extra';
import cliProgress from 'cli-progress';

export interface TestResults {
  errors: number;
  warnings: number;
  duration: number;
  timestamp: Date;
}

export class TestRunner {
  private projectRoot: string;
  private commandExecutor: any; // Reference to CommandExecutor

  constructor(projectRoot: string, commandExecutor: any) {
    this.projectRoot = projectRoot;
    this.commandExecutor = commandExecutor;
  }

  async runTests(): Promise<TestResults> {
    const startTime = Date.now();
    let totalErrors = 0;
    let totalWarnings = 0;

    console.log('INFO: Starting test execution...');

    // Create progress bar for test phases
    const testProgress = new cliProgress.SingleBar({
      format: '🧪 Running tests | {bar} | {percentage}% | {value}/{total} phases',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    });

    let totalPhases = 0;
    let currentPhase = 0;

    // Count test phases
    const blockchainPath = path.join(this.projectRoot, 'blockchain');
    if (await fse.pathExists(blockchainPath)) {totalPhases++;}

    const frontendPath = path.join(this.projectRoot, 'frontend');
    if (await fse.pathExists(frontendPath)) {
      const packageJson = await fse.readFile(path.join(frontendPath, 'package.json'), 'utf-8');
      if (packageJson.includes('"test"')) {totalPhases++;}
    }

    const testScript = path.join(this.projectRoot, 'scripts', 'run_all_tests.sh');
    if (await fse.pathExists(testScript)) {totalPhases++;}

    testProgress.start(totalPhases, 0);

    // Blockchain tests - detect framework
    if (await fse.pathExists(blockchainPath)) {
      const framework = await this.detectBlockchainFramework(blockchainPath);

      switch (framework) {
        case 'hardhat': {
          const hardhatTestSuccess = await this.commandExecutor.runCommand(
            'cd blockchain && npm test',
            'Blockchain unit tests (Hardhat)',
            600000 // 10 minutes
          );
          if (!hardhatTestSuccess) {
            totalErrors++;
          }
          break;
        }

        case 'foundry': {
          const foundryTestSuccess = await this.commandExecutor.runCommand(
            'cd blockchain && forge test',
            'Blockchain unit tests (Foundry)',
            600000 // 10 minutes
          );
          if (!foundryTestSuccess) {
            totalErrors++;
          }
          break;
        }

        case 'truffle': {
          const truffleTestSuccess = await this.commandExecutor.runCommand(
            'cd blockchain && npx truffle test',
            'Blockchain unit tests (Truffle)',
            600000 // 10 minutes
          );
          if (!truffleTestSuccess) {
            totalErrors++;
          }
          break;
        }

        default:
          console.log('WARNING: No supported blockchain framework detected for testing');
          totalWarnings++;
      }
      currentPhase++;
      testProgress.update(currentPhase);
    }

    // Frontend tests
    if (await fse.pathExists(frontendPath)) {
      const packageJson = await fse.readFile(path.join(frontendPath, 'package.json'), 'utf-8');
      if (packageJson.includes('"test"')) {
        const success = await this.commandExecutor.runCommand(
          'cd frontend && npm test -- --watchAll=false --passWithNoTests',
          'Frontend tests',
          300000 // 5 minutes
        );
        if (!success) {
          totalErrors++;
        }
        currentPhase++;
        testProgress.update(currentPhase);
      }
    }

    // Integration tests
    if (await fse.pathExists(testScript)) {
      const success = await this.commandExecutor.runCommand(
        'bash scripts/run_all_tests.sh',
        'Integration tests',
        900000 // 15 minutes
      );
      if (!success) {
        totalErrors++;
      }
      currentPhase++;
      testProgress.update(currentPhase);
    }

    testProgress.stop();
    console.log('SUCCESS: All test phases completed');

    const duration = (Date.now() - startTime) / 1000;
    return {
      errors: totalErrors,
      warnings: totalWarnings,
      duration,
      timestamp: new Date(),
    };
  }

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

  async enforceTestCoverageRequirement(config: any): Promise<number> {
    const configuredPath = config?.paths?.coverageSummary;
    const resolvedPath = configuredPath
      ? path.isAbsolute(configuredPath)
        ? configuredPath
        : path.join(this.projectRoot, configuredPath)
      : path.join(this.projectRoot, 'coverage', 'coverage-summary.json');

    if (!(await fse.pathExists(resolvedPath))) {
      throw new Error('Coverage summary not found');
    }

    let coverageRaw: string;
    try {
      coverageRaw = await fse.readFile(resolvedPath, 'utf-8');
    } catch (error) {
      throw new Error(`Unable to read coverage summary: ${error}`);
    }

    let coverageSummary: any;
    try {
      coverageSummary = JSON.parse(coverageRaw);
    } catch (error) {
      console.log(`WARNING: Failed to parse coverage summary: ${error}`);
      throw new Error('Coverage summary is not valid JSON');
    }

    const total = coverageSummary?.total;
    if (!total) {
      throw new Error('Coverage summary missing total metrics');
    }

    const metrics = ['lines', 'statements', 'branches', 'functions'] as const;
    const coverageValues = metrics
      .map(metric => total[metric]?.pct)
      .filter((value): value is number => typeof value === 'number');

    if (coverageValues.length === 0) {
      throw new Error('Coverage summary missing metric percentages');
    }

    const minimumCoverage = Math.min(...coverageValues);
    const requiredCoverage = config?.qualityGates?.minTestCoverage ?? 0;

    if (minimumCoverage < requiredCoverage) {
      throw new Error(
        `Coverage ${minimumCoverage.toFixed(2)}% is below required ${requiredCoverage}% threshold.`
      );
    }

    return minimumCoverage;
  }
}
