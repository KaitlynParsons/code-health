import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AppMessage, createMessageApi, handleMessage } from './lib/services/messageService';
import { createHealthApi } from './lib/services/healthService';

class CodeHealthViewProvider implements vscode.WebviewViewProvider {
	constructor(private readonly extensionUri: vscode.Uri) {}

	resolveWebviewView(webviewView: vscode.WebviewView) {
		const mediaUri = vscode.Uri.joinPath(this.extensionUri, 'media');
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [mediaUri],
		};

		const scriptUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'index.js'));
		const iconUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'activitybar-icon.png'));
		const stylesheetUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'index.css'));
		const htmlPath = path.join(this.extensionUri.fsPath, 'media', 'index.html');
		webviewView.webview.html = fs.readFileSync(htmlPath, 'utf8')
			.replace('{{webviewScript}}', scriptUri.toString())
			.replace('{{iconUri}}', iconUri.toString())
			.replace('{{stylesheet}}', stylesheetUri.toString());

		const messageApi = createMessageApi(webviewView.webview, createHealthApi(() => vscode.workspace.workspaceFolders));
		webviewView.webview.onDidReceiveMessage((message: AppMessage) => {
			handleMessage(message, messageApi).catch(err => {
				vscode.window.showErrorMessage(`Code Health: ${err instanceof Error ? err.message : String(err)}`);
			});
		});
	}
}

export function activate(context: vscode.ExtensionContext) {
	const provider = new CodeHealthViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('code-health-sidebar', provider)
	);
}

export function deactivate() {}
