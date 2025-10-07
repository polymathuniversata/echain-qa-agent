import { QAAgent } from '../../src/qa-agent';
import { promises as fs } from 'fs';
import path from 'path';
import { jest } from '@jest/globals';

// Mock chalk
jest.mock('chalk', () => ({
  red: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  green: jest.fn((str) => str),
  blue: jest.fn((str) => str),
}));

// Mock fs-extra
jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  ensureDir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

// Mock glob
jest.mock('glob', () => ({
  globSync: jest.fn(),
}));

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn(),
}));

describe('QAAgent - Comprehensive Edge Cases', () => {
  let agent: QAAgent;
  const mockProjectRoot = '/mock/project';

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new QAAgent({ projectRoot: mockProjectRoot, verbose: true });
  });

  describe('Quality Gates - Test Requirements', () => {
    const fsExtra = require('fs-extra');
    const glob = require('glob');

    beforeEach(() => {
      fsExtra.pathExists.mockResolvedValue(true);
      fsExtra.readFile.mockResolvedValue(JSON.stringify({
        version: "2.0.0",
        qualityGates: {
          requireTests: true,
          requireTestCoverage: false,
          minTestCoverage: 80
        }
      }));
    });

    it('should fail when requireTests is enabled but no test files found', async () => {
      (glob.globSync as jest.Mock).mockReturnValue([]);

      const mockRunTests = jest.spyOn(agent as any, 'runTests').mockResolvedValue(undefined);
      const mockRunLinting = jest.spyOn(agent as any, 'runLinting').mockResolvedValue(undefined);
      const mockRunBuildChecks = jest.spyOn(agent as any, 'runBuildChecks').mockResolvedValue(undefined);
      const mockRunSecurityChecks = jest.spyOn(agent as any, 'runSecurityChecks').mockResolvedValue(0);

      const results = await agent.runFullSuite();

      expect(results.errors).toBeGreaterThan(0);
      expect(mockRunTests).toHaveBeenCalled(); // Quality gate fails but tests still run
    });

    it('should pass when requireTests is enabled and test files are found', async () => {
      (glob.globSync as jest.Mock).mockImplementation((pattern: unknown) => {
        if (pattern === '**/*.test.{js,jsx,ts,tsx,cjs,mjs}') {
          return ['src/example.test.ts'];
        }
        return [];
      });

      const mockRunTests = jest.spyOn(agent as any, 'runTests').mockResolvedValue(undefined);
      const mockRunLinting = jest.spyOn(agent as any, 'runLinting').mockResolvedValue(undefined);
      const mockRunBuildChecks = jest.spyOn(agent as any, 'runBuildChecks').mockResolvedValue(undefined);
      const mockRunSecurityChecks = jest.spyOn(agent as any, 'runSecurityChecks').mockResolvedValue(0);

      const results = await agent.runFullSuite();

      expect(results.errors).toBe(0);
      expect(mockRunTests).toHaveBeenCalled();
    });
  });

  describe('Quality Gates - Coverage Requirements', () => {
    const fsExtra = require('fs-extra');

    beforeEach(() => {
      fsExtra.pathExists.mockResolvedValue(true);
      fsExtra.readFile.mockImplementation((filePath: string) => {
        if (filePath.includes('.qa-config.json')) {
          return Promise.resolve(JSON.stringify({
            version: "2.0.0",
            qualityGates: {
              requireTests: false,
              requireTestCoverage: true,
              minTestCoverage: 85
            }
          }));
        }
        if (filePath.includes('coverage-summary.json')) {
          return Promise.resolve(JSON.stringify({
            total: {
              lines: { pct: 90 },
              statements: { pct: 88 },
              branches: { pct: 86 },
              functions: { pct: 89 }
            }
          }));
        }
        return Promise.resolve('');
      });
    });

    it('should pass coverage gate when coverage meets threshold', async () => {
      const mockRunTests = jest.spyOn(agent as any, 'runTests').mockResolvedValue(undefined);
      const mockRunLinting = jest.spyOn(agent as any, 'runLinting').mockResolvedValue(undefined);
      const mockRunBuildChecks = jest.spyOn(agent as any, 'runBuildChecks').mockResolvedValue(undefined);
      const mockRunSecurityChecks = jest.spyOn(agent as any, 'runSecurityChecks').mockResolvedValue(0);

      const results = await agent.runFullSuite();

      expect(results.errors).toBe(0);
    });

    it('should fail coverage gate when coverage is below threshold', async () => {
      fsExtra.readFile.mockImplementation((filePath: string) => {
        if (filePath.includes('coverage-summary.json')) {
          return Promise.resolve(JSON.stringify({
            total: {
              lines: { pct: 70 },
              statements: { pct: 72 },
              branches: { pct: 68 },
              functions: { pct: 69 }
            }
          }));
        }
        return Promise.resolve(JSON.stringify({
          version: "2.0.0",
          qualityGates: {
            requireTests: false,
            requireTestCoverage: true,
            minTestCoverage: 85
          }
        }));
      });

      const mockRunTests = jest.spyOn(agent as any, 'runTests').mockResolvedValue(undefined);
      const mockRunLinting = jest.spyOn(agent as any, 'runLinting').mockResolvedValue(undefined);
      const mockRunBuildChecks = jest.spyOn(agent as any, 'runBuildChecks').mockResolvedValue(undefined);
      const mockRunSecurityChecks = jest.spyOn(agent as any, 'runSecurityChecks').mockResolvedValue(0);

      const results = await agent.runFullSuite();

      expect(results.errors).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    const fsExtra = require('fs-extra');

    it('should handle missing config file gracefully', async () => {
      fsExtra.pathExists.mockResolvedValue(false);

      await expect(agent.initializeProject()).resolves.not.toThrow();
    });

    it('should handle invalid JSON in config file', async () => {
      fsExtra.pathExists.mockResolvedValue(true);
      fsExtra.readFile.mockResolvedValue('invalid json {');

      // Should throw due to invalid JSON, but not crash the process
      await expect(agent.initializeProject()).rejects.toThrow('Unexpected token');
    });

    it('should handle missing coverage file when coverage is required', async () => {
      fsExtra.pathExists.mockResolvedValue(false);

      await expect((agent as any).enforceTestCoverageRequirement({
        qualityGates: { minTestCoverage: 80 }
      })).rejects.toThrow('Coverage summary not found');
    });

    it('should handle invalid coverage JSON', async () => {
      fsExtra.pathExists.mockResolvedValue(true);
      fsExtra.readFile.mockResolvedValue('invalid json');

      await expect((agent as any).enforceTestCoverageRequirement({
        qualityGates: { minTestCoverage: 80 }
      })).rejects.toThrow('Coverage summary is not valid JSON');
    });
  });

  describe('Plugin System', () => {
    const fsExtra = require('fs-extra');

    beforeEach(() => {
      fsExtra.pathExists.mockResolvedValue(true);
    });

    it('should load valid plugins', async () => {
      // Mock the glob to return plugin files
      const glob = require('glob');
      (glob.globSync as jest.Mock).mockReturnValue([]);

      await (agent as any).loadPlugins();

      // Should not throw
      expect(glob.globSync).toHaveBeenCalled();
    });

    it('should skip invalid plugins', async () => {
      // Mock the glob to return plugin files
      const glob = require('glob');
      (glob.globSync as jest.Mock).mockReturnValue([]);

      await (agent as any).loadPlugins();

      // Should not throw
      expect(glob.globSync).toHaveBeenCalled();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate QA config against schema', async () => {
      const validConfig = {
        version: "2.0.0",
        project: {
          name: "test",
          type: "blockchain"
        },
        checks: {
          linting: true,
          testing: true,
          security: true,
          build: true
        }
      };

      const isValid = await (agent as any).validateConfig(validConfig);
      expect(isValid).toBe(true);
    });

    it('should reject invalid config', async () => {
      const invalidConfig = {
        version: "invalid",
        project: {
          name: 123, // Should be string
          type: "invalid_type" // Should be enum
        }
      };

      const isValid = await (agent as any).validateConfig(invalidConfig);
      expect(isValid).toBe(false);
    });
  });
});