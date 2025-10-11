#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
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

class QAAgentMCPServer {
  private server: Server;

  constructor() {
    console.log('MCP: Creating QAAgentMCPServer');
    this.server = new Server({
      name: 'echain-qa-agent',
      version: '2.1.5',
    });
    console.log('MCP: Server created, setting up handlers');
    this.setupToolHandlers();
    console.log('MCP: Handlers setup complete');
  }

  private setupToolHandlers() {
    console.log('MCP: Setting up request handlers');

    // Handle initialization
    this.server.setRequestHandler(InitializeRequestSchema, async () => {
      console.log('MCP: Handling initialize request');
      return {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {
            listChanged: true,
          },
        },
        serverInfo: {
          name: 'echain-qa-agent',
          version: '2.1.5',
        },
      };
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log('MCP: Handling list_tools request');
      return {
        tools: [
          {
            name: 'run_qa_checks',
            description: 'Run comprehensive QA checks on the current project',
            inputSchema: {
              type: 'object',
              properties: {
                skipLinting: {
                  type: 'boolean',
                  description: 'Skip code linting checks',
                  default: false,
                },
                skipTesting: {
                  type: 'boolean',
                  description: 'Skip automated testing',
                  default: false,
                },
                skipBuild: {
                  type: 'boolean',
                  description: 'Skip build verification',
                  default: false,
                },
                skipSecurity: {
                  type: 'boolean',
                  description: 'Skip security vulnerability scanning',
                  default: false,
                },
                skipPlugins: {
                  type: 'boolean',
                  description: 'Skip custom plugin execution',
                  default: false,
                },
                skipDocs: {
                  type: 'boolean',
                  description: 'Skip documentation updates',
                  default: false,
                },
                dryRun: {
                  type: 'boolean',
                  description: 'Simulate QA checks without actual execution',
                  default: false,
                },
                verbose: {
                  type: 'boolean',
                  description: 'Enable verbose output',
                  default: false,
                },
                projectRoot: {
                  type: 'string',
                  description: 'Path to the project root directory',
                  default: process.cwd(),
                },
              },
            },
          },
          {
            name: 'run_linting',
            description: 'Run only code linting checks',
            inputSchema: {
              type: 'object',
              properties: {
                autoFix: {
                  type: 'boolean',
                  description: 'Automatically fix linting issues',
                  default: false,
                },
                projectRoot: {
                  type: 'string',
                  description: 'Path to the project root directory',
                  default: process.cwd(),
                },
              },
            },
          },
          {
            name: 'run_tests',
            description: 'Run only automated testing suite',
            inputSchema: {
              type: 'object',
              properties: {
                projectRoot: {
                  type: 'string',
                  description: 'Path to the project root directory',
                  default: process.cwd(),
                },
              },
            },
          },
          {
            name: 'run_security_checks',
            description: 'Run only security vulnerability scanning',
            inputSchema: {
              type: 'object',
              properties: {
                projectRoot: {
                  type: 'string',
                  description: 'Path to the project root directory',
                  default: process.cwd(),
                },
              },
            },
          },
          {
            name: 'run_build_checks',
            description: 'Run only build verification',
            inputSchema: {
              type: 'object',
              properties: {
                projectRoot: {
                  type: 'string',
                  description: 'Path to the project root directory',
                  default: process.cwd(),
                },
              },
            },
          },
          {
            name: 'get_qa_report',
            description: 'Get the latest QA report for the project',
            inputSchema: {
              type: 'object',
              properties: {
                projectRoot: {
                  type: 'string',
                  description: 'Path to the project root directory',
                  default: process.cwd(),
                },
              },
            },
          },
          {
            name: 'initialize_qa_config',
            description: 'Initialize QA configuration for a new project',
            inputSchema: {
              type: 'object',
              properties: {
                projectRoot: {
                  type: 'string',
                  description: 'Path to the project root directory',
                  default: process.cwd(),
                },
                interactive: {
                  type: 'boolean',
                  description: 'Run interactive setup wizard',
                  default: false,
                },
              },
            },
          },
          {
            name: 'setup_git_hooks',
            description: 'Install git hooks for automatic QA checks',
            inputSchema: {
              type: 'object',
              properties: {
                projectRoot: {
                  type: 'string',
                  description: 'Path to the project root directory',
                  default: process.cwd(),
                },
              },
            },
          },
          {
            name: 'get_project_analysis',
            description: 'Analyze project structure and provide QA recommendations',
            inputSchema: {
              type: 'object',
              properties: {
                projectRoot: {
                  type: 'string',
                  description: 'Path to the project root directory',
                  default: process.cwd(),
                },
              },
            },
          },
          {
            name: 'troubleshoot_issues',
            description: 'Run guided troubleshooting for common QA issues',
            inputSchema: {
              type: 'object',
              properties: {
                projectRoot: {
                  type: 'string',
                  description: 'Path to the project root directory',
                  default: process.cwd(),
                },
              },
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;
      console.log(`MCP: Handling tool call for ${name}`);

      try {
        switch (name) {
          case 'run_qa_checks':
            return await this.handleRunQAChecks(args);
          case 'run_linting':
            return await this.handleRunLinting(args);
          case 'run_tests':
            return await this.handleRunTests(args);
          case 'run_security_checks':
            return await this.handleRunSecurityChecks(args);
          case 'run_build_checks':
            return await this.handleRunBuildChecks(args);
          case 'get_qa_report':
            return await this.handleGetQAReport(args);
          case 'initialize_qa_config':
            return await this.handleInitializeQAConfig(args);
          case 'setup_git_hooks':
            return await this.handleSetupGitHooks(args);
          case 'get_project_analysis':
            return await this.handleGetProjectAnalysis(args);
          case 'troubleshoot_issues':
            return await this.handleTroubleshootIssues(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.log('MCP: Error in tool call:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleRunQAChecks(args: any) {
    const validatedProjectRoot = validateProjectPath(args.projectRoot || process.cwd());
    const qaAgent = new QAAgent({
      dryRun: args.dryRun || false,
      verbose: false, // Always quiet for MCP responses
      quiet: true, // Always quiet for MCP responses
      projectRoot: validatedProjectRoot,
      skipLinting: args.skipLinting || false,
      skipTesting: args.skipTesting || false,
      skipBuild: args.skipBuild || false,
      skipSecurity: args.skipSecurity || false,
      skipPlugins: args.skipPlugins || false,
      skipDocs: args.skipDocs || false,
    });

    const results = await qaAgent.runFullSuite();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              status: results.errors > 0 ? 'failed' : 'passed',
              errors: results.errors,
              warnings: results.warnings,
              duration: results.duration,
              timestamp: results.timestamp.toISOString(),
              message:
                results.errors > 0
                  ? `QA checks failed with ${results.errors} errors and ${results.warnings} warnings`
                  : `QA checks passed with ${results.warnings} warnings`,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleRunLinting(args: any) {
    const validatedProjectRoot = validateProjectPath(args.projectRoot || process.cwd());
    const qaAgent = new QAAgent({
      projectRoot: validatedProjectRoot,
      quiet: true,
    });

    await qaAgent.runLinting(args.autoFix || false);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              status: 'completed',
              message: `Linting ${args.autoFix ? 'with auto-fix' : ''} completed successfully`,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleRunTests(args: any) {
    const validatedProjectRoot = validateProjectPath(args.projectRoot || process.cwd());
    const qaAgent = new QAAgent({
      projectRoot: validatedProjectRoot,
      quiet: true,
    });

    await qaAgent.runTests();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              status: 'completed',
              message: 'Testing completed successfully',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleRunSecurityChecks(args: any) {
    const validatedProjectRoot = validateProjectPath(args.projectRoot || process.cwd());
    const qaAgent = new QAAgent({
      projectRoot: validatedProjectRoot,
      quiet: true,
    });

    const securityResults = await qaAgent.runSecurityChecks();
    const issues = securityResults.issues;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              status: issues > 0 ? 'issues_found' : 'clean',
              securityIssues: issues,
              message:
                issues > 0
                  ? `Security scan completed with ${issues} issues found`
                  : 'Security scan completed - no issues found',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleRunBuildChecks(args: any) {
    const validatedProjectRoot = validateProjectPath(args.projectRoot || process.cwd());
    const qaAgent = new QAAgent({
      projectRoot: validatedProjectRoot,
      quiet: true,
    });

    await qaAgent.runBuildChecks();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              status: 'completed',
              message: 'Build verification completed successfully',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleGetQAReport(args: any) {
    const validatedProjectRoot = validateProjectPath(args.projectRoot || process.cwd());
    const reportPath = path.join(validatedProjectRoot, 'qa-report.json');

    try {
      const reportContent = await fs.readFile(reportPath, 'utf-8');
      const report = JSON.parse(reportContent);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
    } catch (error) {
      console.log('MCP: Error reading QA report:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'No QA report found',
                message: 'Run QA checks first to generate a report',
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  private async handleInitializeQAConfig(args: any) {
    const validatedProjectRoot = validateProjectPath(args.projectRoot || process.cwd());
    const qaAgent = new QAAgent({
      projectRoot: validatedProjectRoot,
      quiet: true,
    });

    if (args.interactive) {
      await qaAgent.runInteractiveSetup();
    } else {
      await qaAgent.initializeProject();
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              status: 'completed',
              message: `QA configuration ${args.interactive ? 'setup wizard completed' : 'initialized'} successfully`,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleSetupGitHooks(args: any) {
    const validatedProjectRoot = validateProjectPath(args.projectRoot || process.cwd());
    const qaAgent = new QAAgent({
      projectRoot: validatedProjectRoot,
      quiet: true,
    });

    await qaAgent.setupHooks();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              status: 'completed',
              message: 'Git hooks installed successfully',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleGetProjectAnalysis(args: any) {
    const validatedProjectRoot = validateProjectPath(args.projectRoot || process.cwd());
    const qaAgent = new QAAgent({
      projectRoot: validatedProjectRoot,
      quiet: true,
    });

    // Use the private detectProjectType method via type assertion
    const analysis = await (qaAgent as any).detectProjectType();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              projectType: analysis.projectType,
              frameworks: analysis.frameworks,
              languages: analysis.languages,
              confidence: analysis.confidence,
              hasTests: analysis.hasTests,
              hasBuild: analysis.hasBuild,
              recommendations: this.generateRecommendations(analysis),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleTroubleshootIssues(args: any) {
    const validatedProjectRoot = validateProjectPath(args.projectRoot || process.cwd());
    const qaAgent = new QAAgent({
      projectRoot: validatedProjectRoot,
      quiet: true,
    });

    // Use the private troubleshooting method via type assertion
    await (qaAgent as any).runGuidedTroubleshooting();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              status: 'completed',
              message: 'Guided troubleshooting completed',
            },
            null,
            2
          ),
        },
      ],
    };
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
      recommendations.push(
        'Run interactive setup (echain-qa setup) to configure project-specific QA rules'
      );
    }

    return recommendations;
  }

  async start() {
    try {
      console.error('MCP: Starting Echain QA Agent MCP Server');
      const transport = new StdioServerTransport();
      console.error('MCP: Created StdioServerTransport');
      console.error('MCP: About to connect server to transport...');
      await this.server.connect(transport);
      console.error('MCP: Server connected to transport successfully');
      console.error('MCP: Server is now running and waiting for messages...');
    } catch (error: unknown) {
      console.log('MCP: Error in start method:', error);
      console.log('MCP: Error stack:', error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('MCP: Starting server from main');
  const server = new QAAgentMCPServer();
  console.log('MCP: Server instance created');
  server.start().catch((error: unknown) => {
    console.log('MCP: Failed to start MCP server:', error);
    console.log('MCP: Error stack:', error instanceof Error ? error.stack : String(error));
    process.exit(1);
  });
}

export { QAAgentMCPServer };
