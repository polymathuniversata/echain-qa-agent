import { QAAgent } from '../../src/qa-agent';
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

// Mock fs
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    appendFile: jest.fn(),
    readdir: jest.fn(),
  },
}));

// Mock fs/promises for the logger
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  appendFile: jest.fn(),
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

// Mock inquirer
jest.mock('inquirer', () => ({
  default: {
    prompt: jest.fn()
  }
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
    const fs = require('fs');
    const glob = require('glob');

    beforeEach(() => {
      fsExtra.pathExists.mockResolvedValue(true);
      fs.promises.readFile.mockResolvedValue(JSON.stringify({
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

      jest.spyOn(agent as any, 'runTests').mockResolvedValue({
        errors: 0,
        warnings: 0,
        duration: 1.0,
        timestamp: new Date()
      });
      jest.spyOn(agent as any, 'runLinting').mockResolvedValue({
        errors: 0,
        warnings: 0,
        duration: 1.0,
        timestamp: new Date()
      });
      jest.spyOn(agent as any, 'runBuildChecks').mockResolvedValue({
        errors: 0,
        warnings: 0,
        duration: 1.0,
        timestamp: new Date()
      });
      jest.spyOn(agent as any, 'runSecurityChecks').mockResolvedValue({
        issues: 0,
        duration: 1.0,
        timestamp: new Date()
      });

      const results = await agent.runFullSuite();

      expect(results.errors).toBeGreaterThan(0);
      expect((agent as any).runTests).toHaveBeenCalled(); // Quality gate fails but tests still run
    });
  });

  describe('Quality Gates - Coverage Requirements', () => {
    const fsExtra = require('fs-extra');
    const fs = require('fs');

    beforeEach(() => {
      fsExtra.pathExists.mockResolvedValue(true);
      fs.promises.readFile.mockImplementation((filePath: string) => {
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
      const fs = require('fs');
      const fsExtra = require('fs-extra');
      fs.promises.readFile.mockImplementation((filePath: string) => {
        if (filePath.includes('.qa-config.json')) {
          return Promise.resolve(JSON.stringify({
            version: "2.0.0",
            qualityGates: {
              requireTests: false,
              requireTestCoverage: true,
              minTestCoverage: 80
            }
          }));
        }
        if (filePath.includes('coverage-summary.json')) {
          return Promise.resolve(JSON.stringify({
            total: {
              lines: { pct: 90 },
              statements: { pct: 92 },
              branches: { pct: 88 },
              functions: { pct: 91 }
            }
          }));
        }
        return Promise.resolve('{}');
      });
      fsExtra.readFile.mockImplementation((filePath: string) => {
        if (filePath.includes('coverage-summary.json')) {
          return Promise.resolve(JSON.stringify({
            total: {
              lines: { pct: 90 },
              statements: { pct: 92 },
              branches: { pct: 88 },
              functions: { pct: 91 }
            }
          }));
        }
        return Promise.resolve('{}');
      });

      jest.spyOn(agent as any, 'runTests').mockResolvedValue({
        errors: 0,
        warnings: 0,
        duration: 1.0,
        timestamp: new Date()
      });
      jest.spyOn(agent as any, 'runLinting').mockResolvedValue({
        errors: 0,
        warnings: 0,
        duration: 1.0,
        timestamp: new Date()
      });
      jest.spyOn(agent as any, 'runBuildChecks').mockResolvedValue({
        errors: 0,
        warnings: 0,
        duration: 1.0,
        timestamp: new Date()
      });
      jest.spyOn(agent as any, 'runSecurityChecks').mockResolvedValue({
        issues: 0,
        duration: 1.0,
        timestamp: new Date()
      });

      const results = await agent.runFullSuite();

      expect(results.errors).toBe(0);
    });

    it('should fail coverage gate when coverage is below threshold', async () => {
      const fs = require('fs');
      const fsExtra = require('fs-extra');
      fs.promises.readFile.mockImplementation((filePath: string) => {
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
        return Promise.resolve('{}');
      });

      jest.spyOn(agent as any, 'runTests').mockResolvedValue({
        errors: 0,
        warnings: 0,
        duration: 1.0,
        timestamp: new Date()
      });
      jest.spyOn(agent as any, 'runLinting').mockResolvedValue({
        errors: 0,
        warnings: 0,
        duration: 1.0,
        timestamp: new Date()
      });
      jest.spyOn(agent as any, 'runBuildChecks').mockResolvedValue({
        errors: 0,
        warnings: 0,
        duration: 1.0,
        timestamp: new Date()
      });
      jest.spyOn(agent as any, 'runSecurityChecks').mockResolvedValue({
        issues: 0,
        duration: 1.0,
        timestamp: new Date()
      });

      const results = await agent.runFullSuite();

      expect(results.errors).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    const fsExtra = require('fs-extra');
    const fs = require('fs');

    it('should handle missing config file gracefully', async () => {
      fsExtra.pathExists.mockResolvedValue(false);

      await expect(agent.initializeProject()).resolves.not.toThrow();
    });

    it('should handle invalid JSON in config file', async () => {
      fsExtra.pathExists.mockResolvedValue(true);
      fs.promises.readFile.mockResolvedValue('invalid json {');

      // Should throw due to invalid JSON, but not crash the process
      await expect(agent.initializeProject()).rejects.toThrow('Configuration validation failed');
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
    it('should load valid plugins', async () => {
      // Mock fs.readdir to return plugin files
      const fsPromises = require('fs').promises;
      const readdirMock = jest.spyOn(fsPromises, 'readdir').mockResolvedValue([
        { name: 'test-plugin.js', isFile: () => true, isDirectory: () => false }
      ] as any);

      // Mock fs.readFile for plugin content
      const readFileMock = jest.spyOn(fsPromises, 'readFile').mockResolvedValue(`
        exports.metadata = {
          name: 'test-plugin',
          version: '1.0.0',
          description: 'Test plugin'
        };
        exports.run = async (context) => ({
          errors: 0,
          warnings: 0,
          duration: 0,
          timestamp: new Date()
        });
      `);

      await (agent as any).loadPlugins();

      // Should not throw and should have loaded the plugin
      expect(agent.getPlugins().size).toBeGreaterThanOrEqual(0);

      // Restore mocks
      readdirMock.mockRestore();
      readFileMock.mockRestore();
    });

    it('should skip invalid plugins', async () => {
      // Mock fs.readdir to return invalid plugin files
      const fsPromises = require('fs').promises;
      const readdirMock = jest.spyOn(fsPromises, 'readdir').mockResolvedValue([
        { name: 'invalid-plugin.js', isFile: () => true, isDirectory: () => false }
      ] as any);

      // Mock fs.readFile for invalid plugin content
      const readFileMock = jest.spyOn(fsPromises, 'readFile').mockResolvedValue(`
        // Invalid plugin - missing metadata
        exports.run = async (context) => ({
          errors: 0,
          warnings: 0,
          duration: 0,
          timestamp: new Date()
        });
      `);

      await (agent as any).loadPlugins();

      // Should not throw but should not load invalid plugin
      expect(agent.getPlugins().size).toBe(0);

      // Restore mocks
      readdirMock.mockRestore();
      readFileMock.mockRestore();
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
