import * as vscode from 'vscode';

import type { OxlintOutput, Smell } from '../../types';
import { isInDotFolder, tryParseJson, spawnTool } from './helpers';

export const findLongParamFunctions = async (rootPath: string, workspaceUri: string): Promise<Smell[]> => {
    const stdout = await spawnTool('oxlint', ['-A', 'all', '-D', 'max-params', '--format', 'json', rootPath]);
    return (tryParseJson<OxlintOutput>(stdout)?.diagnostics ?? [])
        .filter(({ code, filename }) => code === 'eslint(max-params)' && !isInDotFolder(filename))
        .flatMap(({ labels, filename, message }) => labels[0]?.span ? [{
            file: vscode.workspace.asRelativePath(filename),
            workspaceUri,
            startLine: labels[0].span.line,
            endLine: labels[0].span.line,
            message: message,
            size: labels[0].span.length,
            type: 'longParams' as const,
        }] : []);
};
