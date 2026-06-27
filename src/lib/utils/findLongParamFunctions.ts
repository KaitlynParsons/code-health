import * as vscode from 'vscode';
import ts from 'typescript';

import type { Smell } from '../../types';
import { getLineRange } from './getLineRange';

const MAX_PARAMS = 3;

const isFunctionLike = (node: ts.Node): node is ts.FunctionLikeDeclaration =>
    ts.isFunctionDeclaration(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node);

export const findLongParamFunctions = (
    program: ts.Program,
    sourceFiles: readonly ts.SourceFile[]
): Smell[] => {
    const results: Smell[] = [];

    for (const sourceFile of sourceFiles) {
        const visit = (node: ts.Node) => {
            if (isFunctionLike(node) && node.parameters.length > MAX_PARAMS) {
                const start = node.getStart(sourceFile);
                const end = node.getEnd();
                const { startLine, endLine, text } = getLineRange(sourceFile, start, end);
                const name = ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)
                    ? node.name?.getText(sourceFile) ?? '<anonymous>'
                    : '<anonymous>';
                results.push({
                    file: vscode.workspace.asRelativePath(sourceFile.fileName),
                    startLine: startLine + 1,
                    endLine: endLine + 1,
                    message: `Function '${name}' has ${node.parameters.length} parameters (max ${MAX_PARAMS}).`,
                    size: Buffer.byteLength(text, 'utf8'),
                    type: 'longParams',
                });
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
    }

    return results;
};
