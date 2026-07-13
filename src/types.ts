type SmellType = "dead" | "duplicate" | "longParams" | "barrel";
type File = string;

export type Loadable<T> =
    | { state: "loading" }
    | { state: "success"; data: T };

export type AsyncResult<T> =
    | Loadable<T>
    | { state: "error"; error: unknown };

export interface Smell {
	file: File;
	workspaceUri: string;
	startLine: number;
	endLine: number;
	message: string;
	size: number;
	type: SmellType;
}
export type SmellMap = Record<string, Smell[]>;

export interface ModuleNode {
	/** Workspace-relative file path */
	file: File;
	/** Byte size of the minified JS output via esbuild */
	uncompressed: number;
}

export interface OxlintOutput {
	diagnostics: {
		message: string;
		code: string;
		filename: string;
		labels: Array<{
			label: string; 
			span: {
				offset: number;
				length: number;
				line: number;
				column: number;
			} 
		}>;
	}[];
}

export type Step<T> = T | (() => Step<T>);

export interface Report {
    bundle: number;
    smells: SmellMap;
};