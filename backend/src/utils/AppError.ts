
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;
    public readonly details?: any;

    constructor(message: string, statusCode: number, code: string = 'INTERNAL_ERROR', details?: any) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true; // Marks errors we trust (not bugs)
        this.details = details;

        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message: string, code: string = 'BAD_REQUEST', details?: any) {
        return new AppError(message, 400, code, details);
    }

    static unauthorized(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
        return new AppError(message, 401, code);
    }

    static forbidden(message: string = 'Forbidden', code: string = 'FORBIDDEN') {
        return new AppError(message, 403, code);
    }

    static notFound(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
        return new AppError(message, 404, code);
    }

    static conflict(message: string, code: string = 'CONFLICT', details?: any) {
        return new AppError(message, 409, code, details);
    }
}
