import * as vscode from 'vscode';
import ts from 'typescript';

import type { Smell } from '../../types';
import { isInDotFolder } from './isInDotFolder';

const UNUSED_LOCAL = 6133;

function nodeAtPosition(sourceFile: ts.SourceFile, position: number): ts.Node | undefined {
    const visit = (node: ts.Node): ts.Node | undefined => {
        if (position >= node.getStart(sourceFile) && position < node.getEnd()) {
            return ts.forEachChild(node, visit) ?? node;
        }
    };
    return visit(sourceFile);
}

function isInsideImport(node: ts.Node): boolean {
    let current: ts.Node | undefined = node;
    while (current) {
        if (ts.isImportDeclaration(current)) { return true; }
        current = current.parent;
    }
    return false;
}

export const findUnusedImports = (program: ts.Program, sourceFiles: readonly ts.SourceFile[], workspaceUri: string): Smell[] => {
    const results: Smell[] = [];

    for (const sourceFile of sourceFiles) {
        if (isInDotFolder(sourceFile.fileName)) { continue; }

        for (const diag of program.getSemanticDiagnostics(sourceFile)) {
            if (diag.code !== UNUSED_LOCAL || diag.start === undefined) { continue; }

            const node = nodeAtPosition(sourceFile, diag.start);
            if (!node || !isInsideImport(node)) { continue; }

            const { line } = sourceFile.getLineAndCharacterOfPosition(diag.start);
            const message = typeof diag.messageText === 'string'
                ? diag.messageText
                : diag.messageText.messageText;

            results.push({
                file: vscode.workspace.asRelativePath(sourceFile.fileName),
                workspaceUri,
                startLine: line + 1,
                endLine: line + 1,
                message,
                size: diag.length ?? 0,
                type: 'dead' as const,
            });
        }
    }

    return results;
};
