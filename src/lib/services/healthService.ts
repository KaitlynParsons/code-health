import * as vscode from 'vscode';
import * as path from 'path';
import { AsyncResult, ModuleNode, Report, Smell } from "../../types";
import { findFallowSmells } from "../utils/findFallowSmells";
import { findLongParamFunctions } from "../utils/findLongParamFunctions";
import { buildProgramContext, resolveConfigPaths } from "../utils/createProgram";
import { getBundleModules } from "../utils/getBundleModules";
import { findUnusedImports } from "../utils/findUnusedImports";
import { findBarrelFiles } from "../utils/findBarrelFiles";
import { getGitDiffPaths, isInDotFolder, tryAsync } from "../utils/helpers";

export interface HealthApi {
  readonly generateReport: (gitDiffOnly: boolean) => Promise<AsyncResult<Report>>;
  readonly invalidateCache: () => void;
}

const sumUncompressed = (nodes: ModuleNode[]): ModuleNode["uncompressed"] =>
    nodes.reduce((sum, { uncompressed }) => sum + uncompressed, 0);

type CachedResult = { smells: Report["smells"]; modules: ModuleNode[] };
const cache = new Map<string, CachedResult>();

const computeReport = async (folder: vscode.WorkspaceFolder, entry: string[]): Promise<CachedResult> => {
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

    return {
        smells: {
            dead: [...fallowResults.flatMap(r => r.dead), ...analysisResult.flatMap(r => r.unusedImports)],
            duplicate: fallowResults.flatMap(r => r.duplicate),
            longParams: longParamResults.flat(),
            barrel: analysisResult.flatMap(r => r.barrelFiles),
        },
        modules: analysisResult.flatMap(r => r.modules),
    };
};

const generateReport = async (folder: vscode.WorkspaceFolder, entry: string[]): Promise<CachedResult> => {
    const key = folder.uri.toString();
    if (!cache.has(key)) {
        cache.set(key, await computeReport(folder, entry));
    }
    return cache.get(key)!;
};

export const createHealthApi = (getFolders: () => readonly vscode.WorkspaceFolder[] | undefined): HealthApi => ({
    invalidateCache: () => cache.clear(),
    generateReport: (gitDiffOnly: boolean) => tryAsync(async () => {
        const entry: string[] = vscode.workspace.getConfiguration().get<{ entry?: string[] }>('codehealth')?.entry ?? [];
        const diffPaths = gitDiffOnly
            ? new Set((await getGitDiffPaths()).map(p => vscode.workspace.asRelativePath(p)))
            : undefined;
        const results = await Promise.all((getFolders() ?? []).map(folder => generateReport(folder, entry)));

        const smells: Report["smells"] = {
            dead: results.flatMap(r => r.smells.dead ?? []),
            duplicate: results.flatMap(r => r.smells.duplicate ?? []),
            longParams: results.flatMap(r => r.smells.longParams ?? []),
            barrel: results.flatMap(r => r.smells.barrel ?? []),
        };
        const modules = results.flatMap(r => r.modules);

        if (diffPaths) {
            const filteredModules = modules.filter(m => diffPaths.has(m.file));
            return {
                bundle: sumUncompressed(filteredModules),
                smells: Object.fromEntries(
                    Object.entries(smells).map(([key, items]) => [key, items.filter(s => diffPaths.has(s.file))])
                ),
            };
        }

        return { bundle: sumUncompressed(modules), smells };
    }),
});
