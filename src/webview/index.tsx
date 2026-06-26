import { createRoot } from 'react-dom/client';
import { App } from './App';

declare function acquireVsCodeApi(): { postMessage: (msg: unknown) => void };
const vscode = acquireVsCodeApi();

const root = createRoot(document.getElementById('root')!);
root.render(<App postMessage={(msg) => vscode.postMessage(msg)} />);
