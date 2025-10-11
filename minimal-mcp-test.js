#!/usr/bin/env node

// Minimal MCP SDK test
console.log('Testing basic Node.js...');

try {
  console.log('Trying require...');
  const mcpSdk = require('@modelcontextprotocol/sdk');
  console.log('MCP SDK required successfully');
  console.log('Available exports:', Object.keys(mcpSdk));
} catch (error) {
  console.error('MCP SDK require failed:', error.message);
  console.error('Error stack:', error.stack);
}
