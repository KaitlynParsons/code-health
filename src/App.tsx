import { useEffect, useState } from 'react';
import { SmellDetails } from './lib/components/SmellDetails';
import { SummaryCard } from './lib/components/SummaryCard';
import type { AsyncResult, SmellMap } from './types';

interface ViewState {
	bundle: AsyncResult<number>;
	smells: AsyncResult<SmellMap>;
}

const LOADING = { state: "loading" } as const;

export const App = ({ postMessage }: { postMessage: (msg: unknown) => void }) => {
	const [report, setReport] = useState<ViewState | null>(null);

	useEffect(() => {
		const handler = (event: MessageEvent) => {
			const { type, data } = event.data;
			if (type === 'results') {
				setReport(data);
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
				<button onClick={() => postMessage({ type: 'ready' })} aria-label="Refresh">
					Refresh
				</button>
			</div>
			<div className='section'>
				<h2>Summary</h2>
				<SummaryCard bundle={report?.bundle ?? LOADING} smells={report?.smells ?? LOADING} />
			</div>
			<SmellDetails smells={report?.smells ?? LOADING} postMessage={postMessage} />
		</>
	);
};
