import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';
import { ZodError } from 'zod';

/**
 * Global error handler
 * CRITICAL: Prevents stack trace leaks to clients
 * ENFORCEMENT: Logs security violations distinctly
 */
export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const requestId = (req as any).requestId || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    const path = req.path;
    const method = req.method;



    // 1. TRUSTED OPERATIONAL ERRORS (AppError)
    if (err instanceof AppError) {
        // Security/Authority Violations are WARN level, not ERROR
        if (err.statusCode === 403 || err.statusCode === 401) {
            logger.warn({
                requestId,
                userId,
                code: err.code,
                error: err.message,
                path,
                method
            }, `Authority Violation: ${err.message}`);
        } else {
            // Logic/Validation errors are INFO level (client's fault)
            logger.info({
                requestId,
                userId,
                code: err.code,
                error: err.message,
                path,
                method
            }, `Operational Error: ${err.message}`);
        }

        return res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
            details: err.details,
            requestId
        });
    }

    // 2. VALIDATION ERRORS (Zod)
    if (err instanceof ZodError) {
        logger.warn({
            requestId,
            userId,
            path,
            method
        }, 'Validation Failed');

        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: err.issues,
            requestId
        });
    }

    // 3. UNTRUSTED SYSTEM ERRORS (Bugs/Crashes)
    // Log full error details server-side with STACK
    logger.error({
        requestId,
        userId,
        error: {
            message: err.message,
            stack: err.stack,
            code: err.code
        },
        path,
        method
    }, 'CRITICAL: Unhandled System Error');

    // Send generic safe error to client
    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message, // Dev only convenience
        code: 'INTERNAL_ERROR',
        requestId
    });
};
