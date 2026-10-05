import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-supabase-url') &&
  !supabaseUrl.includes('your-project-id') &&
  supabaseKey &&
  !supabaseKey.includes('your-supabase-anon-key')
);

export const STORAGE_BUCKET = 'posters';

/**
 * Public Supabase client configuration safe for frontend use.
 * Does not expose secret/service-role keys.
 */
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : (createClient('https://placeholder.supabase.co', 'placeholder-anon-key'));

/**
 * Server-side Supabase client with elevated service-role privileges if configured.
 * Falls back to public client if service role key is not provided.
 */
export const supabaseAdmin: SupabaseClient = (isSupabaseConfigured && serviceRoleKey && !serviceRoleKey.includes('your-'))
  ? createClient(supabaseUrl, serviceRoleKey)
  : supabase;

/**
 * Returns the public URL for logo assets, loading from Supabase Storage
 * when configured, or falling back to local /public assets.
 */
export function getLogoAssetUrl(fileName: 'Logo PNG 01.svg' | 'Logo PNG.svg' | 'logo.svg'): string {
  if (isSupabaseConfigured) {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(`logos/${encodeURIComponent(fileName)}`);
    if (data?.publicUrl) return data.publicUrl;
  }
  return `/${encodeURIComponent(fileName)}`;
}

/**
 * Returns the public storage URL for any asset path inside the dedicated bucket.
 */
export function getStoragePublicUrl(storagePath: string, fallbackUrl?: string): string {
  if (isSupabaseConfigured) {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    if (data?.publicUrl) return data.publicUrl;
  }
  return fallbackUrl || storagePath;
}
