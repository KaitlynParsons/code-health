import * as vscode from 'vscode';
import * as path from 'path';
import { AsyncResult, ModuleNode, Report } from "../../types";
import { findFallowSmells } from "../utils/findFallowSmells";
import { findLongParamFunctions } from "../utils/findLongParamFunctions";
import { resolveConfigPaths } from "../utils/createProgram";
import { runAnalysisWorker } from "../utils/runAnalysisWorker";
import { tryAsync } from "../utils/helpers";

export interface HealthApi {
  readonly generateReport: () => Promise<AsyncResult<Report>>;
}

type FolderConfig = { configPath: string; folder: vscode.WorkspaceFolder };

const toFolderConfigs = (folders: readonly vscode.WorkspaceFolder[]): FolderConfig[] =>
    folders.flatMap(folder =>
        resolveConfigPaths(folder.uri.fsPath).map(configPath => ({ configPath, folder }))
    );

const sumUncompressed = (nodes: ModuleNode[]): ModuleNode["uncompressed"] =>
    nodes.reduce((sum, { uncompressed }) => sum + uncompressed, 0);

const generateReport = async ({ configPath, folder }: FolderConfig): Promise<Report> => {
    const rootPath = path.dirname(configPath);
    const workspaceUri = folder.uri.toString();

    const [{ dead, duplicate }, longParams, { modules, smells: workerSmells }] = await Promise.all([
        findFallowSmells(rootPath, workspaceUri),
        findLongParamFunctions(rootPath, workspaceUri),
        runAnalysisWorker(configPath, rootPath, workspaceUri, ['bundle', 'smells']),
    ]);

    return {
        bundle: sumUncompressed(modules),
        smells: {
            dead: [...dead, ...workerSmells.filter(s => s.type === 'dead')],
            duplicate,
            longParams,
            barrel: workerSmells.filter(s => s.type === 'barrel'),
        },
    };
};

export const createHealthApi = (getFolders: () => readonly vscode.WorkspaceFolder[] | undefined): HealthApi => ({
    generateReport: () => tryAsync(async () => {
        const reports = await Promise.all(toFolderConfigs(getFolders() ?? []).map(generateReport));
        return reports.reduce<Report>(
            (acc, { bundle, smells }) => ({
                bundle: (acc.bundle + bundle),
                smells: {
                    dead: [...(acc.smells.dead ?? []), ...(smells.dead ?? [])],
                    duplicate: [...(acc.smells.duplicate ?? []), ...(smells.duplicate ?? [])],
                    longParams: [...(acc.smells.longParams ?? []), ...(smells.longParams ?? [])],
                    barrel: [...(acc.smells.barrel ?? []), ...(smells.barrel ?? [])],
                },
            }),
            { bundle: 0, smells: {} }
        );
    }),
});
