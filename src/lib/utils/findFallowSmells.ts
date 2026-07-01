import * as vscode from 'vscode';
import * as path from 'path';

import type { Smell } from '../../types';
import { spawnFallow } from './fallow';

interface FallowUnusedExport {
    path: string;
    export_name: string;
    line: number;
}

interface FallowUnresolvedImport {
    path: string;
    specifier: string;
    line: number;
}

interface FallowDeadCodeOutput {
    unused_exports?: FallowUnusedExport[];
    unresolved_imports?: FallowUnresolvedImport[];
}

interface FallowCloneInstance {
    file: string;
    start_line: number;
    end_line: number;
    fragment?: string;
}

interface FallowDupesOutput {
    clone_groups?: Array<{ instances: FallowCloneInstance[] }>;
}

const parseDeadCode = (stdout: string, rootPath: string, workspaceUri: string): Smell[] => {
    let output: FallowDeadCodeOutput;
    try {
        output = JSON.parse(stdout);
    } catch {
        return [];
    }

    const unusedExports: Smell[] = (output.unused_exports ?? []).map(({ path: filePath, export_name, line }) => ({
        file: vscode.workspace.asRelativePath(path.join(rootPath, filePath)),
        workspaceUri,
        startLine: line,
        endLine: line,
        message: `'${export_name}' is exported but never imported.`,
        size: Buffer.byteLength(export_name, 'utf8'),
        type: 'dead' as const,
    }));

    const unresolvedImports: Smell[] = (output.unresolved_imports ?? []).map(({ path: filePath, specifier, line }) => ({
        file: vscode.workspace.asRelativePath(path.join(rootPath, filePath)),
        workspaceUri,
        startLine: line,
        endLine: line,
        message: `'${specifier}' is imported but cannot be resolved.`,
        size: Buffer.byteLength(specifier, 'utf8'),
        type: 'dead' as const,
    }));

    return [...unusedExports, ...unresolvedImports];
};

const parseDuplicates = (stdout: string, rootPath: string, workspaceUri: string): Smell[] => {
    let output: FallowDupesOutput;
    try {
        output = JSON.parse(stdout);
    } catch {
        return [];
    }

    return (output.clone_groups ?? []).flatMap(({ instances }) => {
        const [primary, ...rest] = instances;
        if (!primary) { return []; }
        const others = rest.map(i => `${i.file}:${i.start_line}:${i.end_line}`).join(', ');
        return [{
            file: vscode.workspace.asRelativePath(path.join(rootPath, primary.file)),
            workspaceUri,
            startLine: primary.start_line,
            endLine: primary.end_line,
            message: `Duplicate of ${others}`,
            size: Buffer.byteLength(primary.fragment ?? '', 'utf8'),
            type: 'duplicate' as const,
        }];
    });
};

export const findFallowSmells = async (rootPath: string, workspaceUri: string): Promise<{ dead: Smell[]; duplicate: Smell[] }> => {
    const args = ['--format', 'json', '--quiet', '--no-cache', '-r', rootPath];
    const [deadStdout, dupesStdout] = await Promise.all([
        spawnFallow(['dead-code', ...args]),
        spawnFallow(['dupes', ...args]),
    ]);

    return {
        dead: parseDeadCode(deadStdout, rootPath, workspaceUri),
        duplicate: parseDuplicates(dupesStdout, rootPath, workspaceUri),
    };
};
