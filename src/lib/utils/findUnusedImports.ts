import * as vscode from 'vscode';
import ts from 'typescript';

import type { Smell } from '../../types';
import { getLineRange } from './getLineRange';

export const findUnusedImports = (program: ts.Program): Smell[] => {
	const results: Smell[] = [];
		for (const diag of ts.getPreEmitDiagnostics(program)) {
			if ((diag.code === 6133 || diag.code === 6196) && diag.file && diag.start !== undefined) {
				const { startLine, endLine, text } = getLineRange(diag.file, diag.start, diag.start);
				results.push({
					file: vscode.workspace.asRelativePath(diag.file.fileName),
					startLine: startLine + 1,
					endLine: endLine + 1,
					message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
					size: Buffer.byteLength(text, 'utf8'),
					type: "dead"
				});
			}
		}
	return results;
};