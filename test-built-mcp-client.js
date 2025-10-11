#!/usr/bin/env node

// Test with the built MCP server
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Echain QA Agent MCP Server (built version)...\n');

// Start the built MCP server
const serverProcess = spawn('node', [join(__dirname, 'start-mcp-server.js')], {
  stdio: ['pipe', 'pipe', 'pipe'], // Changed from 'inherit' to 'pipe' for stderr
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

serverProcess.stderr.on('data', data => {
  console.error(`🔧 Server log: ${data.toString().trim()}`);
});

serverProcess.on('exit', code => {
  console.log(`\n🏁 Server exited with code: ${code}`);
  process.exit(0);
});

serverProcess.on('error', error => {
  console.error(`❌ Server error: ${error}`);
});

serverProcess.on('spawn', () => {
  console.log('✅ Server process spawned');
  // Send initialize message immediately
  setTimeout(() => {
    console.log('\n1️⃣ Initializing...');
    sendMessage('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'test', version: '1.0' },
    });
  }, 100);
});

setTimeout(() => {
  console.log('\n2️⃣ Listing tools...');
  sendMessage('tools/list');
}, 2000);

setTimeout(() => {
  console.log('\n🏁 Test completed, shutting down...');
  serverProcess.kill();
}, 5000);
