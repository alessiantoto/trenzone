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

// In-memory fallback rate limiter when Redis is not configured
interface MemoryLimitRecord {
  count: number;
  resetAt: number;
}
const memoryStore = new Map<string, MemoryLimitRecord>();

function memoryLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; limit: number; reset: number; remaining: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  // Clean old expired records periodically
  if (memoryStore.size > 10000) {
    for (const [k, v] of memoryStore.entries()) {
      if (v.resetAt < now) memoryStore.delete(k);
    }
  }

  if (!record || record.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, limit, reset: now + windowMs, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { success: false, limit, reset: record.resetAt, remaining: 0 };
  }

  record.count += 1;
  return { success: true, limit, reset: record.resetAt, remaining: limit - record.count };
}

/**
 * Rate limiters for different endpoints
 * Format: requests per time window per IP
 */
export const rateLimiters = {
  // Checkout creation: 5 per minute
  checkout: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'rl:checkout',
  }) : null,

  // Payment update: 10 per minute
  checkoutUpdate: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'rl:checkout-update',
  }) : null,

  // Webhooks: 100 per minute (Stripe is trusted)
  webhook: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'rl:webhook',
  }) : null,

  // Admin API: 50 per minute
  admin: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '1 m'),
    prefix: 'rl:admin',
  }) : null,

  // Reviews submission: 5 per 5 minutes
  reviews: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '5 m'),
    prefix: 'rl:reviews',
  }) : null,

  // Contact form: 3 per 5 minutes
  contact: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '5 m'),
    prefix: 'rl:contact',
  }) : null,

  // Newsletter: 5 per 5 minutes
  newsletter: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '5 m'),
    prefix: 'rl:newsletter',
  }) : null,

  // Returns submission: 5 per 10 minutes
  returns: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    prefix: 'rl:returns',
  }) : null,

  // Affiliate application: 3 per 10 minutes
  affiliate: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '10 m'),
    prefix: 'rl:affiliate',
  }) : null,

  // Affiliate login: 5 per 1 minute (anti brute-force)
  affiliateLogin: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'rl:affiliate-login',
  }) : null,
};

// Fallback config when Redis is not available
const FALLBACK_CONFIGS: Record<string, { limit: number; windowMs: number }> = {
  checkout: { limit: 5, windowMs: 60 * 1000 },
  checkoutUpdate: { limit: 10, windowMs: 60 * 1000 },
  webhook: { limit: 100, windowMs: 60 * 1000 },
  admin: { limit: 50, windowMs: 60 * 1000 },
  reviews: { limit: 5, windowMs: 5 * 60 * 1000 },
  contact: { limit: 3, windowMs: 5 * 60 * 1000 },
  newsletter: { limit: 5, windowMs: 5 * 60 * 1000 },
  returns: { limit: 5, windowMs: 10 * 60 * 1000 },
  affiliate: { limit: 3, windowMs: 10 * 60 * 1000 },
  affiliateLogin: { limit: 5, windowMs: 60 * 1000 },
};

/**
 * Extract client IP from request
 * Respects X-Forwarded-For for proxies (Vercel, CloudFlare)
 */
export function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    '127.0.0.1'
  );
}

/**
 * Extract client IP from Headers object (useful in Server Actions)
 */
export function getClientIpFromHeaders(headersList: { get: (name: string) => string | null }): string {
  const xForwardedFor = headersList.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return (
    headersList.get('x-real-ip') ||
    headersList.get('cf-connecting-ip') ||
    '127.0.0.1'
  );
}

/**
 * Helper to check rate limit and return appropriate response
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  ip: string,
  fallbackType: keyof typeof FALLBACK_CONFIGS = 'checkout'
): Promise<{ allowed: boolean; retryAfter?: number; headers?: Record<string, string> }> {
  try {
    if (limiter) {
      const { success, limit, reset } = await limiter.limit(ip);

      if (!success) {
        const now = Date.now();
        const retryAfter = Math.ceil((reset - now) / 1000);

        return {
          allowed: false,
          retryAfter,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
          },
        };
      }

      return { allowed: true };
    }

    // In-memory fallback
    const config = FALLBACK_CONFIGS[fallbackType] || { limit: 10, windowMs: 60000 };
    const { success, limit, reset } = memoryLimit(`${fallbackType}:${ip}`, config.limit, config.windowMs);

    if (!success) {
      const now = Date.now();
      const retryAfter = Math.ceil((reset - now) / 1000);
      return {
        allowed: false,
        retryAfter,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': reset.toString(),
        },
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error('Rate limiter error:', err);
    // Fail open: allow request if rate limiter fails
    return { allowed: true };
  }
}
