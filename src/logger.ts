import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import fse from 'fs-extra';

/**
 * Configuration options for the Logger
 */
export interface LogOptions {
  /** Enable verbose logging output */
  verbose?: boolean;
  /** Suppress non-error output */
  quiet?: boolean;
  /** Root directory of the project */
  projectRoot: string;
  /** Path to the QA log file */
  qaLogPath: string;
}

/**
 * Logger class for handling QA agent logging with secret redaction and file output
 */
export class Logger {
  private options: LogOptions;

  /**
   * Creates a new Logger instance
   * @param options Configuration options for logging behavior
   */
  constructor(options: LogOptions) {
    this.options = options;
  }

  /**
   * Logs a message with the specified level
   * @param level Log level (INFO, SUCCESS, WARNING, ERROR)
   * @param message Message to log (secrets will be automatically redacted)
   */
  log(level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR', message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const redactedMessage = this.redactSecrets(message);
    const logEntry = `| ${timestamp} | ${level} | ${redactedMessage} |`;

    if ((this.options.verbose || level === 'ERROR') && !this.options.quiet) {
      const color =
        level === 'ERROR'
          ? chalk.red
          : level === 'WARNING'
            ? chalk.yellow
            : level === 'SUCCESS'
              ? chalk.green
              : chalk.blue;
      console.log(color(`${timestamp} | ${level} | ${redactedMessage}`));
    }

    // Append to QA log
    this.appendToLog(logEntry);
  }

  /**
   * Redacts sensitive information from log messages
   * @param message Original message that may contain secrets
   * @returns Message with secrets redacted
   * @private
   */
  private redactSecrets(message: string): string {
    return message
      .replace(/(api[_-]?key[:= ]+)(0x[0-9a-fA-F]{8,})/gi, '$1[REDACTED]')
      .replace(/(private[_-]?key[:= ]+)(0x[0-9a-fA-F]{64,})/gi, '$1[REDACTED]')
      .replace(/(password[:= ]+).*/gi, '$1[REDACTED]')
      .replace(/(secret[:= ]+).*/gi, '$1[REDACTED]')
      .replace(/(token[:= ]+).*/gi, '$1[REDACTED]');
  }

  /**
   * Appends a log entry to the QA log file
   * @param entry Formatted log entry to append
   * @private
   */
  private async appendToLog(entry: string): Promise<void> {
    try {
      await fse.ensureDir(path.dirname(this.options.qaLogPath));
      await fs.appendFile(this.options.qaLogPath, entry + '\n');
    } catch {
      // Silently fail if logging fails
    }
  }
}
