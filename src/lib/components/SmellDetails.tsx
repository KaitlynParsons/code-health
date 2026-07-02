import { ReactNode, useState } from 'react';
import type { AsyncResult, Smell, SmellMap } from '../../types';

const smellTypeLabel: Record<string, string> = {
	dead: 'Dead Code',
	duplicate: 'Duplicate Code',
	longParams: 'Long Parameter List',
	barrel: 'Barrel Files',
};

const formatType = (type: string) => smellTypeLabel[type] ?? type;

const SkeletonGroup = () => (
	<details open={false}>
		<summary>
			<span className="skeleton skeleton--text" style={{ width: '30%' }} />
			<span className="skeleton skeleton--text skeleton--short" />
		</summary>
	</details>
);

const Container = ({ children }: { children: ReactNode }) => {
	return (
		<div className="section">
			<h2>Smells</h2>
			{children}
		</div>
	);
}

const FileGroup = ({ file, items, postMessage }: { file: string; items: Smell[]; postMessage: (msg: unknown) => void }) => (
	<details>
		<summary>
			<span>{file}</span>
			<span>{items.length}</span>
		</summary>
		<ul>
			{items.map(({ workspaceUri, startLine, message }) => (
				<li key={`${startLine}:${message}`}>
					<button className="link" onClick={() => postMessage({ type: 'openFile', file, workspaceUri, line: startLine })}>
						{message}
					</button>
				</li>
			))}
		</ul>
	</details>
);

const SmellGroup = ({ type, items, postMessage }: { type: string; items: Smell[]; postMessage: (msg: unknown) => void }) => {
	const byFile = items.reduce<Record<string, Smell[]>>((acc, smell) => {
		(acc[smell.file] ??= []).push(smell);
		return acc;
	}, {});

	return (
		<details>
			<summary>
				<span>{formatType(type)}</span>
				<span>{items.length}</span>
			</summary>
			{Object.entries(byFile).map(([file, fileItems]) => (
				<FileGroup key={file} file={file} items={fileItems} postMessage={postMessage} />
			))}
		</details>
	);
};

export const SmellDetails = ({ smells, postMessage }: { smells: AsyncResult<SmellMap>, postMessage: (msg: unknown) => void }) => {
	if (smells.state === 'loading') {
		return (
			<Container>
				<SkeletonGroup />
				<SkeletonGroup />
				<SkeletonGroup />
				<SkeletonGroup />
			</Container>
		);
	}

	if (smells.state === 'error') {
		return (
			<Container>
				<div className="error">
					<p>Failed to compute smells.</p>
					{typeof smells.error === 'string' && <p><code>{smells.error}</code></p>}
					<p>Common causes:</p>
					<ul>
						<li>A source file has a syntax error the TypeScript compiler cannot recover from</li>
						<li><code>tsconfig.json</code> or <code>jsconfig.json</code> is malformed or unreadable</li>
					</ul>
				</div>
			</Container>
		);
	}

	return (
		<Container>
			{Object.entries(smells.data).map(([type, items]) => (
				<SmellGroup key={type} type={type} items={items} postMessage={postMessage} />
			))}
			<p className="note">Some results may be false positives.</p>
		</Container>
	);
};
