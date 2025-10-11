import path from 'path';
import fse from 'fs-extra';
import cliProgress from 'cli-progress';

export interface BuildResults {
  errors: number;
  warnings: number;
  duration: number;
  timestamp: Date;
}

export class BuildVerifier {
  private projectRoot: string;
  private commandExecutor: any; // Reference to CommandExecutor

  constructor(projectRoot: string, commandExecutor: any) {
    this.projectRoot = projectRoot;
    this.commandExecutor = commandExecutor;
  }

  async runBuildChecks(): Promise<BuildResults> {
    const startTime = Date.now();
    let totalErrors = 0;
    let totalWarnings = 0;

    console.log('INFO: Starting build verification...');

    // Create progress bar for build phases
    const buildProgress = new cliProgress.SingleBar({
      format: '🔨 Building project | {bar} | {percentage}% | {value}/{total} phases',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    });

    let totalPhases = 0;
    let currentPhase = 0;

    // Count build phases
    const frontendPath = path.join(this.projectRoot, 'frontend');
    if (await fse.pathExists(frontendPath)) {totalPhases++;}

    const blockchainPath = path.join(this.projectRoot, 'blockchain');
    if (await fse.pathExists(blockchainPath)) {totalPhases++;}

    buildProgress.start(totalPhases, 0);

    // Frontend build
    if (await fse.pathExists(frontendPath)) {
      const success = await this.commandExecutor.runCommand(
        'cd frontend && npm run build',
        'Frontend production build',
        600000 // 10 minutes
      );
      if (!success) {
        totalErrors++;
      }
      currentPhase++;
      buildProgress.update(currentPhase);
    }

    // Blockchain compilation - detect framework
    if (await fse.pathExists(blockchainPath)) {
      const framework = await this.detectBlockchainFramework(blockchainPath);

      switch (framework) {
        case 'hardhat': {
          const hardhatSuccess = await this.commandExecutor.runCommand(
            'cd blockchain && npx hardhat compile',
            'Smart contract compilation (Hardhat)',
            180000 // 3 minutes
          );
          if (!hardhatSuccess) {
            totalErrors++;
          }
          break;
        }

        case 'foundry': {
          const foundrySuccess = await this.commandExecutor.runCommand(
            'cd blockchain && forge build',
            'Smart contract compilation (Foundry)',
            180000 // 3 minutes
          );
          if (!foundrySuccess) {
            totalErrors++;
          }
          break;
        }

        case 'truffle': {
          const truffleSuccess = await this.commandExecutor.runCommand(
            'cd blockchain && npx truffle compile',
            'Smart contract compilation (Truffle)',
            180000 // 3 minutes
          );
          if (!truffleSuccess) {
            totalErrors++;
          }
          break;
        }

        default:
          console.log(
            'WARNING: No supported blockchain framework detected. Supported: Hardhat, Foundry, Truffle'
          );
          totalWarnings++;
      }
      currentPhase++;
      buildProgress.update(currentPhase);
    }

    buildProgress.stop();
    console.log('SUCCESS: All build phases completed');

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
}
