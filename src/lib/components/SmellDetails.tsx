import { ReactNode } from 'react';
import type { AsyncResult, Smell } from '../../types';

const smellTypeLabel: Record<string, string> = {
	dead: 'Dead Code',
	duplicate: 'Duplicate Code',
	longParams: 'Long Parameter List',
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

export const SmellDetails = ({ smells }: { smells: AsyncResult<Smell[]> }) => {
	if (smells.state === 'loading') {
		return (
			<Container>
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

	const smellsByType = smells.data.reduce<Record<string, Smell[]>>((acc, s) => {
		(acc[s.type] ??= []).push(s);
		return acc;
	}, {});

	return (
		<Container>
			{Object.entries(smellsByType).map(([type, items]) => (
				<details key={type}>
					<summary>
						<span>{formatType(type)}</span>
						<span>{items.length}</span>
					</summary>
					{items.map(({ file, startLine, endLine, message }) => (
						<div className="row" key={`${file}:${startLine}`}>
							<span>{`${file}:${startLine}:${endLine}`}</span>
							<span>{message}</span>
						</div>
					))}
				</details>
			))}
		</Container>
	);
};
