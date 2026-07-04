import * as vscode from 'vscode';
import { AsyncResult, BundleInfo, BundleSize, ModuleNode, Smell, SmellMap } from "../../types";
import { findFallowSmells } from "../utils/findFallowSmells";
import { findLongParamFunctions } from "../utils/findLongParamFunctions";
import { resolveConfigPathsForRoot } from "../utils/createProgram";
import { runAnalysisWorker } from "../utils/runAnalysisWorker";
import { tryAsync } from "../utils/helpers";

export interface HealthApi {
  readonly internalSize: () => Promise<AsyncResult<BundleInfo>>;
  readonly codeSmells: () => Promise<AsyncResult<SmellMap>>;
}

type FolderConfig = { configPath: string; folder: vscode.WorkspaceFolder };

const toFolderConfigs = (folders: readonly vscode.WorkspaceFolder[]): FolderConfig[] =>
    folders.flatMap(folder =>
        resolveConfigPathsForRoot(folder.uri.fsPath).map(configPath => ({ configPath, folder }))
    );

const sumUncompressed = (nodes: ModuleNode[]): BundleSize =>
    nodes.reduce((sum, { uncompressed }) => ({ uncompressed: sum.uncompressed + uncompressed }), { uncompressed: 0 });

export const createHealthApi = (getFolders: () => readonly vscode.WorkspaceFolder[] | undefined): HealthApi => ({
    internalSize: () => tryAsync(async () => {
        const folderConfigs = toFolderConfigs(getFolders() ?? []);
        const moduleArrays: ModuleNode[] = [];
        for (const { configPath, folder } of folderConfigs) {
            const { modules } = await runAnalysisWorker(configPath, folder.uri.fsPath, folder.uri.toString(), ['bundle']);
            moduleArrays.push(...modules);
        }
        return { nodes: moduleArrays, total: sumUncompressed(moduleArrays) };
    }),

    codeSmells: () => tryAsync(async () => {
        const folders = getFolders() ?? [];
        let codeSmells: SmellMap = {};

        for (const folder of folders) {
            const rootPath = folder.uri.fsPath;
            const workspaceUri = folder.uri.toString();

            const [{ dead, duplicate }, longParams] = await Promise.all([
                findFallowSmells(rootPath, workspaceUri),
                findLongParamFunctions(rootPath, workspaceUri),
            ]);

            const smellArrays: Smell[] = [];
            for (const configPath of resolveConfigPathsForRoot(rootPath)) {
                const { smells } = await runAnalysisWorker(configPath, rootPath, workspaceUri, ['smells']);
                smellArrays.push(...smells);
            }

            codeSmells = {
                dead: [...dead, ...smellArrays.filter(s => s.type === 'dead')],
                duplicate,
                longParams,
                barrel: smellArrays.filter(s => s.type === 'barrel'),
            };
        }

        return codeSmells;
    }),
});
