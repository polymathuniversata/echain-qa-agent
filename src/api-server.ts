#!/usr/bin/env node

import express, { Request, Response } from 'express';
import cors from 'cors';
import { QAAgent } from './qa-agent.js';
import path from 'path';
import { promises as fs } from 'fs';
import fsSync from 'fs';

// Utility function to validate and sanitize file paths
function validateProjectPath(projectPath: string): string {
  if (!projectPath) {
    return process.cwd();
  }

  // Resolve the path to prevent directory traversal
  const resolvedPath = path.resolve(projectPath);

  // Ensure the path doesn't go outside the current working directory
  // or allow absolute paths that could be dangerous
  if (!resolvedPath.startsWith(process.cwd()) && !path.isAbsolute(projectPath)) {
    throw new Error('Invalid project path: Path must be within the current working directory');
  }

  // Additional validation: check if the path exists and is a directory
  try {
    const stats = fsSync.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      throw new Error('Invalid project path: Path must be a directory');
    }
  } catch (error) {
    throw new Error(
      `Invalid project path: ${error instanceof Error ? error.message : 'Path does not exist or is not accessible'}`
    );
  }

  return resolvedPath;
}

interface APIRequest {
  projectRoot?: string;
  skipLinting?: boolean;
  skipTesting?: boolean;
  skipBuild?: boolean;
  skipSecurity?: boolean;
  skipPlugins?: boolean;
  skipDocs?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  autoFix?: boolean;
  interactive?: boolean;
}

interface APIResponse {
  status:
    | 'success'
    | 'error'
    | 'completed'
    | 'failed'
    | 'passed'
    | 'issues_found'
    | 'clean'
    | 'not_implemented';
  message: string;
  data?: any;
  errors?: number;
  warnings?: number;
  duration?: number;
  timestamp?: string;
  securityIssues?: number;
}

class QAAgentAPIServer {
  private app: express.Application;
  private port: number;

  constructor(port: number = 3001) {
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, res: Response, next: express.NextFunction) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        service: 'echain-qa-agent',
        version: '2.1.5',
        timestamp: new Date().toISOString(),
      });
    });

    // Run comprehensive QA checks
    this.app.post('/api/qa/run', async (req: Request, res: Response) => {
      try {
        const params: APIRequest = req.body;
        const validatedProjectRoot = validateProjectPath(params.projectRoot || process.cwd());
        const qaAgent = new QAAgent({
          dryRun: params.dryRun || false,
          verbose: params.verbose || false,
          quiet: true,
          projectRoot: validatedProjectRoot,
          skipLinting: params.skipLinting || false,
          skipTesting: params.skipTesting || false,
          skipBuild: params.skipBuild || false,
          skipSecurity: params.skipSecurity || false,
          skipPlugins: params.skipPlugins || false,
          skipDocs: params.skipDocs || false,
        });

        const results = await qaAgent.runFullSuite();

        const response: APIResponse = {
          status: results.errors > 0 ? 'failed' : 'passed',
          message:
            results.errors > 0
              ? `QA checks failed with ${results.errors} errors and ${results.warnings} warnings`
              : `QA checks passed with ${results.warnings} warnings`,
          errors: results.errors,
          warnings: results.warnings,
          duration: results.duration,
          timestamp: results.timestamp.toISOString(),
        };

        res.json(response);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        } as APIResponse);
      }
    });

    // Run specific checks
    this.app.post('/api/qa/lint', async (req: Request, res: Response) => {
      try {
        const params: APIRequest = req.body;
        const validatedProjectRoot = validateProjectPath(params.projectRoot || process.cwd());
        const qaAgent = new QAAgent({
          projectRoot: validatedProjectRoot,
        });

        await qaAgent.runLinting(params.autoFix || false);

        const response: APIResponse = {
          status: 'completed',
          message: `Linting ${params.autoFix ? 'with auto-fix' : ''} completed successfully`,
        };

        res.json(response);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        } as APIResponse);
      }
    });

    this.app.post('/api/qa/test', async (req: Request, res: Response) => {
      try {
        const params: APIRequest = req.body;
        const validatedProjectRoot = validateProjectPath(params.projectRoot || process.cwd());
        const qaAgent = new QAAgent({
          projectRoot: validatedProjectRoot,
        });

        await qaAgent.runTests();

        const response: APIResponse = {
          status: 'completed',
          message: 'Testing completed successfully',
        };

        res.json(response);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        } as APIResponse);
      }
    });

    this.app.post('/api/qa/security', async (req: Request, res: Response) => {
      try {
        const params: APIRequest = req.body;
        const validatedProjectRoot = validateProjectPath(params.projectRoot || process.cwd());
        const qaAgent = new QAAgent({
          projectRoot: validatedProjectRoot,
        });

        const securityResults = await qaAgent.runSecurityChecks();
        const issues = securityResults.issues;

        const response: APIResponse = {
          status: issues > 0 ? 'issues_found' : 'clean',
          message:
            issues > 0
              ? `Security scan completed with ${issues} issues found`
              : 'Security scan completed - no issues found',
          securityIssues: issues,
        };

        res.json(response);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        } as APIResponse);
      }
    });

    this.app.post('/api/qa/build', async (req: Request, res: Response) => {
      try {
        const params: APIRequest = req.body;
        const validatedProjectRoot = validateProjectPath(params.projectRoot || process.cwd());
        const qaAgent = new QAAgent({
          projectRoot: validatedProjectRoot,
        });

        await qaAgent.runBuildChecks();

        const response: APIResponse = {
          status: 'completed',
          message: 'Build verification completed successfully',
        };

        res.json(response);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        } as APIResponse);
      }
    });

    // Get QA report
    this.app.get('/api/qa/report', async (req: Request, res: Response) => {
      try {
        const projectRoot = (req.query.projectRoot as string) || process.cwd();
        const validatedProjectRoot = validateProjectPath(projectRoot);
        const reportPath = path.join(validatedProjectRoot, 'qa-report.json');

        const reportContent = await fs.readFile(reportPath, 'utf-8');
        const report = JSON.parse(reportContent);

        res.json({
          status: 'success',
          message: 'QA report retrieved successfully',
          data: report,
        } as APIResponse);
      } catch {
        res.status(404).json({
          status: 'error',
          message: 'QA report not found. Run QA checks first to generate a report.',
        } as APIResponse);
      }
    });

    // Initialize QA configuration
    this.app.post('/api/qa/init', async (req: Request, res: Response) => {
      try {
        const params: APIRequest = req.body;
        const validatedProjectRoot = validateProjectPath(params.projectRoot || process.cwd());
        const qaAgent = new QAAgent({
          projectRoot: validatedProjectRoot,
        });

        if (params.interactive) {
          // For API, we can't do interactive setup, so fall back to basic init
          await qaAgent.initializeProject();
        } else {
          await qaAgent.initializeProject();
        }

        const response: APIResponse = {
          status: 'completed',
          message: 'QA configuration initialized successfully',
        };

        res.json(response);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        } as APIResponse);
      }
    });

    // Setup git hooks
    this.app.post('/api/qa/hooks', async (req: Request, res: Response) => {
      try {
        const params: APIRequest = req.body;
        const validatedProjectRoot = validateProjectPath(params.projectRoot || process.cwd());
        const qaAgent = new QAAgent({
          projectRoot: validatedProjectRoot,
        });

        await qaAgent.setupHooks();

        const response: APIResponse = {
          status: 'completed',
          message: 'Git hooks installed successfully',
        };

        res.json(response);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        } as APIResponse);
      }
    });

    // Project analysis
    this.app.get('/api/qa/analyze', async (req: Request, res: Response) => {
      try {
        const projectRoot = (req.query.projectRoot as string) || process.cwd();
        const validatedProjectRoot = validateProjectPath(projectRoot);
        const qaAgent = new QAAgent({
          projectRoot: validatedProjectRoot,
        });

        // Use the private detectProjectType method via type assertion
        const analysis = await (qaAgent as any).detectProjectType();

        const recommendations = this.generateRecommendations(analysis);

        const response: APIResponse = {
          status: 'success',
          message: 'Project analysis completed',
          data: {
            projectType: analysis.projectType,
            frameworks: analysis.frameworks,
            languages: analysis.languages,
            confidence: analysis.confidence,
            hasTests: analysis.hasTests,
            hasBuild: analysis.hasBuild,
            recommendations: recommendations,
          },
        };

        res.json(response);
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        } as APIResponse);
      }
    });

    // WebSocket endpoint for streaming (placeholder for future implementation)
    this.app.get('/api/qa/stream', (req: Request, res: Response) => {
      res.json({
        status: 'not_implemented',
        message: 'Streaming endpoint not yet implemented',
      } as APIResponse);
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        status: 'error',
        message: `Endpoint ${req.method} ${req.path} not found`,
      } as APIResponse);
    });

    // Error handler
    this.app.use(
      (error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
        console.error('API Error:', error);
        res.status(500).json({
          status: 'error',
          message: 'Internal server error',
        } as APIResponse);
      }
    );
  }

  private generateRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];

    if (!analysis.hasTests) {
      recommendations.push('Add automated tests to improve code quality and catch regressions');
    }

    if (!analysis.hasBuild) {
      recommendations.push('Configure build scripts for automated compilation and verification');
    }

    if (
      analysis.projectType === 'blockchain' &&
      !analysis.frameworks.includes('hardhat') &&
      !analysis.frameworks.includes('foundry')
    ) {
      recommendations.push(
        'Consider using Hardhat or Foundry for better blockchain development experience'
      );
    }

    if (analysis.confidence < 70) {
      recommendations.push('Run QA configuration initialization to set up project-specific rules');
    }

    return recommendations;
  }

  async start() {
    return new Promise<void>((resolve, reject) => {
      try {
        this.app.listen(this.port, () => {
          console.log(`🛡️ Echain QA Agent API Server running on port ${this.port}`);
          console.log(`📊 Health check: http://localhost:${this.port}/health`);
          console.log(`🔧 API documentation: http://localhost:${this.port}/api/qa/run (POST)`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}

// Start the server if this file is run directly
const port = parseInt(process.argv[2]) || 3001;
const server = new QAAgentAPIServer(port);
server.start().catch(error => {
  console.error('Failed to start API server:', error);
  process.exit(1);
});

export { QAAgentAPIServer };
