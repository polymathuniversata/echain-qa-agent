#!/usr/bin/env node

// Explicit wrapper to start the MCP server
import { QAAgentMCPServer } from './dist/mcp-server.js';

async function main() {
  console.log('MCP: Wrapper starting...');
  const server = new QAAgentMCPServer();
  console.log('MCP: Wrapper created server instance');
  await server.start();
  console.log('MCP: Wrapper started server');
}

main().catch(error => {
  console.error('MCP: Wrapper error:', error);
  process.exit(1);
});
