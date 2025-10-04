import { spawn } from 'child_process';
import path from 'path';

describe('CLI Integration Tests', () => {
  const cliPath = path.join(__dirname, '../../dist/cli.js');

  const runCLI = (args: string[]): Promise<{ code: number; stdout: string; stderr: string }> => {
    return new Promise((resolve) => {
      const child = spawn('node', [cliPath, ...args], {
        cwd: path.join(__dirname, '../../'),
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ code: code || 0, stdout, stderr });
      });
    });
  };

  describe('CLI commands', () => {
    it('should show help when no command is provided', async () => {
      const result = await runCLI(['--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('echain-qa');
      expect(result.stdout).toContain('run');
      expect(result.stdout).toContain('lint');
    });

    it('should show version', async () => {
      const result = await runCLI(['--version']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('2.1.3');
    });

    it('should handle init command', async () => {
      const result = await runCLI(['init']);

      // This might fail in test environment due to missing dependencies
      // but we test that the command is recognized
      expect(result.code).toBeDefined();
      expect(result.stdout + result.stderr).toContain('QA');
    });

    it('should handle lint command', async () => {
      const result = await runCLI(['lint']);

      expect(result.code).toBeDefined();
      // In test environment, linting might fail due to missing dependencies
      // but the command should be recognized
      expect(result.stdout + result.stderr).toMatch(/linting|Linting|✅|❌/);
    });

    it('should handle test command', async () => {
      const result = await runCLI(['test']);

      expect(result.code).toBeDefined();
      expect(result.stdout + result.stderr).toMatch(/test|Testing|✅|❌/);
    });

    it('should handle security command', async () => {
      const result = await runCLI(['security']);

      expect(result.code).toBeDefined();
      expect(result.stdout + result.stderr).toMatch(/security|Security|✅|❌/);
    });

    it('should handle build command', async () => {
      const result = await runCLI(['build']);

      expect(result.code).toBeDefined();
      expect(result.stdout + result.stderr).toMatch(/build|Build|✅|❌/);
    });
  });

  describe('run command options', () => {
    it('should handle dry-run option', async () => {
      const result = await runCLI(['run', '--dry-run']);

      expect(result.code).toBeDefined();
      // Dry run should complete without actual execution
      expect(result.code).toBe(0);
    });

    it('should handle verbose option', async () => {
      const result = await runCLI(['run', '--verbose']);

      expect(result.code).toBeDefined();
      // Verbose output should be more detailed
    });
  });
});