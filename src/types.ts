type SmellType = "dead" | "duplicate" | "longParams";
type File = string;

export interface Smell {
	file: File;
	startLine: number;
	endLine: number;
	message: string;
	size: number;
	type: SmellType;
}

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
