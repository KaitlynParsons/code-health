import * as vscode from 'vscode';

import type { Smell } from '../../types';
import { isInDotFolder } from './isInDotFolder';
import { spawnOxlint, type OxlintOutput } from './oxlint';

export const findLongParamFunctions = async (rootPath: string, workspaceUri: string): Promise<Smell[]> => {
    const stdout = await spawnOxlint([
        '-A', 'all',
        '-D', 'max-params',
        '--format', 'json',
        rootPath,
    ]);

    let output: OxlintOutput;
    try {
        output = JSON.parse(stdout);
    } catch {
        return [];
    }

    return output.diagnostics
        .filter(d => d.code === 'eslint(max-params)' && !isInDotFolder(d.filename))
        .flatMap(d => {
            const span = d.labels[0]?.span;
            if (!span) { return []; }
            return [{
                file: vscode.workspace.asRelativePath(d.filename),
                workspaceUri,
                startLine: span.line,
                endLine: span.line,
                message: d.message,
                size: span.length,
                type: 'longParams' as const,
            }];
        });
};
