import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Strips surrounding single/double quotes, escaped quotes, and trailing whitespace/newlines.
 */
export function cleanEnvValue(val?: string | null): string {
  if (!val || typeof val !== 'string') return '';
  let str = val.trim();
  // Strip outer quotes ("..." or '...')
  if (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1).trim();
  }
  // Strip escaped quotes (\"...\")
  if (str.startsWith('\\"') && str.endsWith('\\"')) {
    str = str.slice(2, -2).trim();
  }
  return str;
}

/**
 * Robust environment variable resolver:
 * 1. Checks exact property matches
 * 2. Checks case-insensitive and trimmed names in process.env
 */
export function getCleanEnvVar(names: string[]): string {
  if (typeof process === 'undefined' || !process.env) return '';

  // 1. Direct property access
  for (const name of names) {
    const val = process.env[name];
    if (val && typeof val === 'string' && val.trim()) {
      const cleaned = cleanEnvValue(val);
      if (cleaned) return cleaned;
    }
  }

  // 2. Case-insensitive and trimmed match across process.env keys
  const keys = Object.keys(process.env);
  for (const name of names) {
    const target = name.trim().toLowerCase();
    const matchedKey = keys.find((k) => k.trim().toLowerCase() === target);
    if (matchedKey) {
      const val = process.env[matchedKey];
      if (val && typeof val === 'string' && val.trim()) {
        const cleaned = cleanEnvValue(val);
        if (cleaned) return cleaned;
      }
    }
  }

  return '';
}

/**
 * Resolves the Supabase Project URL from any configured environment alias.
 * Ensures trailing slashes and quotes are cleanly stripped.
 *
 * CRITICAL VERCEL COMPILE/RUNTIME FIX:
 * Next.js (Turbopack/Webpack) inlines NEXT_PUBLIC_* variables into JavaScript bundles
 * at build time ONLY when referenced as direct static member expressions
 * (e.g. process.env.NEXT_PUBLIC_SUPABASE_URL).
 * Dynamic property bracket accesses (e.g. process.env[name]) are NOT inlined by the compiler.
 * In Vercel Serverless Function runtime (AWS Lambda), NEXT_PUBLIC_* variables are NOT
 * injected into Lambda process.env. Therefore, direct static member expressions are
 * required so Turbopack embeds the build-time value directly into server route bundles.
 */
export function getCleanSupabaseUrl(): string {
  // 1. Direct static member accesses for build-time compiler inlining
  const staticCandidate =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ||
    process.env.SUPABASE_API_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_API_URL;

  let raw = '';
  if (staticCandidate && typeof staticCandidate === 'string' && staticCandidate.trim()) {
    raw = cleanEnvValue(staticCandidate);
  }

  // 2. Dynamic runtime lookup fallback across all process.env keys and aliases
  if (!raw) {
    raw = getCleanEnvVar([
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_URL',
      'SUPABASE_PROJECT_URL',
      'NEXT_PUBLIC_SUPABASE_PROJECT_URL',
      'SUPABASE_API_URL',
      'NEXT_PUBLIC_SUPABASE_API_URL',
    ]);
  }

  if (!raw) return '';
  return raw.replace(/\/+$/, '');
}

/**
 * Resolves the server-only Supabase Secret Key (service role) from environment aliases.
 * NEVER exposed in browser/client contexts.
 */
export function getCleanSupabaseSecretKey(): string {
  if (typeof window !== 'undefined') return '';

  // 1. Direct static member accesses
  const staticCandidate =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET ||
    process.env.SUPABASE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.SECRET_KEY;

  if (staticCandidate && typeof staticCandidate === 'string' && staticCandidate.trim()) {
    return cleanEnvValue(staticCandidate);
  }

  // 2. Dynamic runtime lookup fallback
  return getCleanEnvVar([
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_SECRET',
    'SUPABASE_KEY',
    'SERVICE_ROLE_KEY',
    'SECRET_KEY',
  ]);
}

/**
 * Resolves the public Supabase Publishable / Anon Key.
 */
export function getCleanSupabasePublishableKey(): string {
  // 1. Direct static member accesses for build-time compiler inlining
  const staticCandidate =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (staticCandidate && typeof staticCandidate === 'string' && staticCandidate.trim()) {
    return cleanEnvValue(staticCandidate);
  }

  // 2. Dynamic runtime lookup fallback
  return getCleanEnvVar([
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY',
  ]);
}

// Dedicated storage bucket for Diginoor posters (defaults to 'posters')
export const STORAGE_BUCKET =
  getCleanEnvVar(['SUPABASE_STORAGE_BUCKET', 'NEXT_PUBLIC_STORAGE_BUCKET']) || 'posters';

/**
 * Checks if a given Supabase URL is placeholder or unconfigured
 */
export function isPlaceholderUrl(url?: string): boolean {
  if (!url) return true;
  const cleaned = cleanEnvValue(url).toLowerCase();
  return (
    (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) ||
    cleaned.includes('your-project-id') ||
    cleaned.includes('your-supabase-url') ||
    cleaned.includes('placeholder.supabase.co') ||
    cleaned === 'http://' ||
    cleaned === 'https://'
  );
}

/**
 * Checks if a given Supabase API key is placeholder or unconfigured
 */
export function isPlaceholderKey(key?: string): boolean {
  if (!key) return true;
  const cleaned = cleanEnvValue(key).toLowerCase();
  return (
    cleaned.includes('your-') ||
    cleaned.includes('placeholder') ||
    cleaned === 'undefined' ||
    cleaned === 'null' ||
    cleaned.length < 10
  );
}

/**
 * Dynamically checks whether the public Supabase client or server client is configured.
 */
export function checkIsSupabaseConfigured(): boolean {
  const url = getCleanSupabaseUrl();
  const pubKey = getCleanSupabasePublishableKey();
  if (url && !isPlaceholderUrl(url) && pubKey && !isPlaceholderKey(pubKey)) {
    return true;
  }
  // On the server, if secret key is present, database operations are also fully available
  if (typeof window === 'undefined') {
    const secKey = getCleanSupabaseSecretKey();
    if (url && !isPlaceholderUrl(url) && secKey && !isPlaceholderKey(secKey)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks dynamically whether the server-side admin client is fully configured with a secret key
 */
export function checkIsSupabaseAdminConfigured(): boolean {
  if (typeof window !== 'undefined') return false;
  const url = getCleanSupabaseUrl();
  const key = getCleanSupabaseSecretKey();
  return Boolean(
    url &&
    !isPlaceholderUrl(url) &&
    key &&
    !isPlaceholderKey(key)
  );
}

/**
 * Returns detailed diagnostic information regarding server admin configuration.
 * Pinpoints specifically whether the URL, the secret key, or both are missing or placeholder.
 */
export function getSupabaseAdminConfigStatus(): {
  isConfigured: boolean;
  missingUrl: boolean;
  missingKey: boolean;
  urlConfigured: boolean;
  keyConfigured: boolean;
} {
  if (typeof window !== 'undefined') {
    return {
      isConfigured: false,
      missingUrl: true,
      missingKey: true,
      urlConfigured: false,
      keyConfigured: false,
    };
  }

  const url = getCleanSupabaseUrl();
  const key = getCleanSupabaseSecretKey();
  const hasValidUrl = Boolean(url && !isPlaceholderUrl(url));
  const hasValidKey = Boolean(key && !isPlaceholderKey(key));

  return {
    isConfigured: hasValidUrl && hasValidKey,
    missingUrl: !hasValidUrl,
    missingKey: !hasValidKey,
    urlConfigured: hasValidUrl,
    keyConfigured: hasValidKey,
  };
}

/**
 * Static compatibility exports
 */
export const isSupabaseConfigured: boolean = checkIsSupabaseConfigured();
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

  const url = getCleanSupabaseUrl();
  if (!url || isPlaceholderUrl(url)) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL');
  }

  const pubKey = getCleanSupabasePublishableKey();
  if (!pubKey || isPlaceholderKey(pubKey)) {
    missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }

  const secKey = getCleanSupabaseSecretKey();
  if (!secKey || isPlaceholderKey(secKey)) {
    missing.push('SUPABASE_SECRET_KEY');
  }

  return {
    isConfigured: checkIsSupabaseConfigured(),
    isAdminConfigured: checkIsSupabaseAdminConfigured(),
    missingValues: missing,
  };
}

/**
 * Public Supabase client configuration safe for frontend use.
 * Uses ONLY the Supabase URL and Publishable Key.
 * NEVER exposes secret or service-role keys to browser bundles.
 */
let cachedPublicClient: SupabaseClient | null = null;
let cachedPublicUrl = '';
let cachedPublicKey = '';

export function getSupabaseClient(): SupabaseClient {
  const url = getCleanSupabaseUrl();
  const pubKey = getCleanSupabasePublishableKey();

  if (url && !isPlaceholderUrl(url) && pubKey && !isPlaceholderKey(pubKey)) {
    if (cachedPublicClient && cachedPublicUrl === url && cachedPublicKey === pubKey) {
      return cachedPublicClient;
    }
    cachedPublicUrl = url;
    cachedPublicKey = pubKey;
    cachedPublicClient = createClient(url, pubKey, {
      auth: {
        persistSession: false,
      },
    });
    return cachedPublicClient;
  }

  // If server context and secret key is available, fallback to admin client for server-side queries
  if (typeof window === 'undefined') {
    const secretKey = getCleanSupabaseSecretKey();
    if (url && !isPlaceholderUrl(url) && secretKey && !isPlaceholderKey(secretKey)) {
      return getSupabaseAdminClient();
    }
  }

  if (!cachedPublicClient) {
    cachedPublicClient = createClient('https://placeholder.supabase.co', 'placeholder-anon-key', {
      auth: {
        persistSession: false,
      },
    });
  }
  return cachedPublicClient;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const val = Reflect.get(client, prop);
    return typeof val === 'function' ? val.bind(client) : val;
  },
});

/**
 * Server-side Supabase client with elevated privileges for trusted backend operations.
 * Uses the Supabase Secret Key (Service Role / sb_secret_*).
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

  const url = getCleanSupabaseUrl();
  const key = getCleanSupabaseSecretKey();

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
  if (checkIsSupabaseConfigured()) {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(`logos/${encodeURIComponent(fileName)}`);
    if (data?.publicUrl) return data.publicUrl;
  }
  return `/${encodeURIComponent(fileName)}`;
}

/**
 * Returns the public storage URL for any asset path inside the dedicated bucket.
 */
export function getStoragePublicUrl(storagePath: string, fallbackUrl?: string): string {
  if (checkIsSupabaseConfigured()) {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    if (data?.publicUrl) return data.publicUrl;
  }
  return fallbackUrl || storagePath;
}
