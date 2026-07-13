import * as vscode from 'vscode';
import * as path from 'path';
import { AsyncResult, ModuleNode, Report, Smell } from "../../types";
import { findFallowSmells } from "../utils/findFallowSmells";
import { findLongParamFunctions } from "../utils/findLongParamFunctions";
import { buildProgramContext, resolveConfigPaths } from "../utils/createProgram";
import { getBundleModules } from "../utils/getBundleModules";
import { findUnusedImports } from "../utils/findUnusedImports";
import { findBarrelFiles } from "../utils/findBarrelFiles";
import { isInDotFolder, tryAsync } from "../utils/helpers";

export interface HealthApi {
  readonly generateReport: () => Promise<AsyncResult<Report>>;
}

const sumUncompressed = (nodes: ModuleNode[]): ModuleNode["uncompressed"] =>
    nodes.reduce((sum, { uncompressed }) => sum + uncompressed, 0);

const generateReport = async (folder: vscode.WorkspaceFolder, entry: string[]): Promise<Report> => {
    const configPaths = resolveConfigPaths(folder.uri.fsPath);
    const workspaceUri = folder.uri.toString();

    // Deduplicate root dirs so fallow/longParams don't run multiple times on the same
    // directory (e.g. composite tsconfig.json with all file refs in the same dir)
    const roots = [...new Set(configPaths.map(p => path.dirname(p)))];
    const [fallowResults, longParamResults] = await Promise.all([
        Promise.all(roots.map(rootPath => findFallowSmells(rootPath, workspaceUri, entry))),
        Promise.all(roots.map(rootPath => findLongParamFunctions(rootPath, workspaceUri))),
    ]);

    const analysisResult: { unusedImports: Smell[]; barrelFiles: Smell[]; modules: ModuleNode[] }[] = [];
    for (const configPath of configPaths) {
        const ctx = buildProgramContext(configPath, path.dirname(configPath));
        const filtered = ctx.sourceFiles.filter(f => !isInDotFolder(f.fileName));
        const [unusedImports, barrelFiles, modules] = await Promise.all([
            findUnusedImports(ctx.program, filtered, workspaceUri, ctx.toRelativePath),
            findBarrelFiles(filtered, workspaceUri, ctx.toRelativePath),
            getBundleModules(ctx.sourceFiles, ctx.experimentalDecorators, ctx.toRelativePath),
        ]);
        analysisResult.push({ unusedImports, barrelFiles, modules });
    }

    const dead = fallowResults.flatMap(r => r.dead);
    const duplicate = fallowResults.flatMap(r => r.duplicate);
    const longParams = longParamResults.flat();
    const modules = analysisResult.flatMap(r => r.modules);
    const unusedImports = analysisResult.flatMap(r => r.unusedImports);
    const barrelFiles = analysisResult.flatMap(r => r.barrelFiles);

    return {
        bundle: sumUncompressed(modules),
        smells: {
            dead: [...dead, ...unusedImports],
            duplicate,
            longParams,
            barrel: barrelFiles,
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
