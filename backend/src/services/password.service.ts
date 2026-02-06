import { Worker } from 'worker_threads';
import path from 'path';
import crypto from 'crypto';

interface WorkerMessage {
    id: string;
    success: boolean;
    result?: any;
    error?: string;
}

class PasswordService {
    private worker: Worker;
    private pending: Map<string, (response: any) => void>;

    constructor() {
        this.pending = new Map();

        // In dev (ts-node), we need to handle .ts extension or register ts-node
        // Ideally we use a .js file in production.
        // For this clean-room implementation, we assume we can point to the worker file.
        // Note: Running TS workers without pre-compilation is tricky.
        // We will try to resolve the worker path dynamically.

        const workerPath = path.join(__dirname, '../workers/password.worker.ts');

        // We use execArgv to register ts-node if we are in dev
        this.worker = new Worker(workerPath, {
            execArgv: /\.ts$/.test(workerPath) ? ['-r', 'ts-node/register'] : undefined
        });

        this.worker.on('message', (message: WorkerMessage) => {
            const { id, success, result, error } = message;
            const resolver = this.pending.get(id);
            if (resolver) {
                resolver(message);
                this.pending.delete(id);
            }
        });

        this.worker.on('error', (err) => {
            console.error('Password Worker Error:', err);
            // In a real pool, we would restart the worker
        });
    }

    public async hash(password: string): Promise<string> {
        return this.execute('hash', { password });
    }

    public async compare(password: string, hash: string): Promise<boolean> {
        return this.execute('compare', { password, hash });
    }

    private execute(type: 'hash' | 'compare', payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = crypto.randomUUID();
            this.pending.set(id, (response: WorkerMessage) => {
                if (response.success) {
                    resolve(response.result);
                } else {
                    reject(new Error(response.error));
                }
            });
            this.worker.postMessage({ id, type, payload });
        });
    }
}

export const passwordService = new PasswordService();
