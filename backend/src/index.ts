// Server Entry Point
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/projects.routes';
import userRoutes from './routes/users.routes';
import scoreRoutes from './routes/scores.routes';
import bootstrapRoutes from './routes/bootstrap.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security Check
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not defined in environment variables.');
    process.exit(1);
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Allow both common dev ports for flexibility
const allowedOrigins = [
    FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173'
];

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
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting
// Rate Limiting
import { rateLimit } from 'express-rate-limit';

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 20, // Strict limit for auth/login
	standardHeaders: 'draft-7',
	legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again later.' }
});

const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 300, // Relaxed limit for general API usage
	standardHeaders: 'draft-7',
	legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter); // Applies to all other /api routes that aren't caught by specific middleware above if mounted later, but here we mount globally to /api base or specific routes.
// Better strategy: Apply global relaxed, and specific strict.
// app.use(apiLimiter); // Global baseline
// app.use('/api/auth', authLimiter); // Specific override? No, rateLimit doesn't override, it stacks.

// Correct approach: Apply limiters to the route usage lines.

app.use(express.json());

// Global logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} request received`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Root route for convenience
app.get('/', (req, res) => {
    res.json({ message: 'Nice Digital API is running 🚀', endpoints: '/api/*' });
});

// Mount Routes
// Mount Routes with Rate Limits
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/bootstrap', apiLimiter, bootstrapRoutes);
app.use('/api/projects', apiLimiter, projectRoutes);
app.use('/api/users', apiLimiter, userRoutes);
import rankingRoutes from './routes/ranking.routes';
import notificationRoutes from './routes/notifications.routes';

app.use('/api/scores', apiLimiter, scoreRoutes);
app.use('/api/rankings', apiLimiter, rankingRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

