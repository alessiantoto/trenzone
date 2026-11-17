import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const isRedisConfigured = !!(REDIS_URL && REDIS_TOKEN);

// Initialize Redis only if configured
const redis = isRedisConfigured
  ? new Redis({
      url: REDIS_URL,
      token: REDIS_TOKEN,
    })
  : null;

// In-memory sliding-window fallback rate limiter when Redis is not configured or temporarily unavailable
interface MemoryLimitRecord {
  timestamps: number[];
  resetAt: number;
}

const MAX_MEMORY_ENTRIES = 10000;
const memoryStore = new Map<string, MemoryLimitRecord>();

function pruneMemoryStore(now: number) {
  for (const [k, v] of memoryStore.entries()) {
    if (v.resetAt <= now) {
      memoryStore.delete(k);
    }
  }
  // FIFO eviction if still over cap under heavy unique-IP load
  while (memoryStore.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryStore.keys().next().value;
    if (!oldestKey) break;
    memoryStore.delete(oldestKey);
  }
}

function memoryLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; limit: number; reset: number; remaining: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const record = memoryStore.get(key);

  if (memoryStore.size >= MAX_MEMORY_ENTRIES) {
    pruneMemoryStore(now);
  }

  if (!record || record.resetAt <= now) {
    memoryStore.set(key, { timestamps: [now], resetAt: now + windowMs });
    return { success: true, limit, reset: now + windowMs, remaining: Math.max(0, limit - 1) };
  }

  // Sliding window: keep only timestamps within [now - windowMs, now]
  const active = record.timestamps.filter((ts) => ts > windowStart);
  if (active.length >= limit) {
    const oldestInWindow = active[0] ?? now;
    const reset = oldestInWindow + windowMs;
    record.timestamps = active;
    record.resetAt = reset;
    return { success: false, limit, reset, remaining: 0 };
  }

  active.push(now);
  record.timestamps = active;
  record.resetAt = (active[0] ?? now) + windowMs;
  return {
    success: true,
    limit,
    reset: record.resetAt,
    remaining: Math.max(0, limit - active.length),
  };
}

/**
 * Rate limiters for different endpoints
 * Format: requests per time window per IP
 */
export const rateLimiters = {
  // Checkout creation: 5 per minute
  checkout: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        prefix: 'rl:checkout',
      })
    : null,

  // Payment update: 10 per minute
  checkoutUpdate: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        prefix: 'rl:checkout-update',
      })
    : null,

  // Webhooks: 100 per minute (Stripe is trusted)
  webhook: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 m'),
        prefix: 'rl:webhook',
      })
    : null,

  // Admin API: 50 per minute
  admin: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(50, '1 m'),
        prefix: 'rl:admin',
      })
    : null,

  // Reviews submission: 5 per 5 minutes
  reviews: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '5 m'),
        prefix: 'rl:reviews',
      })
    : null,

  // Review media uploads: 10 per 5 minutes
  reviewsUpload: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '5 m'),
        prefix: 'rl:reviews-upload',
      })
    : null,

  // Contact form: 3 per 5 minutes
  contact: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '5 m'),
        prefix: 'rl:contact',
      })
    : null,

  // Newsletter: 5 per 5 minutes
  newsletter: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '5 m'),
        prefix: 'rl:newsletter',
      })
    : null,

  // Returns submission: 5 per 10 minutes
  returns: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '10 m'),
        prefix: 'rl:returns',
      })
    : null,

  // Affiliate application: 3 per 10 minutes
  affiliate: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '10 m'),
        prefix: 'rl:affiliate',
      })
    : null,

  // Affiliate login / admin email check: 5 per 1 minute (anti brute-force)
  affiliateLogin: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        prefix: 'rl:affiliate-login',
      })
    : null,

  // Maintenance bypass password: 5 per 1 minute (anti brute-force)
  maintenanceBypass: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        prefix: 'rl:maintenance-bypass',
      })
    : null,

  // Coupon validation: 15 per 1 minute (anti coupon guessing)
  validateCoupon: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(15, '1 m'),
        prefix: 'rl:validate-coupon',
      })
    : null,

  // Scratch coupon generation: 5 per 5 minutes
  promoScratch: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '5 m'),
        prefix: 'rl:promo-scratch',
      })
    : null,

  // Analytics event tracking: 60 per 1 minute
  analyticsTrack: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        prefix: 'rl:analytics-track',
      })
    : null,

  // Program PDF download endpoint: 20 per 1 minute
  programDownload: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '1 m'),
        prefix: 'rl:program-download',
      })
    : null,
};

// In-memory fallback config when Redis is not configured or errors
const FALLBACK_CONFIGS = {
  checkout: { limit: 5, windowMs: 60 * 1000 },
  checkoutUpdate: { limit: 10, windowMs: 60 * 1000 },
  'checkout-update': { limit: 10, windowMs: 60 * 1000 },
  'checkout-final-sync': { limit: 20, windowMs: 60 * 1000 },
  webhook: { limit: 100, windowMs: 60 * 1000 },
  admin: { limit: 50, windowMs: 60 * 1000 },
  reviews: { limit: 5, windowMs: 5 * 60 * 1000 },
  reviewsUpload: { limit: 10, windowMs: 5 * 60 * 1000 },
  'reviews-upload': { limit: 10, windowMs: 5 * 60 * 1000 },
  contact: { limit: 3, windowMs: 5 * 60 * 1000 },
  newsletter: { limit: 5, windowMs: 5 * 60 * 1000 },
  returns: { limit: 5, windowMs: 10 * 60 * 1000 },
  affiliate: { limit: 3, windowMs: 10 * 60 * 1000 },
  affiliateLogin: { limit: 5, windowMs: 60 * 1000 },
  maintenanceBypass: { limit: 5, windowMs: 60 * 1000 },
  validateCoupon: { limit: 15, windowMs: 60 * 1000 },
  'validate-coupon': { limit: 15, windowMs: 60 * 1000 },
  promoScratch: { limit: 5, windowMs: 5 * 60 * 1000 },
  'promo-scratch': { limit: 5, windowMs: 5 * 60 * 1000 },
  'scratch-coupon': { limit: 5, windowMs: 5 * 60 * 1000 },
  analyticsTrack: { limit: 60, windowMs: 60 * 1000 },
  'analytics-track': { limit: 60, windowMs: 60 * 1000 },
  programDownload: { limit: 20, windowMs: 60 * 1000 },
  'program-download': { limit: 20, windowMs: 60 * 1000 },
} as const;

export type RateLimitFallbackType = keyof typeof FALLBACK_CONFIGS | (string & {});

function extractIpFromHeaderGetter(getHeader: (name: string) => string | null): string {
  // Prefer trusted edge-injected headers before client-modifiable X-Forwarded-For
  const cfIp = getHeader('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp.slice(0, 64);

  const realIp = getHeader('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, 64);

  const xForwardedFor = getHeader('x-forwarded-for');
  if (xForwardedFor) {
    const first = xForwardedFor.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }

  return '127.0.0.1';
}

/**
 * Extract client IP from request.
 * Prefers Cloudflare/Vercel edge headers before X-Forwarded-For.
 */
export function getClientIp(request: Request): string {
  return extractIpFromHeaderGetter((name) => request.headers.get(name));
}

/**
 * Extract client IP from Headers object (useful in Server Actions).
 */
export function getClientIpFromHeaders(headersList: { get: (name: string) => string | null }): string {
  return extractIpFromHeaderGetter((name) => headersList.get(name));
}

function buildRateLimitRejection(limit: number, reset: number) {
  const now = Date.now();
  const retryAfter = Math.max(1, Math.ceil((reset - now) / 1000));
  return {
    allowed: false as const,
    retryAfter,
    headers: {
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': reset.toString(),
    },
  };
}

/**
 * Helper to check rate limit and return appropriate response.
 * Always enforces in-memory sliding-window fallback if Redis is not configured or throws.
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  ip: string,
  fallbackType: RateLimitFallbackType = 'checkout'
): Promise<{ allowed: boolean; retryAfter?: number; headers?: Record<string, string> }> {
  const safeIdentifier = String(ip || '127.0.0.1').trim().slice(0, 160) || '127.0.0.1';

  if (limiter) {
    try {
      const { success, limit, reset } = await limiter.limit(safeIdentifier);
      if (!success) {
        return buildRateLimitRejection(limit, reset);
      }
      return { allowed: true };
    } catch (err) {
      console.error('Redis rate limiter error, falling back to in-memory limiter:', err);
    }
  }

  const config =
    FALLBACK_CONFIGS[fallbackType as keyof typeof FALLBACK_CONFIGS] || { limit: 10, windowMs: 60000 };
  const { success, limit, reset } = memoryLimit(
    `${String(fallbackType)}:${safeIdentifier}`,
    config.limit,
    config.windowMs
  );

  if (!success) {
    return buildRateLimitRejection(limit, reset);
  }

  return { allowed: true };
}
