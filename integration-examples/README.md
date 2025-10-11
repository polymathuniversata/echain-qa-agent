# Generic MCP Client Integration

This guide provides configuration examples for integrating the QA Agent with any MCP-compatible client or tool.

## 📋 Prerequisites

- MCP-compatible client or tool
- Node.js >= 18.0.0
- QA Agent installed (globally or locally)

## 🚀 Generic MCP Configuration

### Basic Configuration

```json
{
  "mcpServers": {
    "echain-qa-agent": {
      "command": "node",
      "args": ["/path/to/echain-qa-agent/dist/mcp-server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Development Configuration

```json
{
  "mcpServers": {
    "echain-qa-agent": {
      "command": "node",
      "args": ["/path/to/echain-qa-agent/dist/mcp-server.js"],
      "env": {
        "NODE_ENV": "development",
        "QA_VERBOSE": "true",
        "QA_DRY_RUN": "false"
      }
    }
  }
}
```

## 🔧 Path Configuration

### Global Installation
```json
{
  "args": ["/usr/local/lib/node_modules/echain-qa-agent/dist/mcp-server.js"]
}
```

### Local Installation
```json
{
  "args": ["./node_modules/echain-qa-agent/dist/mcp-server.js"]
}
```

### Windows Paths
```json
{
  "args": ["C:\\path\\to\\echain-qa-agent\\dist\\mcp-server.js"]
}
```

## 📋 Supported MCP Clients

### Known Compatible Clients

- **Claude Desktop** - Anthropic's desktop application
- **VS Code Extensions** - MCP-compatible VS Code extensions
- **Cursor** - AI-first code editor
- **Windsurf** - AI-enhanced IDE
- **Custom MCP Clients** - Any client implementing MCP protocol

### Client-Specific Setup

#### Custom MCP Client
```json
{
  "mcpServers": {
    "qa-agent": {
      "command": "node",
      "args": ["/path/to/echain-qa-agent/dist/mcp-server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

#### Development Tools
```json
{
  "mcpServers": {
    "echain-qa-agent": {
      "command": "node",
      "args": ["/path/to/echain-qa-agent/dist/mcp-server.js"],
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "mcp:*",
        "QA_VERBOSE": "true"
      }
    }
  }
}
```

## 🧪 Testing MCP Integration

### Manual Testing
```bash
# Test MCP server directly
node dist/mcp-server.js

# Should wait for MCP protocol messages
```

### Client Testing
1. Configure your MCP client with the QA Agent server
2. Restart the client
3. Try using QA tools through the client's interface

## 📋 Available MCP Tools

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `run_qa_checks` | Comprehensive QA analysis | `skipLinting`, `skipTesting`, `skipBuild`, `skipSecurity`, `dryRun`, `verbose`, `projectRoot` |
| `run_linting` | Code linting checks | `autoFix`, `projectRoot` |
| `run_tests` | Test execution | `projectRoot` |
| `run_security_checks` | Security scanning | `projectRoot` |
| `run_build_checks` | Build verification | `projectRoot` |
| `get_qa_report` | Get QA reports | `projectRoot` |
| `initialize_qa_config` | Setup QA config | `projectRoot`, `interactive` |
| `setup_git_hooks` | Install git hooks | `projectRoot` |
| `get_project_analysis` | Analyze project | `projectRoot` |
| `troubleshoot_issues` | Guided troubleshooting | `projectRoot` |

## 🔧 Environment Variables

Control QA Agent behavior:

- `NODE_ENV` - Environment mode (`development`/`production`)
- `QA_VERBOSE` - Enable verbose output (`true`/`false`)
- `QA_DRY_RUN` - Simulate operations without changes (`true`/`false`)
- `DEBUG` - Enable debug logging (for MCP protocol)

## 🔍 Troubleshooting

### Connection Issues
- Verify the path to `mcp-server.js` exists
- Check file permissions
- Ensure Node.js can execute the script

### Tool Not Found
- Confirm MCP client supports the tool schema
- Check MCP server logs for errors
- Verify JSON configuration syntax

### Performance Issues
- Use specific tools instead of comprehensive checks
- Enable caching in QA configuration
- Configure appropriate timeouts

## 📚 MCP Protocol Details

### Server Capabilities
- **Tool Calling**: Execute QA operations
- **Resource Access**: Read QA reports and logs
- **Prompt Handling**: Provide QA guidance

### Message Format
The server communicates using JSON-RPC 2.0 over stdio:
- **Requests**: Tool calls, resource requests
- **Responses**: Tool results, resource content
- **Notifications**: Progress updates, status changes

## 📖 Additional Resources

- [MCP Specification](https://modelcontextprotocol.io/specification)
- [MCP SDK Documentation](https://modelcontextprotocol.io/sdk)
- [QA Agent Documentation](../../README.md)</content>
<parameter name="filePath">e:\Polymath Universata\EchainQaAgent\integration-examples\other-clients\README.md