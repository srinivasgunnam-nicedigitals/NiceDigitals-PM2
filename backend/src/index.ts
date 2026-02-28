// Server Entry Point
import { createServer } from 'http';
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
import { Server as SocketIOServer } from 'socket.io';
import { registerRealtime } from './realtime/realtime';

dotenv.config();

// Default to development if not set, preventing crashes in local environments
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

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
const PORT = process.env.PORT || 3002;

// CRITICAL: Validate required environment variables at startup
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL', 'NODE_ENV', 'FRONTEND_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    logger.fatal({ missingVars }, 'FATAL: Required environment variables are missing');
    process.exit(1);
}

// Env vars validated ✓

const FRONTEND_URL = process.env.FRONTEND_URL;

// Allow both common dev ports for flexibility
const allowedOrigins = [
    FRONTEND_URL,
    'http://192.168.0.125:3000',
    'http://192.168.0.125:5173',
    // Add other allowed origins if needed, but in production, FRONTEND_URL is the source of truth
];

// In non-production, allow localhost for convenience if FRONTEND_URL matches
if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://localhost:5173');
    allowedOrigins.push('http://localhost:5174'); // Vite fallback port when 5173 is occupied
}

import cookieParser from 'cookie-parser';

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (origin && allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true, // Required for cookies
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser());

// Rate Limiting
import { rateLimit } from 'express-rate-limit';
import { createLimiterStore } from './config/limiterStore';

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20, // Strict limit for auth/login
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again later.' },
    store: createLimiterStore('rl_auth')
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300, // Per-user budget for general API usage
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: createLimiterStore('rl_api'),
    // KEY FIX: Key by authenticated user ID so 50 users on the same LAN each
    // get their own independent 300-request bucket instead of sharing one.
    // Falls back to IP for any unauthenticated requests that reach this limiter.
    keyGenerator: (req) => {
        return (req.user?.id as string) || req.ip || 'unknown';
    }
});

// Apply rate limiters at route mount points only to avoid accidental limiter stacking.

app.use(express.json());

// Request ID middleware (must be early in chain)
app.use(requestIdMiddleware);

// Minimal request logger — one clean line per request
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        const status = res.statusCode;
        const line = `${status}  ${req.method} ${req.originalUrl}  ${ms}ms`;
        if (status >= 500) logger.error(line);
        else if (status >= 400) logger.warn(line);
        else logger.info(line);
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
import activityRoutes from './routes/activity.routes';
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
app.use('/api/activity', apiLimiter, activityRoutes);

// Global error handler
app.use(errorHandler);

const startServer = async () => {
    const smtpReady = await emailService.verifyConnection();
    if (!smtpReady) {
        logger.warn('SMTP service unavailable. Emails will not be sent, but server will start.');
    }

    // Wrap Express app in a raw HTTP server — required for Socket.io
    const httpServer = createServer(app);

    // Mount Socket.io on the same HTTP server.
    // CORS origins match the Express CORS config above.
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: allowedOrigins.filter(Boolean) as string[],
            credentials: true,
            methods: ['GET', 'POST'],
        },
        // Use only WebSocket transport once connected (no polling fallback in prod)
        transports: ['websocket', 'polling'],
    });

    // Register authenticated handshake + tenant room binding
    registerRealtime(io);

    httpServer.listen(PORT as number, '0.0.0.0', () => {
        logger.info({ port: PORT }, 'Server + WebSocket started on 0.0.0.0');
    });
};

startServer();

