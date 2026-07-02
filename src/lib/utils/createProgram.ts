import * as path from 'path';
import ts from 'typescript';

export const createProgramFromConfig = (configPath: string): ts.Program => {
	const raw = ts.readConfigFile(configPath, ts.sys.readFile);
	const parsed = ts.parseJsonConfigFileContent(raw.config, ts.sys, path.dirname(configPath));
	return ts.createProgram(parsed.fileNames, {
		...parsed.options,
		allowJs: true,
		checkJs: true,
		noUnusedLocals: true,
		noUnusedParameters: true,
	});
};

const resolveConfigPaths = (rootPath: string): string[] => {
	const rootConfig =
		ts.findConfigFile(rootPath, ts.sys.fileExists, 'tsconfig.json') ??
		ts.findConfigFile(rootPath, ts.sys.fileExists, 'jsconfig.json');

	if (rootConfig) {
		const raw = ts.readConfigFile(rootConfig, ts.sys.readFile);
		const references: Array<{ path: string }> = raw.config?.references ?? [];
		if (references.length > 0) {
			return references.flatMap(ref => {
				const refDir = path.resolve(path.dirname(rootConfig), ref.path);
				const refConfig = ts.findConfigFile(refDir, ts.sys.fileExists, 'tsconfig.json');
				return refConfig ? [refConfig] : [];
			});
		}
		return [rootConfig];
	}

	// No root tsconfig — monorepo with tsconfigs only inside packages
	const allFiles = ts.sys.readDirectory(rootPath, ['.json'], ['node_modules', '.git']);
	return allFiles.filter(f => path.basename(f) === 'tsconfig.json');
};

export const resolveConfigPathsForRoot = (rootPath: string): string[] =>
	resolveConfigPaths(rootPath);
