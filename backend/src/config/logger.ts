import pino from 'pino';

// Create logger instance with production-safe configuration
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',

    // Redact sensitive fields to prevent PII leaks
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'password',
            'token',
            'secret',
            'email' // Redact in production logs
        ],
        remove: true
    },

    // Format for development vs production
    transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname'
        }
    } : undefined,

    // Base fields for all logs
    base: {
        env: process.env.NODE_ENV || 'development'
    }
});

// Create child logger with request context
export function createRequestLogger(requestId: string) {
    return logger.child({ requestId });
}
