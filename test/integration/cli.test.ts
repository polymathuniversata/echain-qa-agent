import { spawn } from 'child_process';
import path from 'path';

describe('CLI Integration Tests', () => {
  const cliPath = path.join(__dirname, '../../dist/cli.js');

  const runCLI = (args: string[], timeout: number = 2000): Promise<{ code: number; stdout: string; stderr: string }> => {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [cliPath, ...args], {
        cwd: path.join(__dirname, '../../'),
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';
      let hasStarted = false;

      const timer = setTimeout(() => {
        if (hasStarted) {
          // Command started successfully, kill it and resolve
          child.kill();
          resolve({ code: 0, stdout, stderr });
        } else {
          child.kill();
          reject(new Error(`CLI command failed to start within ${timeout}ms`));
        }
      }, timeout);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        hasStarted = true;
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        hasStarted = true;
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ code: code || 0, stdout, stderr });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  };

  describe('CLI commands', () => {
    it('should show help when no command is provided', async () => {
      const result = await runCLI(['--help'], 5000);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('echain-qa');
      expect(result.stdout).toContain('run');
      expect(result.stdout).toContain('lint');
    });

    it('should show version', async () => {
      const result = await runCLI(['--version'], 5000);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('2.1.5');
    });

    it('should handle init command', async () => {
      const result = await runCLI(['init', '--help'], 5000);

      // Init command help should be fast
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('init');
    });

    it('should handle lint command', async () => {
      const result = await runCLI(['lint', '--help'], 5000);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('lint');
    });

    it('should handle test command', async () => {
      const result = await runCLI(['test', '--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('test');
    });

    it('should handle security command', async () => {
      const result = await runCLI(['security', '--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('security');
    });

    it('should handle build command', async () => {
      const result = await runCLI(['build', '--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('build');
    });
  });

  describe('run command options', () => {
    it('should handle dry-run option', async () => {
      const result = await runCLI(['run', '--dry-run', '--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('dry-run');
    });

    it('should handle verbose option', async () => {
      const result = await runCLI(['run', '--verbose', '--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('verbose');
    });
  });
});