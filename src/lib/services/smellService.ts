import * as vscode from 'vscode';
import { AsyncResult, Smell } from "../../types";
import { findUnusedExports } from "../utils/findUnusedExports";
import { findUnusedImports } from "../utils/findUnusedImports";
import { findLongParamFunctions } from "../utils/findLongParamFunctions";
import { createProgramForRoot } from "../utils/createProgram";
import { tryAsync } from "../utils/asyncResult";

export interface SmellApi {
  readonly deadCode: () => Promise<AsyncResult<Smell[]>>;
  readonly longParams: () => Promise<AsyncResult<Smell[]>>;
}

export const createSmellApi = (): SmellApi => {
    return {
        deadCode: () => tryAsync(() => {
          const deadCode: Smell[] = [];
          for (const folder of vscode.workspace.workspaceFolders ?? []) {
              const program = createProgramForRoot(folder.uri.fsPath);
              const sourceFiles = program.getSourceFiles().filter(
                  f => !f.isDeclarationFile && !program.isSourceFileFromExternalLibrary(f)
              );

              const unusedImports = findUnusedImports(program);
              const unusedExports = findUnusedExports(program, sourceFiles);
              deadCode.push(...unusedExports, ...unusedImports);
            }
            return Promise.resolve(deadCode);
        }),
        longParams: () => tryAsync(() => {
            const results: Smell[] = [];
            for (const folder of vscode.workspace.workspaceFolders ?? []) {
                const program = createProgramForRoot(folder.uri.fsPath);
                const sourceFiles = program.getSourceFiles().filter(
                    f => !f.isDeclarationFile && !program.isSourceFileFromExternalLibrary(f)
                );
                results.push(...findLongParamFunctions(program, sourceFiles));
            }
            return Promise.resolve(results);
        }),
    };
};

export const smellApi = createSmellApi();