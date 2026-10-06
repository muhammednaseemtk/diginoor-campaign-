import { NextResponse } from 'next/server';
import { templateDb } from '@/lib/db/templates';
import { isRequestAdmin } from '@/lib/admin-auth';

export async function POST(request: Request) {
  try {
    if (!isRequestAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required.' },
        { status: 401 }
      );
    }

    const templates = await templateDb.resetDefaults();
    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error('Error resetting templates:', error);
    return NextResponse.json({ error: 'Failed to reset templates' }, { status: 500 });
  }
}
