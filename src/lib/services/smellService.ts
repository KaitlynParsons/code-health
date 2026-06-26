import * as vscode from 'vscode';
import { Smell } from "../../types";
import { findUnusedExports } from "../utils/findUnusedExports";
import { findUnusedImports } from "../utils/findUnusedImports";
import { createProgramForRoot } from "../utils/createProgram";

export interface SmellApi {
  readonly deadCode: () => Smell[];
}

export const createSmellApi = (): SmellApi => {
    return {
        deadCode: () => {
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
            return deadCode;
        }
    };
};

export const smellApi = createSmellApi();