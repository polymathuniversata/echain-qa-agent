import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('echain-qa-mcp.install', async () => {
        try {
            // Install the package globally
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Installing Echain QA Agent MCP Server...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: "Installing package..." });
                await execAsync('npm install -g @echain/qa-mcp-server');
                progress.report({ increment: 50, message: "Package installed. Configuring..." });
                
                // Show configuration instructions
                const configInstructions = `
To use the Echain QA Agent MCP Server, add the following to your MCP client configuration (e.g., Claude Desktop):

{
  "mcpServers": {
    "echain-qa": {
      "command": "echain-qa-mcp",
      "args": []
    }
  }
}

For more information, visit: https://github.com/polymathuniversata/echain-qa-agent
                `;
                
                progress.report({ increment: 100, message: "Configuration ready." });
                
                const result = await vscode.window.showInformationMessage(
                    'Echain QA Agent MCP Server installed successfully! Would you like to view configuration instructions?',
                    'Yes', 'No'
                );
                
                if (result === 'Yes') {
                    const doc = await vscode.workspace.openTextDocument({
                        content: configInstructions,
                        language: 'json'
                    });
                    await vscode.window.showTextDocument(doc);
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to install Echain QA Agent MCP Server: ${error}`);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}