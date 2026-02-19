// Server Entry Point
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './config/logger';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/projects.routes';
import userRoutes from './routes/users.routes';
import scoreRoutes from './routes/scores.routes';
import bootstrapRoutes from './routes/bootstrap.routes';
import { prisma } from './config/db';

dotenv.config();

const app = express();

// Required for express-rate-limit on Render/Proxies
app.set('trust proxy', 1);

// F-001: Security Headers
import helmet from 'helmet';
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"], // No unsafe-inline
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        }
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: false
    },
    frameguard: {
        action: 'deny' // Prevent clickjacking
    }
}));
const PORT = process.env.PORT || 3001;

// CRITICAL: Validate required environment variables at startup
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    logger.fatal({ missingVars }, 'FATAL: Required environment variables are missing');
    process.exit(1);
}

logger.info('Environment validation passed');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Allow both common dev ports for flexibility
const allowedOrigins = [
    FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'https://nicedigitalspma.vercel.app'  // Production frontend
];

import cookieParser from 'cookie-parser';

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true, // Required for cookies
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser());

// Rate Limiting
// Rate Limiting
import { rateLimit } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

let limiterStore: any = undefined; // Default to MemoryStore

if (process.env.REDIS_URL) {
    const client = new Redis(process.env.REDIS_URL);
    limiterStore = new RedisStore({
        // @ts-expect-error - Known type mismatch between ioredis and rate-limit-redis
        sendCommand: (...args: string[]) => client.call(...args),
    });
    logger.info('Using Redis for Rate Limiting');
} else {
    if (process.env.NODE_ENV === 'production') {
        // CHANGED: Allow fallback for testing/demos/single-instance deployments
        logger.warn('REDIS_URL not set in production. Falling back to in-memory rate limiting. Note: Rate limits will not be shared across multiple instances.');
    }
    logger.warn('Redis not configured. Using in-memory rate limiting.');
}

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20, // Strict limit for auth/login
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again later.' },
    store: limiterStore as any
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300, // Relaxed limit for general API usage
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: limiterStore as any
});

// Apply rate limiters at route mount points only to avoid accidental limiter stacking.

app.use(express.json());

// Request ID middleware (must be early in chain)
app.use(requestIdMiddleware);

// Structured request logging
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            requestId: (req as any).requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            userAgent: req.headers['user-agent']
        }, 'Request completed');
    });

    next();
});

// Health checks
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/health/db', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date()
        });
    } catch (error) {
        logger.error({ error }, 'Database health check failed');
        res.status(503).json({
            status: 'error',
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Root route
app.get('/', (req, res) => {
    res.json({ message: 'Nice Digital API is running 🚀', endpoints: '/api/*' });
});

import rankingRoutes from './routes/ranking.routes';
import notificationRoutes from './routes/notifications.routes';
import { emailService } from './services/email.service';
import './workers/audit.worker';

// Mount Routes with Rate Limits
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/bootstrap', apiLimiter, bootstrapRoutes);
app.use('/api/projects', apiLimiter, projectRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/scores', apiLimiter, scoreRoutes);
app.use('/api/rankings', apiLimiter, rankingRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);

// Global error handler
app.use(errorHandler);

const startServer = async () => {
    const smtpReady = await emailService.verifyConnection();
    if (!smtpReady) {
        logger.warn('SMTP service unavailable. Emails will not be sent, but server will start.');
    }

    app.listen(PORT, () => {
        logger.info({ port: PORT }, 'Server started successfully');
    });
};

startServer();

