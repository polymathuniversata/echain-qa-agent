import { promises as fs } from 'fs';
import path from 'path';
import fse from 'fs-extra';

export interface QAResults {
  errors: number;
  warnings: number;
  duration: number;
  timestamp: Date;
}

export class ReportGenerator {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async generateReport(results: QAResults): Promise<void> {
    const reportPath = path.join(this.projectRoot, 'qa-report.json');
    const report = {
      timestamp: results.timestamp.toISOString(),
      duration: results.duration,
      errors: results.errors,
      warnings: results.warnings,
      status: results.errors > 0 ? 'failure' : 'success',
    };

    await fse.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log('SUCCESS', `QA report generated: ${reportPath}`);
  }

  async initializeLog(): Promise<void> {
    const qaLogPath = path.join(this.projectRoot, 'docs', 'qalog.md');

    // Create docs directory if it doesn't exist
    await fse.ensureDir(path.dirname(qaLogPath));

    // Create initial QA log if it doesn't exist
    if (!(await fse.pathExists(qaLogPath))) {
      const header = `# 🛡️ Echain QA Agent Log

This file contains the comprehensive log of all Quality Assurance sessions for the project. Each entry represents a complete QA run with detailed information about checks performed, results, and any issues found.

**Last Updated:** ${new Date().toISOString()}
**QA Agent Version:** 2.0.0

---

`;
      await fse.writeFile(qaLogPath, header);
    }
  }

  async appendSessionLog(sessionId: string, results: QAResults): Promise<void> {
    const qaLogPath = path.join(this.projectRoot, 'docs', 'qalog.md');

    // Initialize QA log session
    const sessionHeader = `

## 🛡️ QA Session: ${sessionId}
**Started:** ${new Date().toISOString()}

| Time | Level | Message |
|------|--------|---------|
`;
    await fs.appendFile(qaLogPath, sessionHeader);

    // Final summary
    const summary = `

**Duration:** ${results.duration.toFixed(1)}s | **Errors:** ${results.errors} | **Warnings:** ${results.warnings}
---
`;
    await fs.appendFile(qaLogPath, summary);
  }
}
