import { createRoot } from 'react-dom/client';
import { App } from './App';
import { useState, useEffect } from 'react';
import { AsyncResult, Report } from './types';
import { AppContext } from './lib/hooks/useAppContext';

const AppProvider = ({ postMessage, children }: { postMessage: (msg: unknown) => void, children: React.ReactNode }) => {
    const [report, setReport] = useState<AsyncResult<Report>>({ state: "loading" });
    const [gitDiffOnly, setGitDiffOnly] = useState(true);

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const { type, data } = event.data;
            if (type === 'results') {
                setReport(data);
            }
        };
        window.addEventListener('message', handler);
        postMessage({ type: 'ready', gitDiffOnly: true });
        return () => window.removeEventListener('message', handler);
    }, []);

    return <AppContext value={{ postMessage, gitDiffOnly, setGitDiffOnly, report }}>
        {children}
    </AppContext>
};

declare function acquireVsCodeApi(): { postMessage: (msg: unknown) => void };
const vscode = acquireVsCodeApi();

const root = createRoot(document.getElementById('root')!);
root.render(
    <AppProvider postMessage={(msg) => vscode.postMessage(msg)}>
        <App />
    </AppProvider>
);
