import { useEffect, useState } from 'react';
import type { AsyncResult, BundleInfo, Smell, SmellMap } from './types';
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
				<button onClick={() => postMessage({ type: 'ready' })} aria-label="Scan">
					Scan
				</button>
			</div>
			<div className='section'>
				<h2>Summary</h2>
				<SummaryCard bundle={results?.bundle || LOADING} smells={results?.smells || LOADING} />
			</div>
			<SmellDetails smells={results?.smells || LOADING} postMessage={postMessage} />
		</>
	);
};
