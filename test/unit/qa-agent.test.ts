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

describe('QAAgent', () => {
  let agent: QAAgent;
  const mockProjectRoot = '/mock/project';

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new QAAgent({ projectRoot: mockProjectRoot, verbose: true });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultAgent = new QAAgent();
      expect(defaultAgent).toBeInstanceOf(QAAgent);
    });

    it('should initialize with custom options', () => {
      const customAgent = new QAAgent({
        dryRun: true,
        verbose: true,
        projectRoot: '/custom/path'
      });
      expect(customAgent).toBeInstanceOf(QAAgent);
    });
  });

  describe('redactSecrets', () => {
    // Test through logging since redactSecrets is private
    let consoleSpy: jest.SpiedFunction<typeof console.log>;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should redact API keys in logs', () => {
      (agent as any).log('INFO', 'API_KEY=0x123456789abcdef');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API_KEY=[REDACTED]')
      );
    });

    it('should redact private keys in logs', () => {
      (agent as any).log('INFO', 'PRIVATE_KEY=0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef123456789abcdef12345678');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('PRIVATE_KEY=[REDACTED]')
      );
    });

    it('should redact passwords in logs', () => {
      (agent as any).log('INFO', 'password=secret123');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('password=[REDACTED]')
      );
    });
  });

  describe('initializeProject', () => {
    const fsExtra = require('fs-extra');

    beforeEach(() => {
      fsExtra.pathExists.mockResolvedValue(false);
      fsExtra.ensureDir.mockResolvedValue(undefined);
      fsExtra.writeFile.mockResolvedValue(undefined);
    });

    it('should create QA log file if it does not exist', async () => {
      await agent.initializeProject();

      expect(fsExtra.ensureDir).toHaveBeenCalledWith(path.join(mockProjectRoot, 'docs'));
      expect(fsExtra.writeFile).toHaveBeenCalledWith(
        path.join(mockProjectRoot, 'docs', 'qalog.md'),
        expect.stringContaining('# 🛡️ Echain QA Agent Log')
      );
    });

    it('should create QA config file if it does not exist', async () => {
      await agent.initializeProject();

      expect(fsExtra.writeFile).toHaveBeenCalledWith(
        path.join(mockProjectRoot, '.qa-config.json'),
        expect.stringContaining('"version": "2.0.0"')
      );
      expect(fsExtra.writeFile).toHaveBeenCalledWith(
        path.join(mockProjectRoot, '.qa-config.json'),
        expect.stringContaining('"requireTests": false')
      );
      expect(fsExtra.writeFile).toHaveBeenCalledWith(
        path.join(mockProjectRoot, '.qa-config.json'),
        expect.stringContaining('"minTestCoverage": 80')
      );
    });
  });

  describe('quality gates', () => {
    const fsExtra = require('fs-extra');
    const glob = require('glob');

    it('should detect test files via collectTestFiles', () => {
      (glob.globSync as jest.Mock).mockImplementation((pattern: unknown) => {
        if (pattern === '**/*.test.{js,jsx,ts,tsx,cjs,mjs}') {
          return ['src/example.test.ts'];
        }
        return [];
      });

      const files = (agent as any).collectTestFiles({ paths: { tests: 'test' } });
      expect(files).toEqual(['src/example.test.ts']);
    });

    it('should fail coverage enforcement when below threshold', async () => {
      fsExtra.pathExists.mockResolvedValue(true);
      fsExtra.readFile.mockResolvedValue(JSON.stringify({
        total: {
          lines: { pct: 70 },
          statements: { pct: 72 },
          branches: { pct: 68 },
          functions: { pct: 69 }
        }
      }));

      await expect((agent as any).enforceTestCoverageRequirement({
        qualityGates: { minTestCoverage: 80 }
      })).rejects.toThrow('Coverage 68.00% is below required 80% threshold.');
    });

    it('should pass coverage enforcement when threshold is met', async () => {
      fsExtra.pathExists.mockResolvedValue(true);
      fsExtra.readFile.mockResolvedValue(JSON.stringify({
        total: {
          lines: { pct: 90 },
          statements: { pct: 92 },
          branches: { pct: 88 },
          functions: { pct: 91 }
        }
      }));

      await expect((agent as any).enforceTestCoverageRequirement({
        qualityGates: { minTestCoverage: 80 }
      })).resolves.toBe(88);
    });
  });

  describe('runCommand', () => {
    const childProcess = require('child_process');

    beforeEach(() => {
      childProcess.spawn.mockReturnValue({
        on: jest.fn(),
        kill: jest.fn(),
      });
    });

    it('should run command successfully', async () => {
      const mockChild = {
        on: jest.fn((event: string, callback: (code: number) => void) => {
          if (event === 'close') callback(0);
        }),
        kill: jest.fn(),
      };
      childProcess.spawn.mockReturnValue(mockChild);

      const result = await (agent as any).runCommand('echo test', 'Test command');

      expect(result).toBe(true);
      expect(childProcess.spawn).toHaveBeenCalledWith('echo test', {
        shell: true,
        cwd: mockProjectRoot,
        stdio: 'inherit'
      });
    });

    it('should handle command failure', async () => {
      const mockChild = {
        on: jest.fn((event: string, callback: (code: number) => void) => {
          if (event === 'close') callback(1);
        }),
        kill: jest.fn(),
      };
      childProcess.spawn.mockReturnValue(mockChild);

      const result = await (agent as any).runCommand('failing command', 'Failing command');

      expect(result).toBe(false);
    });

    it('should handle dry run', async () => {
      const dryRunAgent = new QAAgent({ dryRun: true, projectRoot: mockProjectRoot });
      const result = await (dryRunAgent as any).runCommand('echo test', 'Test command');

      expect(result).toBe(true);
      expect(childProcess.spawn).not.toHaveBeenCalled();
    });
  });
});