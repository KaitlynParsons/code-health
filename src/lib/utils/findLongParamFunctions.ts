import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

import type { OxlintOutput, Smell } from '../../types';
import { isInDotFolder, tryParseJson, spawnTool } from './helpers';

export const findLongParamFunctions = async (rootPath: string, workspaceUri: string): Promise<Smell[]> => {
    const configPath = path.join(os.tmpdir(), 'code-health-oxlintrc.json');
    fs.writeFileSync(configPath, JSON.stringify({ rules: { 'max-params': ['error', { max: 4 }] } }));
    const stdout = await spawnTool('oxlint', ['-c', configPath, '--format', 'json', rootPath]);
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
