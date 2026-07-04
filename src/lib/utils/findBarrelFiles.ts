import ts from 'typescript';

import type { Smell } from '../../types';
import { getLineRange } from './helpers';

const MIN_REEXPORTS = 1;

const getReexports = (sourceFile: ts.SourceFile): ts.Statement[] =>
    sourceFile.statements.filter(statement => !ts.isEmptyStatement(statement) && ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined);

const isBarrelFile = (sourceFile: ts.SourceFile, reexports: ts.Statement[]): boolean => {
    const statements = sourceFile.statements.filter(statement => !ts.isEmptyStatement(statement));
    return statements.length > 0 && reexports.length >= MIN_REEXPORTS && reexports.length === statements.length;
};

const toSmell = (
    sourceFile: ts.SourceFile,
    reexports: ts.Statement[],
    workspaceUri: string,
    toRelativePath: (abs: string) => string,
): Smell => {
    const { startLine, endLine, text } = getLineRange(sourceFile, sourceFile.getStart(), sourceFile.getEnd());
    return {
        file: toRelativePath(sourceFile.fileName),
        workspaceUri,
        startLine: startLine + 1,
        endLine: endLine + 1,
        message: `Barrel file with ${reexports.length} re-exports. Barrel files degrade build performance and tree-shaking.`,
        size: Buffer.byteLength(text, 'utf8'),
        type: 'barrel' as const,
    };
};

export const findBarrelFiles = (
    sourceFiles: ts.SourceFile[],
    workspaceUri: string,
    toRelativePath: (abs: string) => string,
): Smell[] =>
    sourceFiles
        .map(sourceFile => ({ sourceFile, reexports: getReexports(sourceFile) }))
        .filter(({ sourceFile, reexports }) => isBarrelFile(sourceFile, reexports))
        .map(({ sourceFile, reexports }) => toSmell(sourceFile, reexports, workspaceUri, toRelativePath));
