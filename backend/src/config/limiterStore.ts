/**
 * Rate Limiter Store Factory
 *
 * express-rate-limit requires EACH limiter to have its OWN store instance.
 * Sharing a single store instance across limiters causes ERR_ERL_STORE_REUSE.
 *
 * This factory creates a fresh RedisStore with a unique prefix for each limiter,
 * while reusing a single shared Redis client connection for efficiency.
 * Falls back to undefined (MemoryStore) if REDIS_URL is not configured.
 */

import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { logger } from './logger';

// Single Redis client, shared for connection efficiency
let redisClient: Redis | null = null;
let redisConnected = false;

if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL);
    redisConnected = true;
    logger.info('Redis client initialized for Rate Limiting');
} else {
    if (process.env.NODE_ENV === 'production') {
        logger.warn('REDIS_URL not set — using in-memory rate limiting (not shared across instances)');
    }
}

/**
 * Creates a unique RedisStore instance for a single rate limiter.
 * Each limiter must have its own store with a unique prefix.
 * Returns undefined (MemoryStore) if Redis is not configured.
 *
 * @param prefix - A unique key prefix (e.g. 'rl_auth', 'rl_api')
 */
export function createLimiterStore(prefix: string): any {
    if (!redisClient || !redisConnected) return undefined;
    return new RedisStore({
        prefix,
        // @ts-expect-error - Known type mismatch between ioredis and rate-limit-redis
        sendCommand: (...args: string[]) => redisClient!.call(...args),
    });
}
