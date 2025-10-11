#!/usr/bin/env node

// Test with a minimal MCP server
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing minimal MCP Server...\n');

// Start the minimal MCP server
const serverProcess = spawn('node', [join(__dirname, 'minimal-mcp-server.js')], {
  stdio: ['pipe', 'pipe', 'inherit'],
  cwd: process.cwd(),
});

let messageId = 1;

function sendMessage(method, params = {}) {
  const message = {
    jsonrpc: '2.0',
    id: messageId++,
    method,
    params,
  };

  console.log(`📤 Sending: ${method}`);
  serverProcess.stdin.write(JSON.stringify(message) + '\n');
}

let responseBuffer = '';
serverProcess.stdout.on('data', data => {
  responseBuffer += data.toString();
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || '';
  for (const line of lines) {
    if (line.trim()) {
      console.log(`📥 Received: ${line}`);
    }
  }
});

setTimeout(() => {
  console.log('\n1️⃣ Initializing...');
  sendMessage('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    clientInfo: { name: 'test', version: '1.0' },
  });
}, 500);

setTimeout(() => {
  console.log('\n🏁 Test completed, shutting down...');
  serverProcess.kill();
  process.exit(0);
}, 3000);
