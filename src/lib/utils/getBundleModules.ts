import * as path from 'path';
import * as esbuild from 'esbuild';
import ts from 'typescript';

import type { ModuleNode } from '../../types';

/**
 * Estimates the minified byte size of a single source file using esbuild's
 * transform (minify only — no bundling, no tree-shaking). The result is used
 * as a proxy for how much this file contributes to overall bundle weight.
 *
 * If the transform fails (commonly due to decorator syntax), it retries with
 * `experimentalDecorators: true` as a fallback before propagating any error.
 */
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

/**
 * Transforms all JS/TS source files in the program and returns their minified
 * byte sizes as {@link ModuleNode} entries. Declaration files and external
 * library files should be filtered out by the caller before passing `sourceFiles`.
 *
 * Files are transformed in parallel. The loader is inferred from the file
 * extension so esbuild handles each syntax variant (.tsx, .mts, .cts, etc.)
 * correctly.
 */
export const getBundleModules = (
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
