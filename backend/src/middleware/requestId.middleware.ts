import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Middleware to add unique request ID to each request
 * This enables request tracing across logs
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || randomUUID();

    // Attach to request for use in controllers
    (req as any).requestId = requestId;

    // Send back in response headers for client-side debugging
    res.setHeader('X-Request-ID', requestId);

    next();
};
