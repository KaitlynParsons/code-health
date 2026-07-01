import * as path from 'path';
import { spawn } from 'child_process';

const fallowBin = path.join(__dirname, '..', 'node_modules', 'fallow', 'bin', 'fallow');

export const spawnFallow = (args: string[]): Promise<string> => {
    return new Promise((resolve, reject) => {
        let stdout = '';
        const proc = spawn(process.execPath, [fallowBin, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
        proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
        proc.on('close', () => resolve(stdout));
        proc.on('error', reject);
    });
};
