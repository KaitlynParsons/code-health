import * as vscode from 'vscode';
import * as path from 'path';

import type { Smell } from '../../types';
import { tryParseJson, spawnTool } from './helpers';

interface FallowDeadCodeOutput {
    unused_exports?: {
        path: string;
        export_name: string;
        line: number;
    }[];
    unresolved_imports?: {
        path: string;
        specifier: string;
        line: number;
    }[];
}

interface FallowDupesOutput {
    clone_groups?: Array<{ 
        instances: {
            file: string;
            start_line: number;
            end_line: number;
            fragment?: string;
        }[] 
    }>;
}

const parseDeadCode = (stdout: string, rootPath: string, workspaceUri: string): Smell[] =>
    ((output) => [
        ...(output?.unused_exports ?? []).map(({ path: filePath, export_name, line }) => ({
            file: vscode.workspace.asRelativePath(path.join(rootPath, filePath)),
            workspaceUri,
            startLine: line,
            endLine: line,
            message: `'${export_name}' is exported but never imported.`,
            size: Buffer.byteLength(export_name, 'utf8'),
            type: 'dead' as const,
        })),
        ...(output?.unresolved_imports ?? []).map(({ path: filePath, specifier, line }) => ({
            file: vscode.workspace.asRelativePath(path.join(rootPath, filePath)),
            workspaceUri,
            startLine: line,
            endLine: line,
            message: `'${specifier}' is imported but cannot be resolved.`,
            size: Buffer.byteLength(specifier, 'utf8'),
            type: 'dead' as const,
        })),
    ])(tryParseJson<FallowDeadCodeOutput>(stdout));

const parseDuplicates = (stdout: string, rootPath: string, workspaceUri: string): Smell[] =>
    (tryParseJson<FallowDupesOutput>(stdout)?.clone_groups ?? []).flatMap(({ instances: [primary, ...rest] }) =>
        primary ? [{
            file: vscode.workspace.asRelativePath(path.join(rootPath, primary.file)),
            workspaceUri,
            startLine: primary.start_line,
            endLine: primary.end_line,
            message: `Duplicate of ${rest.map(i => `${i.file}:${i.start_line}:${i.end_line}`).join(', ')}`,
            size: Buffer.byteLength(primary.fragment ?? '', 'utf8'),
            type: 'duplicate' as const,
        }] : [],
    );

export const findFallowSmells = async (rootPath: string, workspaceUri: string): Promise<{ dead: Smell[]; duplicate: Smell[] }> => {
    const args = ['--format', 'json', '--quiet', '--no-cache', '-r', rootPath];
    const [deadStdout, dupesStdout] = await Promise.all([
        spawnTool('fallow', ['dead-code', ...args]),
        spawnTool('fallow', ['dupes', ...args]),
    ]);

    return {
        dead: parseDeadCode(deadStdout, rootPath, workspaceUri),
        duplicate: parseDuplicates(dupesStdout, rootPath, workspaceUri),
    };
};
