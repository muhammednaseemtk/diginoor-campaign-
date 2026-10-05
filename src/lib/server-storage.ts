import fs from 'fs';
import path from 'path';
import { supabaseAdmin, isSupabaseAdminConfigured, STORAGE_BUCKET } from '@/lib/supabase';

let bucketVerified = false;

/**
 * Ensures the dedicated Supabase Storage bucket exists and is public.
 * Automatically creates it using admin service privileges if missing.
 */
export async function ensurePostersBucket(): Promise<boolean> {
  if (!isSupabaseAdminConfigured) return false;
  if (bucketVerified) return true;

  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) {
      console.warn('Unable to list Supabase storage buckets:', listError.message);
      return false;
    }

    const exists = buckets?.some(
      (b) => b.id === STORAGE_BUCKET || b.name === STORAGE_BUCKET
    );

    if (!exists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 15728640, // 15MB limit
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
      });

      if (createError) {
        console.warn(`Unable to create Supabase storage bucket '${STORAGE_BUCKET}':`, createError.message);
        return false;
      }
    }

    bucketVerified = true;
    return true;
  } catch (err) {
    console.warn('Exception during Supabase storage bucket verification:', err);
    return false;
  }
}

/**
 * Uploads a poster image to Supabase Storage with graceful fallback to local storage.
 * Automatically generates a public read URL.
 *
 * Steps:
 * 1. Validate image data
 * 2. Ensure bucket exists
 * 3. Generate unique filename & storage path
 * 4. Upload to Supabase Storage with content-type
 * 5. Obtain public URL
 */
export async function uploadPosterToStorage(
  buffer: Buffer,
  filename: string,
  mimeType: string = 'image/png'
): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new Error('Cannot upload an empty image buffer.');
  }

  const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const storagePath = `uploads/${uniquePrefix}-${cleanFilename}`;

  if (isSupabaseAdminConfigured) {
    try {
      // 1. Ensure storage bucket exists
      await ensurePostersBucket();

      // 2. Upload file to Supabase Storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!uploadError) {
        // 3. Get the public URL
        const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
      } else {
        console.warn('Supabase storage upload error, using local fallback:', uploadError.message);
      }
    } catch (err) {
      console.warn('Supabase storage upload exception, using local fallback:', err);
    }
  }

  // Local fallback storage (when Supabase project URL is not yet configured)
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const localFilename = `poster-${uniquePrefix}-${cleanFilename}`;
  fs.writeFileSync(path.join(uploadDir, localFilename), buffer);
  return `/uploads/${localFilename}`;
}

/**
 * Cleans up stored poster files from Supabase Storage or local storage.
 */
export async function deletePosterFromStorage(imageUrl: string): Promise<void> {
  try {
    if (!imageUrl) return;

    if (isSupabaseAdminConfigured && imageUrl.includes(`/storage/v1/object/public/${STORAGE_BUCKET}/`)) {
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
