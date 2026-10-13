import { NextResponse } from 'next/server';
import { categoryDb } from '@/lib/db/categories';
import { isRequestAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const categories = await categoryDb.getAll();
    return NextResponse.json({ categories }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch categories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isRequestAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required to manage categories.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return NextResponse.json(
        { error: 'Category name cannot be empty.' },
        { status: 400 }
      );
    }

    const result = await categoryDb.create(name);
    return NextResponse.json({
      success: true,
      category: result.category,
      categories: result.categories,
    }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
