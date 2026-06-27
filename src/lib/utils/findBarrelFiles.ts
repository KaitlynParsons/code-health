import * as vscode from 'vscode';
import ts from 'typescript';

import type { Smell } from '../../types';
import { getLineRange } from './getLineRange';

const MIN_REEXPORTS = 1;

export const findBarrelFiles = (sourceFiles: ts.SourceFile[]): Smell[] => {
    const results: Smell[] = [];

    for (const sourceFile of sourceFiles) {
        const statements = sourceFile.statements.filter(s => !ts.isEmptyStatement(s));

        if (statements.length === 0) { continue; }

        // A re-export is: export { X } from '...' or export * from '...'
        const reexports = statements.filter(
            stmt => ts.isExportDeclaration(stmt) && stmt.moduleSpecifier !== undefined
        );

        if (reexports.length < MIN_REEXPORTS || reexports.length !== statements.length) {
            continue;
        }

        const { startLine, endLine, text } = getLineRange(
            sourceFile,
            sourceFile.getStart(),
            sourceFile.getEnd()
        );

        results.push({
            file: vscode.workspace.asRelativePath(sourceFile.fileName),
            startLine: startLine + 1,
            endLine: endLine + 1,
            message: `Barrel file with ${reexports.length} re-exports. Barrel files degrade build performance and tree-shaking.`,
            size: Buffer.byteLength(text, 'utf8'),
            type: 'barrel'
        });
    }

    return results;
};
