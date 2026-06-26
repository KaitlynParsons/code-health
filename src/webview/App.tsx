import { useEffect, useState } from 'react';
import type { BundleInfo, Smell } from '../types';
import { InternalBundleCard } from '../lib/components/InternalBundleCard';
import { SmellDetails } from '../lib/components/SmellDetails';

interface Results {
	bundle: BundleInfo;
	smells: Smell[];
}

export const App = ({ postMessage }: { postMessage: (msg: unknown) => void }) => {
	const [results, setResults] = useState<Results | null>(null);

	useEffect(() => {
		const handler = (event: MessageEvent) => {
			const { type, data } = event.data;
			if (type === 'results') {
				setResults(data);
			}
		};
		window.addEventListener('message', handler);
		postMessage({ type: 'ready' });
		return () => window.removeEventListener('message', handler);
	}, []);

	if (results === null) {
		return <p>Scanning...</p>;
	}

	const smellsByType = results.smells.reduce<Record<string, Smell[]>>((acc, s) => {
		(acc[s.type] ??= []).push(s);
		return acc;
	}, {});

	return (
		<>
			<button onClick={() => postMessage({ type: 'ready' })} aria-label="Refresh">
				Refresh
			</button>
			<InternalBundleCard bundle={results.bundle} />
			<div className="section">
				<h2>Smells</h2>
				{Object.entries(smellsByType).map(([type, items]) => (
					<SmellDetails key={type} type={type} items={items} />
				))}
			</div>
		</>
	);
};
