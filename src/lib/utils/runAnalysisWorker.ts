import { Worker } from 'worker_threads';
import * as path from 'path';

import type { Smell, ModuleNode } from '../../types';

export type WorkerTask = 'smells' | 'bundle';

export interface WorkerResult {
    smells: Smell[];
    modules: ModuleNode[];
}

type WorkerMessage =
    | { type: 'smells'; items: Smell[] }
    | { type: 'module'; file: string; uncompressed: number }
    | { type: 'done' }
    | { type: 'error'; message: string };

const WORKER_MEMORY_MB = 512;
const WORKER_TIMEOUT_MS = 120_000;

export const runAnalysisWorker = (
    configPath: string,
    rootPath: string,
    workspaceUri: string,
    tasks: WorkerTask[],
): Promise<WorkerResult> =>
    new Promise((resolve, reject) => {
        const result: WorkerResult = { smells: [], modules: [] };
        let settled = false;

        const settle = (fn: () => void) => {
            if (settled) { 
                return; 
            }
            settled = true;
            clearTimeout(timeout);
            fn();
        };

        const worker = new Worker(path.join(__dirname, 'analysisWorker.js'), {
            workerData: { configPath, rootPath, workspaceUri, tasks },
            resourceLimits: { maxOldGenerationSizeMb: WORKER_MEMORY_MB },
        });

        const timeout = setTimeout(() => {
            worker.terminate();
            settle(() => reject(new Error(`Analysis worker timed out after ${WORKER_TIMEOUT_MS / 1000}s`)));
        }, WORKER_TIMEOUT_MS);

        worker.on('message', (msg: WorkerMessage) => {
            if (msg.type === 'smells') { 
                result.smells.push(...msg.items); 
            }
            if (msg.type === 'module') { 
                result.modules.push({ file: msg.file, uncompressed: msg.uncompressed }); 
            }
            if (msg.type === 'done') { 
                settle(() => resolve(result)); 
            }
            if (msg.type === 'error') { 
                settle(() => reject(new Error(msg.message))); 
            }
        });

        worker.on('error', err => settle(() => reject(err)));
        worker.on('exit', code => {
            if (code !== 0) { 
                settle(() => reject(new Error(`Analysis worker exited with code ${code}`))); 
            } else { 
                settle(() => resolve(result)); 
            }
        });
    });
