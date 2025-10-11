#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  InitializeRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { QAAgent } from './dist/qa-agent.js';

console.error('MINIMAL MCP: Starting server with QAAgent');

const qaAgent = new QAAgent();
console.error('MINIMAL MCP: QAAgent created');

const server = new Server({
  name: 'minimal-server',
  version: '1.0.0',
});

server.setRequestHandler(InitializeRequestSchema, async request => {
  console.error('MINIMAL MCP: Handling initialize');
  return {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: { listChanged: true },
    },
    serverInfo: {
      name: 'minimal-server',
      version: '1.0.0',
    },
  };
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('MINIMAL MCP: Handling list_tools');
  return {
    tools: [
      {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('MINIMAL MCP: Server connected');
