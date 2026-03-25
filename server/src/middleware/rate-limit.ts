/**
 * Simple in-memory rate limiter.
 *
 * No Redis needed for MVP — uses a Map with TTL cleanup.
 *
 * Limits:
 * - 100 requests/min for regular API calls
 * - 10 exports/hour
 */

import type { VercelResponse } from '@vercel/node';
import type { AuthenticatedRequest } from './auth';

type NextFn = () => void | Promise<void>;
type MiddlewareFn = (req: AuthenticatedRequest, res: VercelResponse, next: NextFn) => void | Promise<void>;

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp in ms
}

/** Store: key → rate limit entry */
const store = new Map<string, RateLimitEntry>();

/** Cleanup expired entries every 5 minutes */
let cleanupScheduled = false;
function scheduleCleanup(): void {
  if (cleanupScheduled) return;
  cleanupScheduled = true;

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Get client identifier for rate limiting.
 * Uses auth UID if available, otherwise falls back to IP.
 */
function getClientKey(req: AuthenticatedRequest, prefix: string): string {
  const uid = req.auth?.uid;
  if (uid) return `${prefix}:${uid}`;

  // Fallback to IP (Vercel provides x-forwarded-for)
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.headers['x-real-ip'] as string
    || 'unknown';

  return `${prefix}:ip:${ip}`;
}

/**
 * Check and increment rate limit.
 * Returns true if request is allowed, false if limit exceeded.
 */
function checkLimit(key: string, maxRequests: number, windowMs: number): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  scheduleCleanup();

  const now = Date.now();
  let entry = store.get(key);

  // New window or expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, entry);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Within window
  entry.count++;

  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Create rate limit middleware with custom limits.
 */
export function createRateLimit(options: {
  maxRequests: number;
  windowMs: number;
  prefix?: string;
  message?: string;
}): MiddlewareFn {
  const {
    maxRequests,
    windowMs,
    prefix = 'rl',
    message = 'Too many requests. Please try again later.',
  } = options;

  return async (req, res, next) => {
    const key = getClientKey(req, prefix);
    const result = checkLimit(key, maxRequests, windowMs);

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.status(429).json({
        ok: false,
        error: 'Rate limit exceeded',
        message,
        retry_after_seconds: retryAfter,
      });
      return;
    }

    return next();
  };
}

// ─── Pre-built rate limiters ───

/** 100 requests per minute — general API */
export const apiRateLimit = createRateLimit({
  maxRequests: 100,
  windowMs: 60 * 1000,
  prefix: 'api',
  message: 'Too many API requests. Limit: 100/min.',
});

/** 10 exports per hour */
export const exportRateLimit = createRateLimit({
  maxRequests: 10,
  windowMs: 60 * 60 * 1000,
  prefix: 'export',
  message: 'Too many export requests. Limit: 10/hour.',
});

/** 5 bulk operations per minute */
export const bulkRateLimit = createRateLimit({
  maxRequests: 5,
  windowMs: 60 * 1000,
  prefix: 'bulk',
  message: 'Too many bulk operations. Limit: 5/min.',
});

/** 20 auth attempts per 15 minutes (brute force protection) */
export const authRateLimit = createRateLimit({
  maxRequests: 20,
  windowMs: 15 * 60 * 1000,
  prefix: 'auth',
  message: 'Too many authentication attempts. Please wait 15 minutes.',
});
