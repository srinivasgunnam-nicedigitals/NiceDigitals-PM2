import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

// Create logger instance
export const logger = pino({
    level: process.env.LOG_LEVEL || (isDev ? 'info' : 'warn'),

    // Redact sensitive fields to prevent PII leaks
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'password',
            'token',
            'secret',
        ],
        remove: true
    },

    // In dev: clean human-readable output. In production: structured JSON.
    transport: isDev ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname,env',
            // Only show message + any extra fields, no big JSON blobs
            singleLine: true,
            messageFormat: '{msg}',
        }
    } : undefined,

    base: {
        env: process.env.NODE_ENV || 'development'
    }
});

// Create child logger with request context
export function createRequestLogger(requestId: string) {
    return logger.child({ requestId });
}
