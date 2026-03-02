// =============================================
// IN-MEMORY HEALTH CACHE (60s TTL)
// =============================================
// Prevents recomputation on rapid Kanban renders.
// One compute per project per minute.

import { ExecutionHealthResult } from './execution-health.service';

interface CacheEntry {
    health: ExecutionHealthResult;
    timestamp: number;
}

const TTL_MS = 60_000; // 60 seconds
const cache = new Map<string, CacheEntry>();

export function getCachedHealth(projectId: string): ExecutionHealthResult | null {
    const entry = cache.get(projectId);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > TTL_MS) {
        cache.delete(projectId);
        return null;
    }
    return entry.health;
}

export function setCachedHealth(projectId: string, health: ExecutionHealthResult): void {
    cache.set(projectId, { health, timestamp: Date.now() });
}

export function invalidateHealthCache(projectId: string): void {
    cache.delete(projectId);
}

export function clearHealthCache(): void {
    cache.clear();
}
