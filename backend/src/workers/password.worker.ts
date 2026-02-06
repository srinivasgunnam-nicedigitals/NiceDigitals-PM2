import { parentPort } from 'worker_threads';
import bcrypt from 'bcryptjs';

if (!parentPort) {
    throw new Error('This file must be run as a worker thread');
}

parentPort.on('message', async (message: any) => {
    const { id, type, payload } = message;

    try {
        let result;
        if (type === 'hash') {
            result = await bcrypt.hash(payload.password, 10);
        } else if (type === 'compare') {
            // Compare against hash (or dummy if provided)
            result = await bcrypt.compare(payload.password, payload.hash);
        } else {
            throw new Error(`Unknown operation type: ${type}`);
        }

        parentPort?.postMessage({ id, success: true, result });
    } catch (error: any) {
        parentPort?.postMessage({ id, success: false, error: error.message });
    }
});
