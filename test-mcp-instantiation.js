#!/usr/bin/env node

// Simple test to check if MCP server can be imported and instantiated
console.log('Testing MCP SDK import...');

try {
  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
  console.log('✅ MCP SDK imported successfully');

  console.log('Testing MCP server class import...');
  const { QAAgentMCPServer } = await import('./dist/mcp-server.js');
  console.log('✅ MCP server class imported successfully');

  console.log('Testing MCP server instantiation...');
  const server = new QAAgentMCPServer();
  console.log('✅ MCP server instantiated successfully');
} catch (error) {
  console.error('❌ Failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
