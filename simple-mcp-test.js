#!/usr/bin/env node

// Simple synchronous test
import { spawn } from 'child_process';

console.log('🧪 Testing Echain QA Agent MCP Server...\n');

// Start the server
const serverProcess = spawn('node', ['start-mcp-server.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  cwd: process.cwd(),
});

let responseBuffer = '';
serverProcess.stdout.on('data', data => {
  responseBuffer += data.toString();
  console.log('📥 Server stdout:', responseBuffer.trim());
});

// Send initialize message
const initMessage =
  JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'test', version: '1.0' },
    },
  }) + '\n';

console.log('📤 Sending initialize...');
serverProcess.stdin.write(initMessage);

serverProcess.on('error', error => {
  console.error('❌ Server process error:', error);
});

serverProcess.on('exit', code => {
  console.log(`🏁 Server exited with code: ${code}`);
});

serverProcess.on('spawn', () => {
  console.log('✅ Server process spawned successfully');
});
