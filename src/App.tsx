import { useEffect, useState } from 'react';
import { SmellDetails } from './lib/components/SmellDetails';
import { SummaryCard } from './lib/components/SummaryCard';
import type { AsyncResult, Report } from './types';

const LOADING = { state: "loading" } as const;

export const App = ({ postMessage }: { postMessage: (msg: unknown) => void }) => {
	const [report, setReport] = useState<AsyncResult<Report>>(LOADING);

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

	if (report.state === 'error') {
		return (
			<>
				<div className='row'>
					<h1>Report</h1>
					<button onClick={() => postMessage({ type: 'ready' })} aria-label="Refresh">
						Refresh
					</button>
				</div>
				<div className="error">
					<p>Failed to compute.</p>
					{typeof report.error === 'string' && <p><code>{report.error}</code></p>}
					<p>Common causes:</p>
					<ul>
						<li>A source file has a syntax error — fix the file shown above</li>
						<li><code>tsconfig.json</code> or <code>jsconfig.json</code> is malformed or unreadable</li>
					</ul>
				</div>
			</>
		);
	}

	const bundle = report.state === 'success' ? { state: 'success' as const, data: report.data.bundle } : LOADING;
	const smells = report.state === 'success' ? { state: 'success' as const, data: report.data.smells } : LOADING;

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
				<SummaryCard bundle={bundle} smells={smells} />
			</div>
			<SmellDetails smells={smells} postMessage={postMessage} />
		</>
	);
};
