import * as vscode from 'vscode';
import * as path from 'path';
import { AsyncResult, ModuleNode, Report } from "../../types";
import { findFallowSmells } from "../utils/findFallowSmells";
import { findLongParamFunctions } from "../utils/findLongParamFunctions";
import { resolveConfigPaths } from "../utils/createProgram";
import { runAnalysis } from "../utils/runAnalysis";
import { tryAsync } from "../utils/helpers";

export interface HealthApi {
  readonly generateReport: () => Promise<AsyncResult<Report>>;
}

const sumUncompressed = (nodes: ModuleNode[]): ModuleNode["uncompressed"] =>
    nodes.reduce((sum, { uncompressed }) => sum + uncompressed, 0);

const generateReport = async (folder: vscode.WorkspaceFolder, entry: string[]): Promise<Report> => {
    const configPaths = resolveConfigPaths(folder.uri.fsPath);
    const workspaceUri = folder.uri.toString();

    // Deduplicate root directories so fallow/longParams don't run multiple times on the
    // same directory (e.g. composite tsconfig.json with all file refs in the same dir)
    const uniqueRoots = [...new Set(configPaths.map(p => path.dirname(p)))];

    const [fallowResults, longParamResults, ...analysisResult] = await Promise.all([
        Promise.all(uniqueRoots.map(rootPath => findFallowSmells(rootPath, workspaceUri, entry))),
        Promise.all(uniqueRoots.map(rootPath => findLongParamFunctions(rootPath, workspaceUri))),
        ...configPaths.map(configPath =>
            runAnalysis(configPath, path.dirname(configPath), workspaceUri, ['bundle', 'smells'])
        ),
    ]);

    const dead = fallowResults.flatMap(r => r.dead);
    const duplicate = fallowResults.flatMap(r => r.duplicate);
    const longParams = longParamResults.flat();
    const modules = analysisResult.flatMap(r => r.modules);
    const workerSmells = analysisResult.flatMap(r => r.smells);

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
        const entry: string[] = vscode.workspace.getConfiguration().get<{ entry?: string[] }>('codehealth')?.entry ?? [];
        const reports = await Promise.all((getFolders() ?? []).map(folder => generateReport(folder, entry)));
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
