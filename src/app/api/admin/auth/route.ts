import { NextResponse } from 'next/server';
import {
  verifyAdminPassword,
  createAdminSessionToken,
  verifyAdminSessionToken,
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_DURATION_MS,
} from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * GET: Check whether the current user holds an active admin session.
 */
export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookiesList = cookieHeader.split(';').map((c) => c.trim());
  let token: string | null = null;

  for (const c of cookiesList) {
    if (c.startsWith(`${ADMIN_COOKIE_NAME}=`)) {
      token = c.substring(ADMIN_COOKIE_NAME.length + 1);
      break;
    }
  }

  const authenticated = verifyAdminSessionToken(token);
  return NextResponse.json({ authenticated });
}

/**
 * POST: Authenticate with admin password and establish session cookie.
 */
export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { authenticated: false, error: 'Invalid JSON payload in request' },
        { status: 400 }
      );
    }

    const password = body?.password;

    if (!password || !verifyAdminPassword(password)) {
      return NextResponse.json(
        { authenticated: false, error: 'Incorrect admin credentials. Access denied.' },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken();
    const response = NextResponse.json({
      authenticated: true,
      message: 'Admin authorization successful',
    });

    const isProduction = process.env.NODE_ENV === 'production';

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(ADMIN_SESSION_DURATION_MS / 1000),
    });

    return response;
  } catch (error) {
    console.error('Error in admin auth POST:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: End admin session and clear the cookie.
 */
export async function DELETE() {
  const response = NextResponse.json({
    authenticated: false,
    message: 'Logged out successfully',
  });

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return response;
}
