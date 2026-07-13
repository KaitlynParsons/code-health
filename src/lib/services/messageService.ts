import * as vscode from 'vscode';
import { HealthApi } from './healthService';

export type AppMessage =
	| { type: 'openFile'; workspaceUri: string; file: string; line: number }
	| { type: 'ready' };

interface MessageApi {
	readonly openFile: (message: { workspaceUri: string, file: string, line: number }) => Promise<void>;
	readonly ready: () => Promise<void>;
}

export const createMessageApi = (webview: vscode.Webview, healthApi: HealthApi): MessageApi => {
	const postResults = async () => {
		webview.postMessage({ type: 'results', data: { state: 'loading' } });
		const report = await healthApi.generateReport();
		webview.postMessage({ type: 'results', data: report });
	};

	return {
		openFile: async ({ workspaceUri, file, line }) => {
			const uri = vscode.Uri.joinPath(vscode.Uri.parse(workspaceUri), file);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc, {
				selection: new vscode.Range(line - 1, 0, line - 1, 0),
			});
		},

		ready: postResults,
	};
};

export const handleMessage = (message: AppMessage, api: MessageApi): Promise<void> => {
	switch (message.type) {
		case 'openFile': return api.openFile(message);
		case 'ready': return api.ready();
	}
};
