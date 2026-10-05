import fs from 'fs';
import path from 'path';
import { supabaseAdmin, isSupabaseConfigured, STORAGE_BUCKET } from '@/lib/supabase';

/**
 * Uploads a poster image to Supabase Storage with graceful fallback to local storage.
 * Automatically generates a public read URL.
 */
export async function uploadPosterToStorage(
  buffer: Buffer,
  filename: string,
  mimeType: string = 'image/png'
): Promise<string> {
  const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `uploads/${Date.now()}-${cleanFilename}`;

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!error) {
        const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
      } else {
        console.warn('Supabase storage upload returned error, falling back to local:', error.message);
      }
    } catch (err) {
      console.warn('Supabase upload exception, falling back to local:', err);
    }
  }

  // Local fallback storage
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const localFilename = `poster-${Date.now()}-${cleanFilename}`;
  fs.writeFileSync(path.join(uploadDir, localFilename), buffer);
  return `/uploads/${localFilename}`;
}

/**
 * Cleans up stored poster files from Supabase Storage or local storage.
 */
export async function deletePosterFromStorage(imageUrl: string): Promise<void> {
  try {
    if (!imageUrl) return;

    if (isSupabaseConfigured && imageUrl.includes(`/storage/v1/object/public/${STORAGE_BUCKET}/`)) {
      const parts = imageUrl.split(`/storage/v1/object/public/${STORAGE_BUCKET}/`);
      if (parts[1]) {
        await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([decodeURIComponent(parts[1])]);
        return;
      }
    }

    if (imageUrl.startsWith('/uploads/')) {
      const localPath = path.join(process.cwd(), 'public', imageUrl);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }
  } catch (err) {
    console.error('Error cleaning up poster storage asset:', err);
  }
}
