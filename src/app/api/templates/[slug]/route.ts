import { NextResponse } from 'next/server';
import { templateDb } from '@/lib/db/templates';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const template = (await templateDb.getBySlug(slug)) || (await templateDb.getById(slug));
    
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    return NextResponse.json(template);
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Failed to fetch template';
    const cleanMessage = rawMessage.replace(/sb_[A-Za-z0-9_-]+/g, '[REDACTED]');
    console.error('Error fetching template:', cleanMessage);
    return NextResponse.json({ error: cleanMessage }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const updated = await templateDb.update(slug, body);
    
    if (!updated) {
      return NextResponse.json({ error: 'Template not found or update failed' }, { status: 404 });
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Failed to update template';
    const cleanMessage = rawMessage.replace(/sb_[A-Za-z0-9_-]+/g, '[REDACTED]');
    console.error('Error updating template:', cleanMessage);
    return NextResponse.json({ error: cleanMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const deleted = await templateDb.delete(slug);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Failed to delete template';
    const cleanMessage = rawMessage.replace(/sb_[A-Za-z0-9_-]+/g, '[REDACTED]');
    console.error('Error deleting template:', cleanMessage);
    return NextResponse.json({ error: cleanMessage }, { status: 500 });
  }
}
