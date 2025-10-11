import { spawn } from 'child_process';

/**
 * Result of a command execution
 */
export interface CommandResult {
  /** Whether the command executed successfully */
  success: boolean;
  /** Exit code of the command (if available) */
  code?: number;
  /** Error message (if command failed) */
  error?: string;
}

/**
 * CommandExecutor handles safe execution of shell commands with security validation
 * and timeout management. Provides dry-run capability for testing.
 */
export class CommandExecutor {
  private projectRoot: string;
  private dryRun: boolean;

  /**
   * Creates a new CommandExecutor instance
   * @param projectRoot Root directory where commands should be executed
   * @param dryRun Whether to run in dry-run mode (log commands without executing)
   */
  constructor(projectRoot: string, dryRun: boolean = false) {
    this.projectRoot = projectRoot;
    this.dryRun = dryRun;
  }

  /**
   * Executes a shell command with timeout and error handling
   * @param command The shell command to execute
   * @param description Human-readable description of what the command does
   * @param timeout Maximum execution time in milliseconds (default: 300000)
   * @returns Promise resolving to true if command succeeded
   */
  async runCommand(command: string, description: string, timeout = 300000): Promise<boolean> {
    return new Promise(resolve => {
      console.log(`Running: ${description}`);

      if (this.dryRun) {
        console.log(`DRY RUN: Would execute: ${command}`);
        resolve(true);
        return;
      }

      const child = spawn(command, {
        shell: true,
        cwd: this.projectRoot,
        stdio: 'inherit', // Changed from 'pipe' to 'inherit' for better output visibility
      });

      const timer = setTimeout(() => {
        child.kill();
        console.log(`ERROR: ${description} timed out after ${timeout}ms`);
        resolve(false);
      }, timeout);

      child.on('close', code => {
        clearTimeout(timer);
        if (code === 0) {
          console.log(`SUCCESS: ✓ ${description} completed successfully`);
          resolve(true);
        } else {
          console.log(`ERROR: ✗ ${description} failed (exit code: ${code})`);
          resolve(false);
        }
      });

      child.on('error', error => {
        clearTimeout(timer);
        console.log(`ERROR: ${description} error: ${error.message}`);
        resolve(false);
      });
    });
  }

  /**
   * Sanitizes command input to prevent injection attacks by removing dangerous characters
   * @param command Raw command string that may contain malicious input
   * @returns Sanitized command string safe for execution
   */
  sanitizeCommand(command: string): string {
    // Remove dangerous characters and patterns
    return command
      .replace(/[;&|`$(){}[\]<>]/g, '') // Remove shell metacharacters
      .replace(/\.\./g, '') // Remove directory traversal
      .replace(/rm\s+/gi, '') // Remove rm commands
      .replace(/del\s+/gi, '') // Remove del commands
      .replace(/format\s+/gi, '') // Remove format commands
      .trim();
  }

  /**
   * Validates whether a command is safe to execute by checking for dangerous patterns
   * @param command The command to validate
   * @returns True if the command appears safe to execute
   */
  isCommandSafe(command: string): boolean {
    const dangerousPatterns = [
      /rm\s+-rf\s+\//, // Remove root directory
      /del\s+\/s\s+\/q\s+c:\\.*/, // Delete system files on Windows
      /format\s+c:/, // Format system drive
      /\.\./, // Directory traversal
      /[;&|`$]/, // Shell injection characters
      /shutdown|reboot|halt/, // System control commands
      /sudo|su\s/, // Privilege escalation
      /chmod\s+777/, // Dangerous permissions
      /chown\s+root/, // Root ownership
    ];

    return !dangerousPatterns.some(pattern => pattern.test(command));
  }
}
