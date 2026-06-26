import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { bundleApi } from './lib/services/bundleService';
import { smellApi } from './lib/services/smellService';

class CodeHealthViewProvider implements vscode.WebviewViewProvider {
	constructor(private readonly extensionUri: vscode.Uri) {}

	resolveWebviewView(webviewView: vscode.WebviewView) {
		const mediaUri = vscode.Uri.joinPath(this.extensionUri, 'media');
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [mediaUri],
		};

		const scriptUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'webview.js'));
		const iconUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'icon.svg'));
		const stylesheetUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'index.css'));
		const htmlPath = path.join(this.extensionUri.fsPath, 'media', 'index.html');
		webviewView.webview.html = fs.readFileSync(htmlPath, 'utf8')
			.replace('{{webviewScript}}', scriptUri.toString())
			.replace('{{iconUri}}', iconUri.toString())
			.replace('{{stylesheet}}', stylesheetUri.toString());

		webviewView.webview.onDidReceiveMessage(async message => {
			if (message.type === 'ready') {
				webviewView.webview.postMessage({
					type: 'results',
					data: {
						bundle: {
							internal: (await bundleApi.internalSize()).internal,
						},
						smells: [
							...smellApi.deadCode()
						],
					},
				});
			}
		});
	}
}

export function activate(context: vscode.ExtensionContext) {
	const provider = new CodeHealthViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('code-health.view', provider)
	);
}

export function deactivate() {}
