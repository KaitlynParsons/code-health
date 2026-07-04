import ts from 'typescript';

import type { Smell, Step } from '../../types';
import { isInDotFolder, trampoline } from './helpers';

const UNUSED_LOCAL = 6133;

function nodeAtPosition(sourceFile: ts.SourceFile, position: number): ts.Node | undefined {
    const visit = (node: ts.Node): ts.Node | undefined => {
        if (position >= node.getStart(sourceFile) && position < node.getEnd()) {
            return ts.forEachChild(node, visit) ?? node;
        }
    };
    return visit(sourceFile);
}

const isInsideImportStep = (node: ts.Node): Step<boolean> =>
    ts.isImportDeclaration(node) || (node.parent ? () => isInsideImportStep(node.parent) : false);
const isInsideImport = trampoline(isInsideImportStep);

const toSmell = (
    sourceFile: ts.SourceFile,
    diagnostic: ts.Diagnostic,
    workspaceUri: string,
    toRelativePath: (abs: string) => string,
): Smell => {
    const line = sourceFile.getLineAndCharacterOfPosition(diagnostic.start!).line + 1;
    return {
        file: toRelativePath(sourceFile.fileName),
        workspaceUri,
        startLine: line,
        endLine: line,
        message: typeof diagnostic.messageText === 'string' ? diagnostic.messageText : diagnostic.messageText.messageText,
        size: diagnostic.length ?? 0,
        type: 'dead' as const,
    };
};

export const findUnusedImports = (
    program: ts.Program,
    sourceFiles: readonly ts.SourceFile[],
    workspaceUri: string,
    toRelativePath: (abs: string) => string,
): Smell[] =>
    sourceFiles
        .filter(sourceFile => !isInDotFolder(sourceFile.fileName))
        .flatMap(sourceFile =>
            program.getSemanticDiagnostics(sourceFile)
                .filter(diagnostic => diagnostic.code === UNUSED_LOCAL && diagnostic.start !== undefined)
                .filter(diagnostic => {
                    const node = nodeAtPosition(sourceFile, diagnostic.start!);
                    return node && isInsideImport(node);
                })
                .map(diagnostic => toSmell(sourceFile, diagnostic, workspaceUri, toRelativePath)),
        );
