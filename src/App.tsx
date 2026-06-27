import { useEffect, useState } from 'react';
import type { AsyncResult, BundleInfo, Smell, SmellMap } from './types';
import { InternalBundleCard } from './lib/components/InternalBundleCard';
import { SmellDetails } from './lib/components/SmellDetails';
import { SummaryCard } from './lib/components/SummaryCard';

interface Results {
	bundle: AsyncResult<BundleInfo>;
	smells: AsyncResult<SmellMap>;
}

const LOADING = { state: "loading" } as const;

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

	return (
		<>
			<div className='row'>
				<h1>Report</h1>
				<div style={{ display: 'flex', gap: 'var(--dimensions-100)' }}>
					<button onClick={() => postMessage({ type: 'openExternal', url: 'https://marketplace.visualstudio.com/items?itemName=kaitlynparsons.code-health&ssr=false#review-details' })} aria-label="Feedback">
						Feedback
					</button>
					<button onClick={() => postMessage({ type: 'ready' })} aria-label="Refresh">
						Refresh
					</button>
				</div>
			</div>
			<div className='section'>
				<h2>Summary</h2>
				<SummaryCard bundle={results?.bundle || LOADING} smells={results?.smells || LOADING} />
			</div>
			<SmellDetails smells={results?.smells || LOADING} />
			<InternalBundleCard bundle={results?.bundle || LOADING} />
		</>
	);
};
