import * as path from 'path';
import * as esbuild from 'esbuild';
import ts from 'typescript';

import { createProgramFromConfig } from './createProgram';
import { findUnusedImports } from './findUnusedImports';
import { findBarrelFiles } from './findBarrelFiles';
import { isInDotFolder } from './helpers';
import type { Smell, ModuleNode } from '../../types';

type WorkerTask = 'smells' | 'bundle';

interface WorkerResult {
    smells: Smell[];
    modules: ModuleNode[];
}

const getSmells = (
    program: ts.Program,
    sourceFiles: ts.SourceFile[],
    workspaceUri: string,
    toRelativePath: (abs: string) => string,
): Smell[] => [
    ...findUnusedImports(program, sourceFiles.filter(f => !isInDotFolder(f.fileName)), workspaceUri, toRelativePath),
    ...findBarrelFiles(sourceFiles.filter(f => !isInDotFolder(f.fileName)), workspaceUri, toRelativePath),
];

const transformModule = async (
    sourceFile: ts.SourceFile,
    fileName: string,
    loader: esbuild.Loader,
    experimentalDecorators: boolean | undefined,
): Promise<ModuleNode> => {
    const opts = (decorators: boolean | undefined): esbuild.TransformOptions => ({
        loader, minify: true, sourcefile: fileName,
        tsconfigRaw: { compilerOptions: { experimentalDecorators: decorators } },
    });
    try {
        const { code } = await esbuild.transform(sourceFile.text, opts(experimentalDecorators));
        return { file: fileName, uncompressed: Buffer.byteLength(code, 'utf8') };
    } catch {
        const { code } = await esbuild.transform(sourceFile.text, opts(true));
        return { file: fileName, uncompressed: Buffer.byteLength(code, 'utf8') };
    }
};

const getBundleModules = (
    sourceFiles: ts.SourceFile[],
    experimentalDecorators: boolean | undefined,
    toRelativePath: (abs: string) => string,
): Promise<ModuleNode[]> => Promise.all(
    sourceFiles
        .filter(f => /\.[cm]?[jt]sx?$/.test(f.fileName)) // .js .jsx .ts .tsx .mjs .mts .cjs .cts
        .map(f => {
            const fileName = toRelativePath(f.fileName);
            const extension = path.extname(f.fileName).slice(1);
            const loader = (extension === 'tsx' || extension === 'jsx') ? extension
                : (extension === 'ts' || extension === 'cts' || extension === 'mts') ? 'ts' : 'js';
            return transformModule(f, fileName, loader as esbuild.Loader, experimentalDecorators);
        })
);

export const runAnalysis = async (
    configPath: string,
    rootPath: string,
    workspaceUri: string,
    tasks: WorkerTask[],
): Promise<WorkerResult> => {
    const toRelativePath = (abs: string) => path.relative(rootPath, abs);
    const program = createProgramFromConfig(configPath);
    const sourceFiles = program.getSourceFiles().filter(
        f => !f.isDeclarationFile && !program.isSourceFileFromExternalLibrary(f)
    );
    const { experimentalDecorators } = program.getCompilerOptions();

    const [smells, modules] = await Promise.all([
        tasks.includes('smells')
            ? getSmells(program, sourceFiles, workspaceUri, toRelativePath)
            : [],
        tasks.includes('bundle')
            ? getBundleModules(sourceFiles, experimentalDecorators, toRelativePath)
            : [],
    ]);

    return { smells, modules };
};
