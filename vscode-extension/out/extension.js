"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
function activate(context) {
    let disposable = vscode.commands.registerCommand('echain-qa-mcp.install', async () => {
        try {
            // Install the package globally
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Installing Echain QA Agent MCP Server...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: "Installing package..." });
                await execAsync('npm install -g echain-qa-agent');
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
                const result = await vscode.window.showInformationMessage('Echain QA Agent MCP Server installed successfully! Would you like to view configuration instructions?', 'Yes', 'No');
                if (result === 'Yes') {
                    const doc = await vscode.workspace.openTextDocument({
                        content: configInstructions,
                        language: 'json'
                    });
                    await vscode.window.showTextDocument(doc);
                }
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to install Echain QA Agent MCP Server: ${error}`);
        }
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map