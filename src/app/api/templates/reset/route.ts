import { NextResponse } from 'next/server';
import { templateDb } from '@/lib/db/templates';

export async function POST() {
  try {
    const templates = await templateDb.resetDefaults();
    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error('Error resetting templates:', error);
    return NextResponse.json({ error: 'Failed to reset templates' }, { status: 500 });
  }
}
