import * as path from 'path';
import ts from 'typescript';

export const createProgramForRoot = (rootPath: string): ts.Program => {
	const configPath =
		ts.findConfigFile(rootPath, ts.sys.fileExists, 'tsconfig.json') ??
		ts.findConfigFile(rootPath, ts.sys.fileExists, 'jsconfig.json');

	let fileNames: string[];
	let baseOptions: ts.CompilerOptions;

	if (configPath) {
		const raw = ts.readConfigFile(configPath, ts.sys.readFile);
		const parsed = ts.parseJsonConfigFileContent(raw.config, ts.sys, path.dirname(configPath));
		fileNames = parsed.fileNames;
		baseOptions = parsed.options;
	} else {
		fileNames = [];
		baseOptions = {};
	}

	return ts.createProgram(fileNames, {
		...baseOptions,
		allowJs: true,
		checkJs: true,
		noUnusedLocals: true,
		noUnusedParameters: true,
	});
};
