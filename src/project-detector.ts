import path from 'path';
import fse from 'fs-extra';

export interface ProjectDetection {
  projectType: string;
  frameworks: string[];
  languages: string[];
  confidence: number;
  hasTests: boolean;
  hasBuild: boolean;
}

export class ProjectDetector {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async detectProjectType(): Promise<ProjectDetection> {
    const detection: ProjectDetection = {
      projectType: 'unknown',
      frameworks: [],
      languages: [],
      confidence: 0,
      hasTests: false,
      hasBuild: false,
    };

    // Check for package.json
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (await fse.pathExists(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(await fse.readFile(packageJsonPath, 'utf-8'));
        detection.languages.push('javascript');

        // Check for TypeScript
        if (await fse.pathExists(path.join(this.projectRoot, 'tsconfig.json'))) {
          detection.languages.push('typescript');
        }

        // Detect frameworks from dependencies
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

        // Blockchain frameworks
        if (deps['hardhat']) {
          detection.frameworks.push('hardhat');
          detection.projectType = 'blockchain';
          detection.confidence = 90;
        } else if (deps['@nomiclabs/hardhat-ethers']) {
          detection.frameworks.push('hardhat');
          detection.projectType = 'blockchain';
          detection.confidence = 85;
        } else if (deps['truffle']) {
          detection.frameworks.push('truffle');
          detection.projectType = 'blockchain';
          detection.confidence = 90;
        }

        // Frontend frameworks
        if (deps['react']) {
          detection.frameworks.push('react');
          detection.projectType = detection.projectType === 'blockchain' ? 'fullstack' : 'frontend';
          detection.confidence = Math.max(detection.confidence, 85);
        }
        if (deps['next']) {
          detection.frameworks.push('next.js');
          detection.projectType = detection.projectType === 'blockchain' ? 'fullstack' : 'frontend';
          detection.confidence = Math.max(detection.confidence, 90);
        }
        if (deps['vue']) {
          detection.frameworks.push('vue');
          detection.projectType = detection.projectType === 'blockchain' ? 'fullstack' : 'frontend';
          detection.confidence = Math.max(detection.confidence, 85);
        }
        if (deps['@angular/core']) {
          detection.frameworks.push('angular');
          detection.projectType = detection.projectType === 'blockchain' ? 'fullstack' : 'frontend';
          detection.confidence = Math.max(detection.confidence, 85);
        }

        // Check for tests
        detection.hasTests = !!(
          deps['jest'] ||
          deps['mocha'] ||
          deps['vitest'] ||
          packageJson.scripts?.test
        );

        // Check for build scripts
        detection.hasBuild = !!packageJson.scripts?.build;
      } catch (error) {
        console.log(`WARNING: Failed to parse package.json: ${error}`);
        // Ignore parse errors
      }
    }

    // Check for blockchain-specific files
    const blockchainPath = path.join(this.projectRoot, 'blockchain');
    if (await fse.pathExists(blockchainPath)) {
      detection.projectType = detection.projectType === 'frontend' ? 'fullstack' : 'blockchain';
      detection.confidence = Math.max(detection.confidence, 80);
    }

    // Check for frontend directory
    const frontendPath = path.join(this.projectRoot, 'frontend');
    if (await fse.pathExists(frontendPath)) {
      detection.projectType = detection.projectType === 'blockchain' ? 'fullstack' : 'frontend';
      detection.confidence = Math.max(detection.confidence, 80);
    }

    // Default fallback
    if (detection.projectType === 'unknown') {
      detection.projectType = 'library';
      detection.confidence = 50;
    }

    return detection;
  }

  async collectTestFiles(): Promise<string[]> {
    const filesSet = new Set<string>();

    // Common test file patterns
    const patterns = [
      '**/*.test.{js,jsx,ts,tsx,cjs,mjs}',
      '**/*.spec.{js,jsx,ts,tsx,cjs,mjs}',
      '**/__tests__/**/*.{js,jsx,ts,tsx,cjs,mjs}',
      '**/test/**/*.{js,jsx,ts,tsx,cjs,mjs}',
    ];

    const globOptions = {
      cwd: this.projectRoot,
      absolute: false,
      nodir: true,
    } as const;

    try {
      for (const pattern of patterns) {
        const files = (await import('glob')).globSync(pattern, globOptions as any);
        files.forEach((file: string) => filesSet.add(file));
      }
    } catch (error) {
      console.log(`WARNING: Failed to collect test files: ${error}`);
      // Ignore glob errors
    }

    return Array.from(filesSet);
  }
}
