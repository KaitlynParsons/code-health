import * as path from 'path';
import { spawn } from 'child_process';

export interface OxlintSpan {
    offset: number;
    length: number;
    line: number;
    column: number;
}

export interface OxlintDiagnostic {
    message: string;
    code: string;
    filename: string;
    labels: Array<{ label: string; span: OxlintSpan }>;
}

export interface OxlintOutput {
    diagnostics: OxlintDiagnostic[];
}

const oxlintBin = path.join(__dirname, '..', 'node_modules', 'oxlint', 'bin', 'oxlint');

export const spawnOxlint = (args: string[]): Promise<string> => {
    return new Promise((resolve, reject) => {
        let stdout = '';
        const proc = spawn(process.execPath, [oxlintBin, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
        proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
        proc.on('close', () => resolve(stdout));
        proc.on('error', reject);
    });
};
