import fs from 'fs';
import path from 'path';
import {
  supabaseAdmin,
  checkIsSupabaseAdminConfigured,
  STORAGE_BUCKET,
} from '@/lib/supabase';

let bucketVerified = false;

/**
 * Ensures the dedicated Supabase Storage bucket exists and is public.
 * Automatically creates it using admin service privileges if missing.
 */
export async function ensurePostersBucket(): Promise<boolean> {
  const isConfigured = checkIsSupabaseAdminConfigured();
  if (!isConfigured) return false;
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
 * Uploads a poster image directly to the Supabase Storage bucket ('posters').
 * Never writes to the local filesystem (compatible with read-only serverless hosting).
 *
 * Steps:
 * 1. Validate image data & Supabase configuration
 * 2. Generate unique filename & storage path
 * 3. Upload to Supabase Storage bucket with content-type
 * 4. Obtain and return the public storage URL
 */
export async function uploadPosterToStorage(
  buffer: Buffer,
  filename: string,
  mimeType: string = 'image/png'
): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new Error('Cannot upload an empty image buffer.');
  }

  const isConfigured = checkIsSupabaseAdminConfigured();
  if (!isConfigured) {
    throw new Error(
      'Supabase Storage is not configured on the server. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in your environment variables.'
    );
  }

  const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const storagePath = `uploads/${uniquePrefix}-${cleanFilename}`;

  // 1. Ensure dedicated 'posters' bucket exists
  await ensurePostersBucket();

  // 2. Upload file to Supabase Storage
  let { error: uploadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  // If upload failed due to bucket initialization, retry once
  if (uploadError) {
    const errorMsg = uploadError.message?.toLowerCase() || '';
    if (errorMsg.includes('not found') || errorMsg.includes('bucket')) {
      bucketVerified = false;
      await ensurePostersBucket();
      const retryResult = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });
      uploadError = retryResult.error;
    }
  }

  if (uploadError) {
    throw new Error(`Supabase Storage upload failed (${STORAGE_BUCKET}): ${uploadError.message}`);
  }

  // 3. Get and return the public URL
  const { data: urlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  if (!urlData?.publicUrl) {
    throw new Error('Failed to retrieve public URL from Supabase Storage.');
  }

  return urlData.publicUrl;
}

/**
 * Cleans up stored poster files from Supabase Storage.
 */
export async function deletePosterFromStorage(imageUrl: string): Promise<void> {
  try {
    if (!imageUrl) return;

    if (checkIsSupabaseAdminConfigured() && imageUrl.includes(`/storage/v1/object/public/${STORAGE_BUCKET}/`)) {
      const parts = imageUrl.split(`/storage/v1/object/public/${STORAGE_BUCKET}/`);
      if (parts[1]) {
        await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([decodeURIComponent(parts[1])]);
        return;
      }
    }

    // Gracefully handle legacy /uploads/ URLs without crashing on read-only environments
    if (imageUrl.startsWith('/uploads/')) {
      try {
        const localPath = path.join(process.cwd(), 'public', imageUrl);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      } catch {
        // Safe to ignore read-only filesystem errors for legacy local paths
      }
    }
  } catch (err) {
    console.error('Error cleaning up poster storage asset:', err);
  }
}
