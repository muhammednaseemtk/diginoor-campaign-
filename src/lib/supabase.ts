import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Dedicated storage bucket for Diginoor posters
export const STORAGE_BUCKET = 'posters';

// Read client credentials (safe for browser)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

// Read server-only credentials (elevated admin operations)
const serverSupabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';
const supabaseSecretKey =
  (typeof window === 'undefined'
    ? process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    : '') || '';

/**
 * Checks if a given Supabase URL is placeholder or unconfigured
 */
export function isPlaceholderUrl(url?: string): boolean {
  if (!url) return true;
  const trimmed = url.trim().toLowerCase();
  return (
    !trimmed.startsWith('http') ||
    trimmed.includes('your-project-id') ||
    trimmed.includes('your-supabase-url') ||
    trimmed.includes('placeholder.supabase.co')
  );
}

/**
 * Checks if a given Supabase API key is placeholder or unconfigured
 */
export function isPlaceholderKey(key?: string): boolean {
  if (!key) return true;
  const trimmed = key.trim().toLowerCase();
  return (
    trimmed.includes('your-') ||
    trimmed.includes('placeholder')
  );
}

/**
 * Indicates whether the public frontend Supabase client is fully configured
 */
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  !isPlaceholderUrl(supabaseUrl) &&
  supabasePublishableKey &&
  !isPlaceholderKey(supabasePublishableKey)
);

/**
 * Checks dynamically whether the server-side admin client is fully configured with a secret key
 */
export function checkIsSupabaseAdminConfigured(): boolean {
  if (typeof window !== 'undefined') return false;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return Boolean(
    url &&
    !isPlaceholderUrl(url) &&
    key &&
    !isPlaceholderKey(key)
  );
}

/**
 * Indicates whether the server-side admin client is fully configured with a secret key
 */
export const isSupabaseAdminConfigured: boolean = checkIsSupabaseAdminConfigured();

/**
 * Inspects configuration and returns any missing credential types
 */
export function getSupabaseConfigStatus(): {
  isConfigured: boolean;
  isAdminConfigured: boolean;
  missingValues: string[];
} {
  const missing: string[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  if (isPlaceholderUrl(url)) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL');
  }

  const pubKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  if (isPlaceholderKey(pubKey)) {
    missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }

  const secKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  if (isPlaceholderKey(secKey)) {
    missing.push('SUPABASE_SECRET_KEY');
  }

  return {
    isConfigured: isSupabaseConfigured,
    isAdminConfigured: checkIsSupabaseAdminConfigured(),
    missingValues: missing,
  };
}

/**
 * Public Supabase client configuration safe for frontend use.
 * Uses ONLY the Supabase URL and Publishable Key.
 * NEVER exposes secret or service-role keys to browser bundles.
 */
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: false,
      },
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-anon-key', {
      auth: {
        persistSession: false,
      },
    });

/**
 * Server-side Supabase client with elevated privileges for trusted backend operations.
 * Uses the Supabase Secret Key (Service Role).
 *
 * CRITICAL SECURITY RULE:
 * This client is strictly server-side. In client/browser contexts, it falls back to the
 * public client or a restricted instance so secret keys can NEVER leak into browser bundles.
 */
let cachedAdminClient: SupabaseClient | null = null;
let cachedAdminUrl = '';
let cachedAdminKey = '';

export function getSupabaseAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    // Running in the browser: do not instantiate secret client
    return supabase;
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (url && !isPlaceholderUrl(url) && key && !isPlaceholderKey(key)) {
    if (cachedAdminClient && cachedAdminUrl === url && cachedAdminKey === key) {
      return cachedAdminClient;
    }
    cachedAdminUrl = url;
    cachedAdminKey = key;
    cachedAdminClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return cachedAdminClient;
  }

  return supabase;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdminClient();
    const val = Reflect.get(client, prop);
    return typeof val === 'function' ? val.bind(client) : val;
  },
});

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
