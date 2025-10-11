import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

export interface DiagnosticIssue {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'configuration' | 'dependencies' | 'code-quality' | 'testing' | 'security' | 'performance';
  autoFix: boolean;
  detected: boolean;
  details?: string;
  solution?: string;
  commands?: string[];
}

export interface DiagnosticResult {
  issues: DiagnosticIssue[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recommendations: string[];
}

export class DiagnosticTools {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Run comprehensive diagnostic analysis
   */
  async runFullDiagnostics(): Promise<DiagnosticResult> {
    console.log(chalk.blue('🔍 Running comprehensive diagnostics...'));

    const issues: DiagnosticIssue[] = [];

    // Configuration diagnostics
    issues.push(...await this.checkConfigurationIssues());

    // Dependency diagnostics
    issues.push(...await this.checkDependencyIssues());

    // Code quality diagnostics
    issues.push(...await this.checkCodeQualityIssues());

    // Testing diagnostics
    issues.push(...await this.checkTestingIssues());

    // Security diagnostics
    issues.push(...await this.checkSecurityIssues());

    // Performance diagnostics
    issues.push(...await this.checkPerformanceIssues());

    // Environment diagnostics
    issues.push(...await this.checkEnvironmentIssues());

    // Filter detected issues
    const detectedIssues = issues.filter(issue => issue.detected);

    // Generate summary
    const summary = {
      total: detectedIssues.length,
      critical: detectedIssues.filter(i => i.severity === 'critical').length,
      high: detectedIssues.filter(i => i.severity === 'high').length,
      medium: detectedIssues.filter(i => i.severity === 'medium').length,
      low: detectedIssues.filter(i => i.severity === 'low').length,
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(detectedIssues);

    return {
      issues: detectedIssues,
      summary,
      recommendations
    };
  }

  /**
   * Check configuration-related issues
   */
  private async checkConfigurationIssues(): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];

    // Check for package.json
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const hasPackageJson = await this.fileExists(packageJsonPath);

    issues.push({
      id: 'missing-package-json',
      title: 'Missing package.json',
      description: 'No package.json found in project root',
      severity: 'critical',
      category: 'configuration',
      autoFix: false,
      detected: !hasPackageJson,
      solution: 'Run "npm init" to create a package.json file',
      commands: ['npm init -y']
    });

    // Check for QA config
    const qaConfigPath = path.join(this.projectRoot, '.qa-config.json');
    const hasQaConfig = await this.fileExists(qaConfigPath);

    issues.push({
      id: 'missing-qa-config',
      title: 'Missing QA Configuration',
      description: 'No .qa-config.json found. QA agent may not be properly configured.',
      severity: 'high',
      category: 'configuration',
      autoFix: true,
      detected: !hasQaConfig,
      solution: 'Run "echain-qa setup" to create configuration',
      commands: ['echain-qa setup']
    });

    // Check for TypeScript config
    const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json');
    const hasTsConfig = await this.fileExists(tsconfigPath);

    issues.push({
      id: 'missing-tsconfig',
      title: 'Missing TypeScript Configuration',
      description: 'No tsconfig.json found. TypeScript compilation may fail.',
      severity: 'medium',
      category: 'configuration',
      autoFix: false,
      detected: !hasTsConfig,
      solution: 'Run "npx tsc --init" to create TypeScript configuration',
      commands: ['npx tsc --init']
    });

    // Check for ESLint config
    const eslintConfigs = ['.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', 'eslint.config.js'];
    const hasEslintConfig = await this.anyFileExists(eslintConfigs.map(f => path.join(this.projectRoot, f)));

    issues.push({
      id: 'missing-eslint-config',
      title: 'Missing ESLint Configuration',
      description: 'No ESLint configuration found. Code linting may not work.',
      severity: 'low',
      category: 'code-quality',
      autoFix: false,
      detected: !hasEslintConfig,
      solution: 'Run "npx eslint --init" to create ESLint configuration',
      commands: ['npx eslint --init']
    });

    // Check for git repository
    const gitDir = path.join(this.projectRoot, '.git');
    const hasGit = await this.fileExists(gitDir);

    issues.push({
      id: 'not-git-repo',
      title: 'Not a Git Repository',
      description: 'Project is not a git repository. Version control recommended.',
      severity: 'low',
      category: 'configuration',
      autoFix: false,
      detected: !hasGit,
      solution: 'Run "git init" to initialize git repository',
      commands: ['git init']
    });

    return issues;
  }

  /**
   * Check dependency-related issues
   */
  private async checkDependencyIssues(): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];

    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!(await this.fileExists(packageJsonPath))) {
      return issues; // Can't check dependencies without package.json
    }

    try {
      // Parse package.json to validate it's valid JSON
      JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      // Check for lock file
      const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
      const hasLockFile = await this.anyFileExists(lockFiles.map(f => path.join(this.projectRoot, f)));

      issues.push({
        id: 'missing-lock-file',
        title: 'Missing Lock File',
        description: 'No package lock file found. Dependencies may not be reproducible.',
        severity: 'medium',
        category: 'dependencies',
        autoFix: false,
        detected: !hasLockFile,
        solution: 'Run "npm install" to create package-lock.json',
        commands: ['npm install']
      });

      // Check for node_modules
      const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
      const hasNodeModules = await this.fileExists(nodeModulesPath);

      issues.push({
        id: 'missing-node-modules',
        title: 'Missing node_modules',
        description: 'node_modules directory not found. Dependencies not installed.',
        severity: 'high',
        category: 'dependencies',
        autoFix: false,
        detected: !hasNodeModules,
        solution: 'Run "npm install" to install dependencies',
        commands: ['npm install']
      });

      // Check for outdated dependencies (basic check)
      if (hasNodeModules) {
        try {
          const outdated = this.runCommand('npm outdated --json', { silent: true });
          const outdatedData = JSON.parse(outdated || '{}');
          const outdatedCount = Object.keys(outdatedData).length;

          issues.push({
            id: 'outdated-dependencies',
            title: 'Outdated Dependencies',
            description: `${outdatedCount} dependencies are outdated.`,
            severity: 'low',
            category: 'dependencies',
            autoFix: false,
            detected: outdatedCount > 0,
            details: `Found ${outdatedCount} outdated packages`,
            solution: 'Run "npm update" to update dependencies',
            commands: ['npm update']
          });
        } catch {
          // npm outdated failed, skip this check
        }
      }

    } catch {
      issues.push({
        id: 'invalid-package-json',
        title: 'Invalid package.json',
        description: 'package.json contains invalid JSON',
        severity: 'high',
        category: 'configuration',
        autoFix: false,
        detected: true,
        solution: 'Fix JSON syntax in package.json',
      });
    }

    return issues;
  }

  /**
   * Check code quality issues
   */
  private async checkCodeQualityIssues(): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];

    // Check for test files
    const testPatterns = [
      '**/*.test.{js,ts,jsx,tsx}',
      '**/*.spec.{js,ts,jsx,tsx}',
      '**/__tests__/**/*.{js,ts,jsx,tsx}',
      '**/test/**/*.{js,ts,jsx,tsx}'
    ];

    let testFileCount = 0;
    for (const pattern of testPatterns) {
      try {
        const files = await this.globFiles(pattern);
        testFileCount += files.length;
      } catch {
        // Ignore glob errors
      }
    }

    issues.push({
      id: 'no-test-files',
      title: 'No Test Files Found',
      description: 'No test files detected in the project.',
      severity: 'medium',
      category: 'testing',
      autoFix: false,
      detected: testFileCount === 0,
      solution: 'Add test files to improve code quality',
    });

    // Check for source files
    const srcPatterns = ['**/*.{js,ts,jsx,tsx}', '**/src/**/*.{js,ts,jsx,tsx}'];
    let srcFileCount = 0;
    for (const pattern of srcPatterns) {
      try {
        const files = await this.globFiles(pattern);
        srcFileCount += files.length;
      } catch {
        // Ignore glob errors
      }
    }

    // Check test coverage ratio
    if (srcFileCount > 0 && testFileCount > 0) {
      const coverageRatio = testFileCount / srcFileCount;
      const hasAdequateCoverage = coverageRatio >= 0.1; // At least 1 test per 10 source files

      issues.push({
        id: 'low-test-coverage',
        title: 'Low Test Coverage',
        description: `Test coverage ratio: ${(coverageRatio * 100).toFixed(1)}%`,
        severity: 'medium',
        category: 'testing',
        autoFix: false,
        detected: !hasAdequateCoverage,
        details: `${testFileCount} test files, ${srcFileCount} source files`,
        solution: 'Add more test files to improve coverage',
      });
    }

    return issues;
  }

  /**
   * Check testing-related issues
   */
  private async checkTestingIssues(): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];

    // Check for Jest configuration
    const jestConfigs = ['jest.config.js', 'jest.config.json', 'jest.config.ts'];
    const hasJestConfig = await this.anyFileExists(jestConfigs.map(f => path.join(this.projectRoot, f)));

    // Check package.json for Jest
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    let hasJestInPackage = false;

    if (await this.fileExists(packageJsonPath)) {
      try {
        const _packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        hasJestInPackage = !!(_packageJson.devDependencies?.jest || _packageJson.dependencies?.jest);
      } catch {
        // Ignore parse errors
      }
    }

    issues.push({
      id: 'missing-jest-config',
      title: 'Missing Jest Configuration',
      description: 'Jest is installed but no configuration file found.',
      severity: 'low',
      category: 'testing',
      autoFix: false,
      detected: hasJestInPackage && !hasJestConfig,
      solution: 'Run "npx jest --init" to create Jest configuration',
      commands: ['npx jest --init']
    });

    return issues;
  }

  /**
   * Check security-related issues
   */
  private async checkSecurityIssues(): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];

    // Check for .env files
    const envFiles = ['.env', '.env.local', '.env.production', '.env.development'];
    const foundEnvFiles = [];

    for (const envFile of envFiles) {
      if (await this.fileExists(path.join(this.projectRoot, envFile))) {
        foundEnvFiles.push(envFile);
      }
    }

    issues.push({
      id: 'env-files-found',
      title: 'Environment Files Detected',
      description: `Found environment files: ${foundEnvFiles.join(', ')}`,
      severity: 'low',
      category: 'security',
      autoFix: false,
      detected: foundEnvFiles.length > 0,
      details: 'Ensure .env files are in .gitignore',
      solution: 'Add environment files to .gitignore if not already present',
    });

    // Check .gitignore for sensitive files
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    if (await this.fileExists(gitignorePath)) {
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      const hasEnvInGitignore = gitignoreContent.includes('.env');

      issues.push({
        id: 'env-not-ignored',
        title: 'Environment Files Not Ignored',
        description: '.env files found but not in .gitignore',
        severity: 'high',
        category: 'security',
        autoFix: false,
        detected: foundEnvFiles.length > 0 && !hasEnvInGitignore,
        solution: 'Add .env files to .gitignore',
      });
    }

    return issues;
  }

  /**
   * Check performance-related issues
   */
  private async checkPerformanceIssues(): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];

    // Check package.json size (rough indicator of dependency bloat)
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (await this.fileExists(packageJsonPath)) {
      try {
        const stats = await fs.stat(packageJsonPath);
        const sizeKB = stats.size / 1024;

        issues.push({
          id: 'large-package-json',
          title: 'Large package.json',
          description: `package.json is ${sizeKB.toFixed(1)}KB, may indicate dependency bloat`,
          severity: 'low',
          category: 'performance',
          autoFix: false,
          detected: sizeKB > 50, // 50KB threshold
          details: `File size: ${sizeKB.toFixed(1)}KB`,
          solution: 'Review and remove unnecessary dependencies',
        });
      } catch {
        // Ignore stat errors
      }
    }

    return issues;
  }

  /**
   * Check environment-related issues
   */
  private async checkEnvironmentIssues(): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];

    // Check Node.js version
    try {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);

      issues.push({
        id: 'node-version',
        title: 'Node.js Version Check',
        description: `Running Node.js ${nodeVersion}`,
        severity: 'low',
        category: 'configuration',
        autoFix: false,
        detected: majorVersion < 18,
        details: `Current version: ${nodeVersion}, recommended: 18+`,
        solution: 'Upgrade to Node.js 18 or higher',
      });
    } catch {
      issues.push({
        id: 'node-version-unknown',
        title: 'Cannot Determine Node.js Version',
        description: 'Unable to determine Node.js version',
        severity: 'low',
        category: 'configuration',
        autoFix: false,
        detected: true,
      });
    }

    // Check for .nvmrc file
    const nvmrcPath = path.join(this.projectRoot, '.nvmrc');
    const hasNvmrc = await this.fileExists(nvmrcPath);

    issues.push({
      id: 'missing-nvmrc',
      title: 'Missing .nvmrc File',
      description: 'No .nvmrc file found for Node.js version management',
      severity: 'low',
      category: 'configuration',
      autoFix: false,
      detected: !hasNvmrc,
      solution: 'Create .nvmrc file with target Node.js version',
    });

    return issues;
  }

  /**
   * Generate recommendations based on detected issues
   */
  private generateRecommendations(issues: DiagnosticIssue[]): string[] {
    const recommendations: string[] = [];

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;

    if (criticalCount > 0) {
      recommendations.push(`🚨 Address ${criticalCount} critical issues immediately`);
    }

    if (highCount > 0) {
      recommendations.push(`⚠️  Fix ${highCount} high-priority issues soon`);
    }

    // Category-specific recommendations
    const categories = [...new Set(issues.map(i => i.category))];
    for (const category of categories) {
      const categoryIssues = issues.filter(i => i.category === category);
      if (categoryIssues.length > 0) {
        recommendations.push(`📋 Review ${categoryIssues.length} ${category} issue${categoryIssues.length === 1 ? '' : 's'}`);
      }
    }

    if (issues.some(i => i.autoFix)) {
      recommendations.push('🔧 Consider running automated fixes for eligible issues');
    }

    return recommendations;
  }

  /**
   * Utility method to check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Utility method to check if any of the files exist
   */
  private async anyFileExists(filePaths: string[]): Promise<boolean> {
    for (const filePath of filePaths) {
      if (await this.fileExists(filePath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Utility method to glob files (simplified implementation)
   */
  private async globFiles(pattern: string): Promise<string[]> {
    // This is a simplified glob implementation
    // In a real implementation, you'd use a proper glob library
    try {
      const { glob } = await import('glob');
      return glob(pattern, { cwd: this.projectRoot, absolute: false });
    } catch {
      return [];
    }
  }

  /**
   * Utility method to run commands safely
   */
  private runCommand(command: string, options: { silent?: boolean } = {}): string | null {
    try {
      const result = execSync(command, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        stdio: options.silent ? 'pipe' : 'inherit',
        timeout: 10000 // 10 second timeout
      });
      return result;
    } catch {
      return null;
    }
  }
}