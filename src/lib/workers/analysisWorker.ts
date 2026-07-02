import { workerData, parentPort } from 'worker_threads';
import * as path from 'path';
import * as esbuild from 'esbuild';


import { createProgramFromConfig } from '../utils/createProgram';
import { findUnusedImports } from '../utils/findUnusedImports';
import { findBarrelFiles } from '../utils/findBarrelFiles';
import { isInDotFolder } from '../utils/isInDotFolder';
import type { Smell } from '../../types';

interface WorkerInput {
    configPath: string;
    rootPath: string;
    workspaceUri: string;
    tasks: ('smells' | 'bundle')[];
}

const { configPath, rootPath, workspaceUri, tasks } = workerData as WorkerInput;

const toRelativePath = (abs: string) => path.relative(rootPath, abs);

const run = async () => {
    const program = createProgramFromConfig(configPath);
    const sourceFiles = program.getSourceFiles().filter(
        f => !f.isDeclarationFile && !program.isSourceFileFromExternalLibrary(f)
    );

    if (tasks.includes('smells')) {
        const files = sourceFiles.filter(f => !isInDotFolder(f.fileName));
        const smells: Smell[] = [
            ...findUnusedImports(program, files, workspaceUri, toRelativePath),
            ...findBarrelFiles(files, workspaceUri, toRelativePath),
        ];
        if (smells.length > 0) {
            parentPort?.postMessage({ type: 'smells', items: smells });
        }
    }

    if (tasks.includes('bundle')) {
        const { experimentalDecorators } = program.getCompilerOptions();
        for (const sourceFile of sourceFiles) {
            if (!/\.[cm]?[jt]sx?$/.test(sourceFile.fileName)) { continue; }
            const fileName = toRelativePath(sourceFile.fileName);
            const ext = path.extname(sourceFile.fileName).slice(1);
            const loader = (ext === 'tsx' || ext === 'jsx') ? ext : (ext === 'ts' || ext === 'cts' || ext === 'mts') ? 'ts' : 'js';
            let code: string;
            try {
                ({ code } = await esbuild.transform(sourceFile.text, {
                    loader,
                    minify: true,
                    sourcefile: fileName,
                    tsconfigRaw: { compilerOptions: { experimentalDecorators } },
                }));
            } catch {
                try {
                    ({ code } = await esbuild.transform(sourceFile.text, {
                        loader,
                        minify: true,
                        sourcefile: fileName,
                        tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
                    }));
                } catch (err) {
                    throw new Error(`esbuild failed to parse ${fileName}: ${err}`);
                }
            }
            const uncompressed = Buffer.byteLength(code, 'utf8');
            parentPort?.postMessage({ type: 'module', file: fileName, uncompressed });
        }
    }

    parentPort?.postMessage({ type: 'done' });
};

run().catch(err => {
    parentPort?.postMessage({ type: 'error', message: String(err) });
    process.exit(1);
});
