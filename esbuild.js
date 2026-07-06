const esbuild = require("esbuild");
const path = require("path");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

// pnpm creates an isolated react copy inside react-dom's node_modules context.
// esbuild sees two different physical paths and bundles React twice, causing
// two ReactCurrentDispatcher instances and breaking hooks. Force all react
// imports to the canonical hoisted copy.
const reactAlias = {
	'react': path.resolve('node_modules/react'),
	'react-dom': path.resolve('node_modules/react-dom'),
	'react-dom/client': path.resolve('node_modules/react-dom/client'),
	'react/jsx-runtime': path.resolve('node_modules/react/jsx-runtime'),
};

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

async function main() {
	const extensionCtx = await esbuild.context({
		entryPoints: ['src/extension.ts'],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode', 'esbuild'],
		logLevel: 'silent',
		plugins: [esbuildProblemMatcherPlugin],
	});

	const webviewCtx = await esbuild.context({
		entryPoints: ['src/index.tsx'],
		bundle: true,
		format: 'iife',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'browser',
		outfile: 'media/index.js',
		alias: reactAlias,
		define: { 'process.env.NODE_ENV': production ? '"production"' : '"development"' },
		logLevel: 'silent',
		plugins: [esbuildProblemMatcherPlugin],
	});

	if (watch) {
		await Promise.all([
			extensionCtx.watch(),
			webviewCtx.watch(),
		]);
	} else {
		await Promise.all([
			extensionCtx.rebuild(),
			webviewCtx.rebuild(),
		]);
		extensionCtx.dispose();
		webviewCtx.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
