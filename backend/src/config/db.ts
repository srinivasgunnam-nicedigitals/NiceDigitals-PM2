import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

export const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
});

// Diagnostic to verify connection on startup
prisma.$connect()
    .then(() => {
        logger.info('[Database Connection] ✅ Successfully connected to database');
    })
    .catch((err) => {
        logger.error({ err }, '[Database Connection] ❌ Failed to connect to database');
    });
