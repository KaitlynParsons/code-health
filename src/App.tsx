import { ReactNode } from 'react';
import { SmellDetails } from './lib/components/SmellDetails';
import { SummaryCard } from './lib/components/SummaryCard';
import { useGetAppContext } from './lib/hooks/useAppContext';
import { Toggle } from './lib/components/Toggle';

const LOADING = { state: "loading" } as const;

const AppContainer = ({ children }: { children: ReactNode }) => {
	const { gitDiffOnly, postMessage, report } = useGetAppContext();

	return <>
		<div className='row'>
			<h1>Report</h1>
			<div className='row__actions'>
				<Toggle />
				<button onClick={() => {
					if (report.state === "loading") return;
					postMessage({ type: 'refresh', gitDiffOnly })
				}} aria-label="Refresh">
					Refresh
				</button>
			</div>
		</div>
		{children}
	</>
}

export const App = () => {
	const { report, postMessage } = useGetAppContext();

	if (report.state === 'error') {
		return (
			<AppContainer>
				<div className="error">
					<p>Failed to compute.</p>
					{typeof report.error === 'string' && <p><code>{report.error}</code></p>}
					<p>Common causes:</p>
					<ul>
						<li>A source file has a syntax error — fix the file shown above</li>
						<li><code>tsconfig.json</code> or <code>jsconfig.json</code> is malformed or unreadable</li>
					</ul>
				</div>
			</AppContainer>
		);
	}

	const bundle = report.state === 'success' ? { state: 'success' as const, data: report.data.bundle } : LOADING;
	const smells = report.state === 'success' ? { state: 'success' as const, data: report.data.smells } : LOADING;

	return (
		<AppContainer>
			<div className='section'>
				<h2>Summary</h2>
				<SummaryCard bundle={bundle} smells={smells} />
			</div>
			<SmellDetails smells={smells} postMessage={postMessage} />
		</AppContainer>
	);
};
