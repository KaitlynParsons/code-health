import * as path from 'path';
import ts from 'typescript';

interface ProgramContext {
    program: ts.Program;
    sourceFiles: ts.SourceFile[];
    experimentalDecorators: boolean | undefined;
    toRelativePath: (abs: string) => string;
}

const createProgramFromConfig = (configPath: string): ts.Program => {
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

export const buildProgramContext = (configPath: string, rootPath: string): ProgramContext => {
    const program = createProgramFromConfig(configPath);
    const sourceFiles = program.getSourceFiles().filter(
        f => !f.isDeclarationFile && !program.isSourceFileFromExternalLibrary(f)
    );
    const { experimentalDecorators } = program.getCompilerOptions();
    const toRelativePath = (abs: string) => path.relative(rootPath, abs);
    return { program, sourceFiles, experimentalDecorators, toRelativePath };
};

export const resolveConfigPaths = (rootPath: string): string[] => {
	const rootConfig =
		ts.findConfigFile(rootPath, ts.sys.fileExists, 'tsconfig.json') ??
		ts.findConfigFile(rootPath, ts.sys.fileExists, 'jsconfig.json');

	if (!rootConfig) {
		// No root tsconfig — monorepo with tsconfigs only inside packages
		const allFiles = ts.sys.readDirectory(rootPath, ['.json'], ['node_modules', '.git']);
		return allFiles.filter(f => path.basename(f) === 'tsconfig.json');
	}

	const raw = ts.readConfigFile(rootConfig, ts.sys.readFile);
	const references: Array<{ path: string }> = raw.config?.references ?? [];

	return references.length > 0 ? references.flatMap(ref => {
		const refPath = path.resolve(path.dirname(rootConfig), ref.path);
		if (ref.path.endsWith('.json')) {
			return ts.sys.fileExists(refPath) ? [refPath] : [];
		}
		const refConfig = ts.findConfigFile(refPath, ts.sys.fileExists, 'tsconfig.json');
		return refConfig ? [refConfig] : [];
	}) : [rootConfig];
};
