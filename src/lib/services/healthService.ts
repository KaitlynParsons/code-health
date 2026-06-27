import * as vscode from 'vscode';
import * as esbuild from 'esbuild';
import * as zlib from 'zlib';
import { AsyncResult, BundleInfo, BundleSize, ModuleNode, SmellMap } from "../../types";
import { findUnusedExports } from "../utils/findUnusedExports";
import { findUnusedImports } from "../utils/findUnusedImports";
import { findLongParamFunctions } from "../utils/findLongParamFunctions";
import { findDuplicateCode } from "../utils/findDuplicateCode";
import { findBarrelFiles } from "../utils/findBarrelFiles";
import { createProgramForRoot } from "../utils/createProgram";
import { tryAsync } from "../utils/asyncResult";
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
                  f => !f.isDeclarationFile && !program.isSourceFileFromExternalLibrary(f)
              );

              const unusedImports = findUnusedImports(program);
              const unusedExports = findUnusedExports(program, sourceFiles);
              const longParams = findLongParamFunctions(program, sourceFiles);
              const duplicates = await findDuplicateCode(folder.uri.fsPath);
              const barrels = findBarrelFiles(sourceFiles);

              codeSmells["dead"] = [...unusedExports, ...unusedImports];
              codeSmells["duplicate"] = duplicates;
              codeSmells["longParams"] = longParams;
              codeSmells["barrel"] = barrels;
            }
            return codeSmells;
        }),
    };
};

export const healthApi = createHealthApi();