import { NextResponse } from 'next/server';
import { templateDb } from '@/lib/db/templates';
import { isRequestAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const url = new URL(request.url);
    const idHint = url.searchParams.get('id') || undefined;
    const slugHint = url.searchParams.get('slug') || undefined;

    const template =
      (await templateDb.getBySlug(decodedSlug, { id: idHint, slug: slugHint })) ||
      (idHint ? await templateDb.getById(idHint) : null);
    
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    return NextResponse.json(template, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
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
    if (!isRequestAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required to update templates.' },
        { status: 401 }
      );
    }

    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const body = await request.json();
    const updated = await templateDb.update(decodedSlug, body);
    
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
    if (!isRequestAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required to delete templates.' },
        { status: 401 }
      );
    }

    const { slug } = await params;
    const decodedSlug = decodeURIComponent(slug);
    const url = new URL(request.url);
    const idHint = url.searchParams.get('id') || undefined;
    const slugHint = url.searchParams.get('slug') || undefined;

    const deleted = await templateDb.delete(decodedSlug, { id: idHint, slug: slugHint });
    
    if (!deleted) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { success: true, message: 'Template deleted permanently' },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Failed to delete template';
    const cleanMessage = rawMessage.replace(/sb_[A-Za-z0-9_-]+/g, '[REDACTED]');
    console.error('Error deleting template:', cleanMessage);
    return NextResponse.json({ error: cleanMessage }, { status: 500 });
  }
}
