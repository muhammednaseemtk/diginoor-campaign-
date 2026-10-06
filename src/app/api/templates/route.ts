import { NextResponse } from 'next/server';
import { templateDb } from '@/lib/db/templates';
import { CreateTemplateInput, PhotoArea } from '@/lib/types/template';
import { uploadPosterToStorage } from '@/lib/server-storage';
import { isRequestAdmin } from '@/lib/admin-auth';
import sharp from 'sharp';

async function detectCutoutWindow(buffer: Buffer): Promise<PhotoArea | null> {
  try {
    const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
    if (info.channels < 4) return null;
    const { width, height, channels } = info;
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let transCount = 0;

    const marginX = Math.max(15, Math.floor(width * 0.02));
    const marginY = Math.max(15, Math.floor(height * 0.02));

    for (let y = marginY; y < height - marginY; y++) {
      for (let x = marginX; x < width - marginX; x++) {
        const idx = (y * width + x) * channels;
        const a = data[idx + 3];
        if (a < 128) {
          transCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (transCount > 500 && maxX > minX && maxY > minY) {
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      if (w >= 100 && h >= 100) {
        return {
          x: minX,
          y: minY,
          width: w,
          height: h,
          borderRadius: 20,
          layer: 'behind',
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const templates = await templateDb.getAll();
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isRequestAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required to upload or create posters.' },
        { status: 401 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let finalImageUrl = '';
    let title = '';
    let slug = '';
    let category = 'General';
    let description = '';
    let posterWidth = 1080;
    let posterHeight = 1350;
    let customPhotoArea: PhotoArea | null = null;
    let uploadedBuffer: Buffer | null = null;

    // Handle multipart/form-data upload (Direct file upload from Admin)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      title = (formData.get('title') as string) || '';
      slug = (formData.get('slug') as string) || '';
      category = (formData.get('category') as string) || 'General';
      description = (formData.get('description') as string) || '';
      const w = Number(formData.get('width'));
      const h = Number(formData.get('height'));
      if (w > 0) posterWidth = w;
      if (h > 0) posterHeight = h;

      const rawPhotoArea = formData.get('photoArea') as string | null;
      if (rawPhotoArea) {
        try {
          customPhotoArea = JSON.parse(rawPhotoArea);
        } catch {}
      }

      if (file && file.size > 0) {
        const mimeType = file.type || 'image/png';
        if (!mimeType.startsWith('image/')) {
          return NextResponse.json(
            { error: 'Invalid file type. Please upload a valid image (PNG, JPG, WebP, SVG).' },
            { status: 400 }
          );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        uploadedBuffer = buffer;
        const originalName = file.name || `poster-${Date.now()}.png`;
        finalImageUrl = await uploadPosterToStorage(buffer, originalName, mimeType);

        // Automatically infer title from filename if not explicitly provided
        if (!title.trim()) {
          title = originalName
            .replace(/\.[^/.]+$/, '')
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
        }
      } else {
        const existingUrl = formData.get('posterImage') as string | null;
        if (existingUrl) finalImageUrl = existingUrl;
      }
    } else {
      // Handle JSON payload
      const body = await request.json();
      finalImageUrl = body.posterImage || body.base_image_url || '';
      title = body.title?.trim() || '';
      slug = body.slug?.trim() || '';
      category = body.category?.trim() || 'General';
      description = body.description?.trim() || '';
      if (body.width) posterWidth = Number(body.width);
      if (body.height) posterHeight = Number(body.height);
      if (body.photoArea) customPhotoArea = body.photoArea;

      // If posterImage is a base64 payload, upload to Supabase Storage (with fallback)
      if (finalImageUrl && finalImageUrl.startsWith('data:image')) {
        const matches = finalImageUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          uploadedBuffer = buffer;
          const ext = mimeType.split('/')[1] || 'png';
          const filename = `poster-${Date.now()}.${ext}`;
          finalImageUrl = await uploadPosterToStorage(buffer, filename, mimeType);
        }
      }
    }

    if (!finalImageUrl) {
      return NextResponse.json(
        { error: 'No poster image file or URL provided.' },
        { status: 400 }
      );
    }

    // Auto-generate clean title if missing
    if (!title.trim()) {
      title = `Poster Template ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    // Auto-generate unique slug
    const baseSlug =
      slug.trim() ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const uniqueSlug = `${baseSlug || 'poster'}-${Date.now().toString(36).substring(3, 7)}`;

    // Automatically compute the required image/place configuration
    let photoArea: PhotoArea;

    if (customPhotoArea) {
      photoArea = {
        x: Number(customPhotoArea.x),
        y: Number(customPhotoArea.y),
        width: Number(customPhotoArea.width),
        height: Number(customPhotoArea.height),
        borderRadius: Number(customPhotoArea.borderRadius ?? 16),
        layer: customPhotoArea.layer === 'behind' ? 'behind' : 'inside',
      };
    } else {
      let detectedArea: PhotoArea | null = null;
      if (uploadedBuffer) {
        detectedArea = await detectCutoutWindow(uploadedBuffer);
      }

      if (detectedArea) {
        photoArea = detectedArea;
      } else {
        const defaultBoxW = Math.round(posterWidth * 0.55);
        const defaultBoxH = Math.round(posterHeight * 0.45);
        const defaultBoxX = Math.round((posterWidth - defaultBoxW) / 2);
        const defaultBoxY = Math.round(posterHeight * 0.22);
        photoArea = {
          x: defaultBoxX,
          y: defaultBoxY,
          width: defaultBoxW,
          height: defaultBoxH,
          borderRadius: 16,
          layer: 'inside',
        };
      }
    }

    const templateInput: CreateTemplateInput = {
      title,
      slug: uniqueSlug,
      description: description.trim() || `Ready-made ${title} poster template.`,
      category: category.trim() || 'General',
      width: posterWidth,
      height: posterHeight,
      posterImage: finalImageUrl,
      photoArea,
      sampleUserPhoto: '/templates/sample-portrait.jpg',
    };

    const created = await templateDb.create(templateInput);
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : 'Failed to create template';
    const cleanMessage = rawMessage.replace(/sb_[A-Za-z0-9_-]+/g, '[REDACTED]');
    console.error('Error creating template:', cleanMessage);
    return NextResponse.json({ error: cleanMessage }, { status: 500 });
  }
}
