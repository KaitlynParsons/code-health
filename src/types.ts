type SmellType = "dead" | "duplicate" | "longParams" | "barrel";
type File = string;

export type AsyncResult<T> =
    | { state: "loading" }
    | { state: "error"; error: unknown }
    | { state: "success"; data: T };

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

export interface BundleSize {
	/** Byte size of the minified JS output via esbuild */
	uncompressed: number;
	/** Byte size of the minified JS after gzip compression */
	compressed: number;
}

export interface ModuleNode extends BundleSize {
	/** Workspace-relative file path */
	file: File;
}

export interface BundleInfo {
	internal: {
		nodes: ModuleNode[];
		total: BundleSize;
	}
}
