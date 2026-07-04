import ts from 'typescript';
import * as path from 'path';
import { spawn } from 'child_process';
import { AsyncResult, Step } from '../../types';

const getLineEnd = (sourceFile: ts.SourceFile, endLine: number): number => {
	const lineStarts = sourceFile.getLineStarts();
	return endLine + 1 < lineStarts.length ? lineStarts[endLine + 1] : sourceFile.text.length;
};

export const getLineRange = (
	sourceFile: ts.SourceFile,
	startPos: number,
	endPos: number,
): { startLine: number; endLine: number; text: string } => {
	const startLine = sourceFile.getLineAndCharacterOfPosition(startPos).line;
	const endLine = sourceFile.getLineAndCharacterOfPosition(endPos).line;
	return {
		startLine,
		endLine,
		text: sourceFile.text.slice(sourceFile.getLineStarts()[startLine], getLineEnd(sourceFile, endLine)),
	};
};

export const trampoline = <A extends unknown[], T>(
    fn: (...args: A) => Step<T>,
) => (...args: A): T => {
    let current: Step<T> = fn(...args);
    while (typeof current === 'function') { current = (current as () => Step<T>)(); }
    return current as T;
};

export const tryAsync = async <T>(fn: () => Promise<T>): Promise<AsyncResult<T>> => {
	try {
		const data = await fn();
		return { state: "success", data };
	} catch (error) {
		return { state: "error", error: error instanceof Error ? error.message : String(error) };
	}
};

export const tryParseJson = <T>(json: string): T | null => {
    try {
        return JSON.parse(json) as T;
    }
    catch {
        return null;
    }
};

export const isInDotFolder = (filePath: string): boolean =>
    filePath.split(/[\\/]/).some(s => s.startsWith('.') && s.length > 1 && s !== '..');

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
