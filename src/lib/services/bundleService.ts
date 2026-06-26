import * as path from 'path';
import * as zlib from 'zlib';
import * as vscode from 'vscode';
import * as esbuild from 'esbuild';
import { BundleInfo, BundleSize, ModuleNode } from "../../types";
import { createProgramForRoot } from "../utils/createProgram";

export interface bundleApi {
  readonly internalSize: () => Promise<BundleInfo>;
}

export const createBundleApi = (): bundleApi => {
    return {
        internalSize: async () => {
            const nodes: ModuleNode[] = [];
            const total: BundleSize = { uncompressed: 0, compressed: 0 };
        
            for (const folder of vscode.workspace.workspaceFolders ?? []) {
                const program = createProgramForRoot(folder.uri.fsPath);
                const sourceFiles = program.getSourceFiles().filter(
                    f => !f.isDeclarationFile && !program.isSourceFileFromExternalLibrary(f)
                );
        
                await Promise.all(sourceFiles.map(async (sourceFile) => {
                    const ext = path.extname(sourceFile.fileName).slice(1);
                    const loader = (ext === 'tsx' || ext === 'jsx') ? ext : ext === 'ts' ? 'ts' : 'js';
                    const { code } = await esbuild.transform(sourceFile.text, { loader, minify: true });
                    const uncompressed = Buffer.byteLength(code, 'utf8');
                    const compressed = zlib.gzipSync(code).byteLength;
                    const fileName = vscode.workspace.asRelativePath(sourceFile.fileName);
                    total.compressed += compressed;
                    total.uncompressed += uncompressed;
                    nodes.push({ file: fileName, uncompressed, compressed });
                }));
            }
        
            return { internal: { nodes, total } };
        }
    };
};

export const bundleApi = createBundleApi();