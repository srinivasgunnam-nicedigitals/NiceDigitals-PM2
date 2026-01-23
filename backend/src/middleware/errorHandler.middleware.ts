import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Global error handler
 * CRITICAL: Prevents stack trace leaks to clients
 */
export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const requestId = (req as any).requestId || 'unknown';

    // Log full error details server-side
    logger.error({
        requestId,
        error: {
            message: err.message,
            stack: err.stack,
            code: err.code
        },
        method: req.method,
        path: req.path,
        userId: (req as any).user?.id
    }, 'Unhandled error');

    // Send safe error to client (no stack traces)
    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
        requestId // Include for debugging
    });
};
