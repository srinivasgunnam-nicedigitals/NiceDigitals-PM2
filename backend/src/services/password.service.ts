import { Worker } from 'worker_threads';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

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

        const workerJsPath = path.join(__dirname, '../workers/password.worker.js');
        const workerTsPath = path.join(__dirname, '../workers/password.worker.ts');
        const workerPath = fs.existsSync(workerJsPath) ? workerJsPath : workerTsPath;

        this.worker = new Worker(workerPath, {
            execArgv: workerPath.endsWith('.ts') ? ['-r', 'ts-node/register'] : undefined
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
