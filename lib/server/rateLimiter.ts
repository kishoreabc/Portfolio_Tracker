import { NextResponse } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const CLEANUP_INTERVAL_MS = 60 * 1000; // Run cleanup once per minute
let lastCleanup = Date.now();

function cleanupStore(maxWindowMs = 15 * 60 * 1000) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < maxWindowMs);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Checks if a request exceeds the allowed rate limit within the specified window.
 * Uses an in-memory sliding window algorithm.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  cleanupStore(windowMs);

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const earliestInWindow = record.timestamps[0] || now;
    const resetTime = earliestInWindow + windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetTime,
    };
  }

  record.timestamps.push(now);
  const resetTime = (record.timestamps[0] || now) + windowMs;

  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
    resetTime,
  };
}

/**
 * Derives a consistent client identifier from user ID or request headers.
 */
export function getClientIdentifier(request: Request, userId?: string | null): string {
  if (userId) {
    return `user:${userId}`;
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0].trim();
    if (ip) return `ip:${ip}`;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return `ip:${realIp.trim()}`;
  }

  return 'ip:127.0.0.1';
}

/**
 * Returns a standard HTTP 429 Too Many Requests response with Retry-After header.
 */
export function rateLimitResponse(
  resetTime: number,
  message = 'Too many requests. Please slow down and try again later.'
): NextResponse {
  const retryAfterSec = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));

  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Reset': String(resetTime),
        'Cache-Control': 'no-store',
      },
    }
  );
}
