import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_DURATION_MS,
  createAdminSessionToken,
  isRequestAdmin,
  verifyAdminPassword,
} from '@/lib/admin-auth';

export async function GET(request: Request) {
  const authenticated = isRequestAdmin(request);
  return NextResponse.json({ authenticated });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || !verifyAdminPassword(password)) {
      return NextResponse.json(
        { error: 'Invalid admin credentials', authenticated: false },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken();

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      message: 'Admin session authenticated successfully',
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(ADMIN_SESSION_DURATION_MS / 1000),
    });

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    authenticated: false,
    message: 'Logged out successfully',
  });

  response.cookies.delete({
    name: ADMIN_COOKIE_NAME,
    path: '/',
  });

  return response;
}
