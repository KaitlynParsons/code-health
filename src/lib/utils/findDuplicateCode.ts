import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';
import type { Smell } from '../../types';

interface JscpdFile {
    name: string;
    start: number;
    end: number;
}

interface JscpdDuplicate {
    firstFile: JscpdFile;
    secondFile: JscpdFile;
    fragment?: string;
}

interface JscpdReport {
    duplicates: JscpdDuplicate[];
}

function spawnJscpd(args: string[]): Promise<void> {
    // In the bundled extension __dirname is dist/ — node_modules is one level up
    const jscpdScript = path.join(__dirname, '..', 'node_modules', 'jscpd', 'run-jscpd.js');

    return new Promise((resolve, reject) => {
        const proc = spawn(process.execPath, [jscpdScript, ...args], { stdio: 'pipe' });
        proc.on('close', () => resolve());
        proc.on('error', reject);
    });
}

export const findDuplicateCode = async (rootPath: string): Promise<Smell[]> => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jscpd-'));

    try {
        await spawnJscpd([
            '--reporters', 'json',
            '--output', outputDir,
            '--ignore', '**/node_modules/**,**/dist/**,**/out/**',
            rootPath,
        ]);

        const reportText = await fs.readFile(path.join(outputDir, 'jscpd-report.json'), 'utf8');
        const report: JscpdReport = JSON.parse(reportText);

        return report.duplicates.map(({ firstFile, secondFile, fragment }) => ({
            file: vscode.workspace.asRelativePath(path.join(rootPath, firstFile.name)),
            startLine: firstFile.start,
            endLine: firstFile.end,
            message: `Duplicate of ${vscode.workspace.asRelativePath(path.join(rootPath, secondFile.name))}:${secondFile.start}:${secondFile.end}`,
            size: Buffer.byteLength(fragment ?? '', 'utf8'),
            type: 'duplicate' as const,
        }));
    } finally {
        await fs.rm(outputDir, { recursive: true, force: true });
    }
};
