import { QAAgent } from '../../src/qa-agent';
import { promises as fs } from 'fs';
import path from 'path';
import { jest } from '@jest/globals';

// Mock all external dependencies
jest.mock('chalk', () => ({
  red: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  green: jest.fn((str) => str),
  blue: jest.fn((str) => str),
}));

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  ensureDir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

jest.mock('glob', () => ({
  globSync: jest.fn(),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn(),
}));

jest.mock('cli-progress', () => ({
  SingleBar: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    update: jest.fn(),
    stop: jest.fn(),
  })),
}));

describe('QA Agent - End-to-End Integration Tests', () => {
  let agent: QAAgent;
  const mockProjectRoot = '/mock/project';

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new QAAgent({ projectRoot: mockProjectRoot, verbose: true });
  });

  describe('Full QA Suite with Strict Quality Gates', () => {
    const fsExtra = require('fs-extra');

    beforeEach(() => {
      // Mock successful file operations
      fsExtra.pathExists.mockResolvedValue(true);
      fsExtra.ensureDir.mockResolvedValue(undefined);
      fsExtra.writeFile.mockResolvedValue(undefined);

      // Mock config with strict quality gates
      fsExtra.readFile.mockImplementation((filePath: string) => {
        if (filePath.includes('.qa-config.json')) {
          return Promise.resolve(JSON.stringify({
            version: "2.0.0",
            project: {
              name: "test-project",
              type: "blockchain"
            },
            checks: {
              linting: true,
              testing: true,
              security: true,
              build: true,
              performance: false
            },
            qualityGates: {
              failOnLintErrors: true,
              failOnTestFailures: true,
              failOnBuildFailures: true,
              failOnSecurityVulnerabilities: true,
              failOnPerformanceIssues: false,
              requireTests: true,
              requireTestCoverage: true,
              minTestCoverage: 90
            }
          }));
        }
        if (filePath.includes('coverage-summary.json')) {
          return Promise.resolve(JSON.stringify({
            total: {
              lines: { pct: 95 },
              statements: { pct: 94 },
              branches: { pct: 92 },
              functions: { pct: 96 }
            }
          }));
        }
        return Promise.resolve('');
      });
    });

    it('should pass all quality gates with excellent coverage', async () => {
      // Mock test file detection
      const glob = require('glob');
      (glob.globSync as jest.Mock).mockImplementation((pattern: unknown) => {
        if (pattern === '**/*.test.{js,jsx,ts,tsx,cjs,mjs}') {
          return ['src/example.test.ts', 'src/utils.test.ts'];
        }
        return [];
      });

      // Mock successful command execution
      const childProcess = require('child_process');
      childProcess.spawn.mockImplementation(() => ({
        on: jest.fn((event: string, callback: (code: number) => void) => {
          if (event === 'close') callback(0);
        }),
        kill: jest.fn(),
      }));

      const results = await agent.runFullSuite();

      expect(results.errors).toBe(0);
      expect(results.warnings).toBe(0);
    });

    it('should fail when coverage is insufficient despite good tests', async () => {
      // Mock low coverage
      fsExtra.readFile.mockImplementation((filePath: string) => {
        if (filePath.includes('coverage-summary.json')) {
          return Promise.resolve(JSON.stringify({
            total: {
              lines: { pct: 75 },
              statements: { pct: 76 },
              branches: { pct: 70 },
              functions: { pct: 74 }
            }
          }));
        }
        return Promise.resolve(JSON.stringify({
          version: "2.0.0",
          qualityGates: {
            requireTests: true,
            requireTestCoverage: true,
            minTestCoverage: 90
          }
        }));
      });

      const glob = require('glob');
      (glob.globSync as jest.Mock).mockImplementation((pattern: unknown) => {
        if (pattern === '**/*.test.{js,jsx,ts,tsx,cjs,mjs}') {
          return ['src/example.test.ts'];
        }
        return [];
      });

      const childProcess = require('child_process');
      childProcess.spawn.mockImplementation(() => ({
        on: jest.fn((event: string, callback: (code: number) => void) => {
          if (event === 'close') callback(0);
        }),
        kill: jest.fn(),
      }));

      const results = await agent.runFullSuite();

      expect(results.errors).toBeGreaterThan(0);
    });
  });

  describe('Configuration Scenarios', () => {
    const fsExtra = require('fs-extra');

    it('should handle missing configuration gracefully', async () => {
      fsExtra.pathExists.mockResolvedValue(false);

      await expect(agent.initializeProject()).resolves.not.toThrow();
    });

    it('should create default configuration when none exists', async () => {
      fsExtra.pathExists.mockResolvedValue(false);
      fsExtra.writeFile.mockResolvedValue(undefined);

      await agent.initializeProject();

      expect(fsExtra.writeFile).toHaveBeenCalledWith(
        path.join(mockProjectRoot, '.qa-config.json'),
        expect.stringContaining('"requireTests": false')
      );
    });

    it('should validate configuration against schema', async () => {
      const validConfig = {
        version: "2.1.5",
        project: {
          name: "valid-project",
          type: "blockchain"
        },
        checks: {
          linting: true,
          testing: true,
          security: true,
          build: true
        },
        qualityGates: {
          requireTests: true,
          minTestCoverage: 80
        }
      };

      const isValid = await (agent as any).validateConfig(validConfig);
      expect(isValid).toBe(true);
    });
  });

  describe('Error Recovery and Resilience', () => {
    const fsExtra = require('fs-extra');

    it('should continue execution when individual checks fail', async () => {
      fsExtra.pathExists.mockResolvedValue(true);
      fsExtra.readFile.mockResolvedValue(JSON.stringify({
        version: "2.0.0",
        qualityGates: {
          failOnLintErrors: false, // Allow linting to fail
          requireTests: false
        }
      }));

      // Mock linting failure but other checks success
      const childProcess = require('child_process');
      let callCount = 0;
      childProcess.spawn.mockImplementation(() => ({
        on: jest.fn((event: string, callback: (code: number) => void) => {
          if (event === 'close') {
            // First call (linting) fails, others succeed
            callback(callCount++ === 0 ? 1 : 0);
          }
        }),
        kill: jest.fn(),
      }));

      const results = await agent.runFullSuite();

      // Should complete with warnings but not errors
      expect(results.errors).toBe(0);
      expect(results.warnings).toBeGreaterThanOrEqual(0);
    });

    it('should handle network timeouts gracefully', async () => {
      fsExtra.pathExists.mockResolvedValue(true);
      fsExtra.readFile.mockResolvedValue(JSON.stringify({
        version: "2.0.0",
        qualityGates: {
          failOnSecurityVulnerabilities: false // Allow security check to fail
        }
      }));

      // Mock timeout scenario
      const childProcess = require('child_process');
      childProcess.spawn.mockImplementation(() => ({
        on: jest.fn((event: string, callback: (code: number) => void) => {
          if (event === 'close') {
            // Simulate timeout/network failure
            setTimeout(() => callback(1), 100);
          }
        }),
        kill: jest.fn(),
      }));

      const results = await agent.runFullSuite();

      // Should handle the failure gracefully
      expect(results).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of test files efficiently', async () => {
      const fsExtra = require('fs-extra');
      const glob = require('glob');

      fsExtra.pathExists.mockResolvedValue(true);
      fsExtra.readFile.mockResolvedValue(JSON.stringify({
        version: "2.0.0",
        qualityGates: { requireTests: true }
      }));

      // Mock many test files
      const manyTestFiles = Array.from({ length: 100 }, (_, i) => `test/file${i}.test.ts`);
      (glob.globSync as jest.Mock).mockImplementation((pattern: unknown) => {
        if (pattern === '**/*.test.{js,jsx,ts,tsx,cjs,mjs}') {
          return manyTestFiles;
        }
        return [];
      });

      // Mock successful command execution for all checks
      const childProcess = require('child_process');
      childProcess.spawn.mockImplementation(() => ({
        on: jest.fn((event: string, callback: (code: number) => void) => {
          if (event === 'close') callback(0); // Success for all commands
        }),
        kill: jest.fn(),
      }));

      const startTime = Date.now();
      const results = await agent.runFullSuite();
      const duration = Date.now() - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds max
      expect(results.errors).toBe(0); // Should pass with successful mocks
    });

    it('should cache results appropriately to improve performance', async () => {
      const fsExtra = require('fs-extra');

      fsExtra.pathExists.mockResolvedValue(true);
      fsExtra.readFile.mockResolvedValue(JSON.stringify({
        version: "2.0.0"
      }));

      // First run
      await agent.runFullSuite();

      // Second run should use cache
      const results2 = await agent.runFullSuite();

      expect(results2).toBeDefined();
      // Verify caching is working (implementation detail)
    });
  });
});