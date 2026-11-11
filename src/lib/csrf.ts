import { cookies } from 'next/headers';
import crypto from 'crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_MAX_AGE = 3600; // 1 hour

/**
 * Generate a CSRF token for the client
 * Store in secure HTTP-only cookie
 */
export async function generateCsrfToken(): Promise<string> {
  // Generate cryptographically secure random token
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');

  // Store in HTTP-only cookie (not accessible to JavaScript)
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true, // Don't expose to JS (XSS protection)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'strict', // CSRF protection
    maxAge: CSRF_MAX_AGE,
    path: '/',
  });

  // Return token for client to send in header
  return token;
}

/**
 * Verify CSRF token from request header
 * Compare against cookie value using timing-safe comparison
 */
export async function verifyCsrfToken(token: string): Promise<boolean> {
  // Remove whitespace
  const cleanToken = token?.trim() || '';

  // Get stored token from cookie
  const cookieStore = await cookies();
  const storedToken = cookieStore.get(CSRF_COOKIE_NAME)?.value || '';

  // Check if tokens exist
  if (!cleanToken || !storedToken) {
    return false;
  }

  // Use crypto.timingSafeEqual to prevent timing attacks
  try {
    const tokenBuffer = Buffer.from(cleanToken, 'hex');
    const storedBuffer = Buffer.from(storedToken, 'hex');

    // Buffers must be same length
    if (tokenBuffer.length !== storedBuffer.length) {
      return false;
    }

    // Constant-time comparison
    return crypto.timingSafeEqual(tokenBuffer, storedBuffer);
  } catch (err) {
    return false;
  }
}

/**
 * Clear CSRF token (logout, session end)
 */
export async function clearCsrfToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CSRF_COOKIE_NAME);
}
