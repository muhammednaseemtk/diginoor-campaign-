import crypto from 'crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'diginoor_admin_session';
export const ADMIN_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Returns the configured admin password/secret.
 * Defaults to 'admin123' if no environment variable is provided.
 */
export function getAdminSecret(): string {
  return (
    process.env.ADMIN_PASSWORD ||
    process.env.ADMIN_SECRET ||
    'admin123'
  );
}

/**
 * Verifies if the supplied password matches the admin secret or server secret key.
 */
export function verifyAdminPassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  const adminSecret = getAdminSecret();
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (password === adminSecret) return true;
  if (supabaseSecret && password === supabaseSecret) return true;

  return false;
}

/**
 * Generates a signed HMAC session token.
 */
export function createAdminSessionToken(): string {
  const secret = getAdminSecret();
  const payload = {
    role: 'admin',
    exp: Date.now() + ADMIN_SESSION_DURATION_MS,
    nonce: crypto.randomBytes(16).toString('hex'),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Validates an HMAC session token.
 */
export function verifyAdminSessionToken(token?: string | null): boolean {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, signature] = parts;
  const secret = getAdminSecret();

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');

  // Timing safe comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) return false;
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);
    if (!payload.exp || typeof payload.exp !== 'number') return false;
    if (Date.now() > payload.exp) return false;
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Server-side helper to check if current request has an authenticated admin session.
 */
export async function isServerAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    return verifyAdminSessionToken(token);
  } catch {
    return false;
  }
}

/**
 * Validates request authorization from either cookie or Authorization header.
 */
export function isRequestAdmin(request: Request): boolean {
  // 1. Check Bearer Authorization Header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.substring(7).trim();
    if (verifyAdminPassword(bearer) || verifyAdminSessionToken(bearer)) {
      return true;
    }
  }

  // 2. Check Cookie Header
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookiesList = cookieHeader.split(';').map((c) => c.trim());
    for (const c of cookiesList) {
      if (c.startsWith(`${ADMIN_COOKIE_NAME}=`)) {
        const token = c.substring(ADMIN_COOKIE_NAME.length + 1);
        if (verifyAdminSessionToken(token)) {
          return true;
        }
      }
    }
  }

  return false;
}
