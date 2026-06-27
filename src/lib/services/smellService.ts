import * as vscode from 'vscode';
import { AsyncResult, Smell } from "../../types";
import { findUnusedExports } from "../utils/findUnusedExports";
import { findUnusedImports } from "../utils/findUnusedImports";
import { createProgramForRoot } from "../utils/createProgram";
import { tryAsync } from "../utils/asyncResult";

export interface SmellApi {
  readonly deadCode: () => Promise<AsyncResult<Smell[]>>;
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
        })
    };
};

export const smellApi = createSmellApi();