import * as vscode from 'vscode';
import * as esbuild from 'esbuild';
import * as zlib from 'zlib';
import { AsyncResult, BundleInfo, BundleSize, ModuleNode, SmellMap } from "../../types";
import { findFallowSmells } from "../utils/findFallowSmells";
import { findUnusedImports } from "../utils/findUnusedImports";
import { findLongParamFunctions } from "../utils/findLongParamFunctions";
import { findBarrelFiles } from "../utils/findBarrelFiles";
import { createProgramForRoot } from "../utils/createProgram";
import { tryAsync } from "../utils/asyncResult";
import { isInDotFolder } from "../utils/isInDotFolder";
import path from 'path';

export interface HealthApi {
  readonly internalSize: () => Promise<AsyncResult<BundleInfo>>;
  readonly codeSmells: () => Promise<AsyncResult<SmellMap>>;
}

export const createHealthApi = (): HealthApi => {
    return {
        internalSize: () => tryAsync(async () => {
            const nodes: ModuleNode[] = [];
            const total: BundleSize = { uncompressed: 0, compressed: 0 };

            for (const folder of vscode.workspace.workspaceFolders ?? []) {
                const program = createProgramForRoot(folder.uri.fsPath);
                const sourceFiles = program.getSourceFiles().filter(
                    f => !f.isDeclarationFile && !program.isSourceFileFromExternalLibrary(f)
                );

                await Promise.all(sourceFiles.map(async (sourceFile) => {
                    const fileName = vscode.workspace.asRelativePath(sourceFile.fileName);
                    const ext = path.extname(sourceFile.fileName).slice(1);
                    const loader = (ext === 'tsx' || ext === 'jsx') ? ext : ext === 'ts' ? 'ts' : 'js';
                    const { code } = await esbuild.transform(sourceFile.text, { loader, minify: true, sourcefile: fileName });
                    const uncompressed = Buffer.byteLength(code, 'utf8');
                    const compressed = zlib.gzipSync(code).byteLength;
                    total.compressed += compressed;
                    total.uncompressed += uncompressed;
                    nodes.push({ file: fileName, uncompressed, compressed });
                }));
            }

            return { internal: { nodes, total } };
        }),
        codeSmells: () => tryAsync(async () => {
          const codeSmells: SmellMap = {};
          for (const folder of vscode.workspace.workspaceFolders ?? []) {
              const program = createProgramForRoot(folder.uri.fsPath);
              const sourceFiles = program.getSourceFiles().filter(
                  f => !f.isDeclarationFile && !program.isSourceFileFromExternalLibrary(f) && !isInDotFolder(f.fileName)
              );

              const workspaceUri = folder.uri.toString();
              const [{ dead, duplicate }, longParams, barrels, unusedImports] = await Promise.all([
                  findFallowSmells(folder.uri.fsPath, workspaceUri),
                  findLongParamFunctions(folder.uri.fsPath, workspaceUri),
                  Promise.resolve(findBarrelFiles(sourceFiles, workspaceUri)),
                  Promise.resolve(findUnusedImports(program, sourceFiles, workspaceUri)),
              ]);

              codeSmells["dead"] = [...dead, ...unusedImports];
              codeSmells["duplicate"] = duplicate;
              codeSmells["longParams"] = longParams;
              codeSmells["barrel"] = barrels;
            }
            return codeSmells;
        }),
    };
};

export const healthApi = createHealthApi();