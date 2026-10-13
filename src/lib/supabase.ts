import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Strips surrounding single/double quotes, escaped quotes, and trailing whitespace/newlines.
 */
export function cleanEnvValue(val?: string | null): string {
  if (!val || typeof val !== 'string') return '';
  let str = val.trim();
  // Strip outer backticks (`...`)
  if (str.startsWith('`') && str.endsWith('`') && str.length >= 2) {
    str = str.slice(1, -1).trim();
  }
  // Strip outer quotes ("..." or '...')
  if (
    (str.startsWith('"') && str.endsWith('"') && str.length >= 2) ||
    (str.startsWith("'") && str.endsWith("'") && str.length >= 2)
  ) {
    str = str.slice(1, -1).trim();
  }
  // Strip escaped quotes (\"...\")
  if (str.startsWith('\\"') && str.endsWith('\\"') && str.length >= 4) {
    str = str.slice(2, -2).trim();
  }
  // Strip accidental trailing semicolon
  if (str.endsWith(';')) {
    str = str.slice(0, -1).trim();
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
 * Normalizes any valid Supabase Project URL or identifier:
 * - Ensures https:// protocol is present
 * - Resolves pure 20-character project reference IDs into https://<id>.supabase.co
 * - Extracts project ref if user pasted dashboard URL (supabase.com/dashboard/project/<ref>)
 * - Strips trailing slashes, quotes, and whitespace
 */
export function normalizeSupabaseUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  let cleaned = cleanEnvValue(url);
  if (!cleaned) return '';

  // Extract ref from Postgres connection string if user accidentally pasted database URI
  const dbUriMatch = cleaned.match(/@(?:db\.)?([a-zA-Z0-9_-]+)\.supabase\.co/i);
  if (dbUriMatch && dbUriMatch[1]) {
    cleaned = `https://${dbUriMatch[1]}.supabase.co`;
  }

  // Extract ref from Supabase dashboard URL if user accidentally pasted dashboard link
  const dashboardMatch = cleaned.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    cleaned = `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Handle db.<ref>.supabase.co (pooler/direct host prefix)
  const dbPrefixMatch = cleaned.match(/^https?:\/\/db\.([a-zA-Z0-9_-]+)\.supabase\.co/i);
  if (dbPrefixMatch && dbPrefixMatch[1]) {
    cleaned = `https://${dbPrefixMatch[1]}.supabase.co`;
  }

  // Auto-correct common .supabase.com domain typo to .supabase.co
  const comMatch = cleaned.match(/^https?:\/\/([a-zA-Z0-9_-]+)\.supabase\.com(?::\d+)?(\/.*)?$/i);
  if (comMatch && comMatch[1]) {
    cleaned = `https://${comMatch[1]}.supabase.co${comMatch[2] || ''}`;
  }

  // Strip database port (e.g., :5432 or :6543) if appended to HTTP url
  const portMatch = cleaned.match(/^(https?:\/\/[a-zA-Z0-9_.-]+(?:\.supabase\.co)):(?:\d+)(\/.*)?$/i);
  if (portMatch && portMatch[1]) {
    cleaned = portMatch[1] + (portMatch[2] || '');
  }

  // Strip trailing /rest/v1 or /storage/v1 endpoints from base URL
  cleaned = cleaned.replace(/\/(?:rest|storage)\/v1\/?$/i, '');

  // Handle pure 20-character project ref (standard Supabase project identifier)
  if (/^[a-zA-Z0-9]{20}$/.test(cleaned)) {
    cleaned = `https://${cleaned}.supabase.co`;
  }

  // Prepend https:// if protocol is missing (e.g., "xxxx.supabase.co")
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }

  return cleaned.replace(/\/+$/, '');
}

/**
 * Checks if a given Supabase URL is placeholder or unconfigured
 */
export function isPlaceholderUrl(url?: string): boolean {
  if (!url) return true;
  const normalized = normalizeSupabaseUrl(url).toLowerCase();
  return (
    (!normalized.startsWith('http://') && !normalized.startsWith('https://')) ||
    normalized.includes('your-project-id') ||
    normalized.includes('your-supabase-url') ||
    normalized.includes('placeholder.supabase.co') ||
    normalized.includes('://.supabase.co') ||
    normalized === 'http://' ||
    normalized === 'https://' ||
    normalized === 'https://supabase.com' ||
    normalized === 'http://supabase.com' ||
    normalized.includes('example.com')
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
 * Helper to validate a candidate Supabase URL string.
 * Returns normalized URL if valid and non-placeholder, or empty string otherwise.
 */
function resolveValidSupabaseUrl(candidate?: string | null): string {
  if (!candidate || typeof candidate !== 'string') return '';
  const normalized = normalizeSupabaseUrl(candidate);
  if (normalized && !isPlaceholderUrl(normalized)) {
    return normalized;
  }
  return '';
}

/**
 * Helper to validate a candidate Supabase Key string.
 * Returns cleaned key if non-placeholder, or empty string otherwise.
 */
function resolveValidKey(candidate?: string | null): string {
  if (!candidate || typeof candidate !== 'string') return '';
  const cleaned = cleanEnvValue(candidate);
  if (cleaned && !isPlaceholderKey(cleaned)) {
    return cleaned;
  }
  return '';
}

/**
 * Resolves the Supabase Project URL from any configured environment alias.
 * Ensures trailing slashes and quotes are cleanly stripped, and normalizes valid URLs.
 *
 * CRITICAL VERCEL COMPILE/RUNTIME FIX:
 * 1. Checks direct static member accesses for server runtime (SUPABASE_URL) FIRST.
 *    In Next.js, direct static member expressions (process.env.SUPABASE_URL) are preserved
 *    as runtime lookups on the server.
 * 2. Never lets a build-time inlined NEXT_PUBLIC_* placeholder shadow a live server SUPABASE_URL.
 *    Each candidate is individually validated with resolveValidSupabaseUrl() so placeholders
 *    are rejected and fallbacks are evaluated.
 * 3. Falls back to dynamic runtime lookup across all process.env aliases.
 */
export function getCleanSupabaseUrl(): string {
  // 1. Direct static member accesses: Server variables checked FIRST, followed by public aliases
  const resolved =
    resolveValidSupabaseUrl(process.env.SUPABASE_URL) ||
    resolveValidSupabaseUrl(process.env.SUPABASE_PROJECT_URL) ||
    resolveValidSupabaseUrl(process.env.SUPABASE_API_URL) ||
    resolveValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    resolveValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL) ||
    resolveValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_API_URL);

  if (resolved) return resolved;

  // 2. Dynamic runtime lookup fallback across all process.env keys and aliases
  if (typeof process !== 'undefined' && process.env) {
    const candidates = [
      'SUPABASE_URL',
      'SUPABASE_PROJECT_URL',
      'SUPABASE_API_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_PROJECT_URL',
      'NEXT_PUBLIC_SUPABASE_API_URL',
    ];

    for (const key of candidates) {
      const valid = resolveValidSupabaseUrl(process.env[key]);
      if (valid) return valid;
    }

    const allKeys = Object.keys(process.env);
    for (const targetKey of candidates) {
      const lowerTarget = targetKey.toLowerCase();
      const matched = allKeys.find((k) => k.trim().toLowerCase() === lowerTarget);
      if (matched) {
        const valid = resolveValidSupabaseUrl(process.env[matched]);
        if (valid) return valid;
      }
    }
  }

  return '';
}

/**
 * Resolves the server-only Supabase Secret Key (service role) from environment aliases.
 * NEVER exposed in browser/client contexts.
 */
export function getCleanSupabaseSecretKey(): string {
  if (typeof window !== 'undefined') return '';

  // 1. Direct static member accesses
  const resolved =
    resolveValidKey(process.env.SUPABASE_SECRET_KEY) ||
    resolveValidKey(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    resolveValidKey(process.env.SUPABASE_SERVICE_KEY) ||
    resolveValidKey(process.env.SUPABASE_SECRET) ||
    resolveValidKey(process.env.SUPABASE_KEY) ||
    resolveValidKey(process.env.SERVICE_ROLE_KEY) ||
    resolveValidKey(process.env.SECRET_KEY);

  if (resolved) return resolved;

  // 2. Dynamic runtime lookup fallback
  if (typeof process !== 'undefined' && process.env) {
    const candidates = [
      'SUPABASE_SECRET_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_SERVICE_KEY',
      'SUPABASE_SECRET',
      'SUPABASE_KEY',
      'SERVICE_ROLE_KEY',
      'SECRET_KEY',
    ];

    for (const key of candidates) {
      const valid = resolveValidKey(process.env[key]);
      if (valid) return valid;
    }

    const allKeys = Object.keys(process.env);
    for (const targetKey of candidates) {
      const lowerTarget = targetKey.toLowerCase();
      const matched = allKeys.find((k) => k.trim().toLowerCase() === lowerTarget);
      if (matched) {
        const valid = resolveValidKey(process.env[matched]);
        if (valid) return valid;
      }
    }
  }

  return '';
}

/**
 * Resolves the public Supabase Publishable / Anon Key.
 */
export function getCleanSupabasePublishableKey(): string {
  // 1. Direct static member accesses for build-time compiler inlining
  const resolved =
    resolveValidKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    resolveValidKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    resolveValidKey(process.env.NEXT_PUBLIC_SUPABASE_KEY) ||
    resolveValidKey(process.env.SUPABASE_PUBLISHABLE_KEY) ||
    resolveValidKey(process.env.SUPABASE_ANON_KEY);

  if (resolved) return resolved;

  // 2. Dynamic runtime lookup fallback
  if (typeof process !== 'undefined' && process.env) {
    const candidates = [
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_KEY',
      'SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_ANON_KEY',
    ];

    for (const key of candidates) {
      const valid = resolveValidKey(process.env[key]);
      if (valid) return valid;
    }

    const allKeys = Object.keys(process.env);
    for (const targetKey of candidates) {
      const lowerTarget = targetKey.toLowerCase();
      const matched = allKeys.find((k) => k.trim().toLowerCase() === lowerTarget);
      if (matched) {
        const valid = resolveValidKey(process.env[matched]);
        if (valid) return valid;
      }
    }
  }

  return '';
}

// Dedicated storage bucket for Diginoor posters (defaults to 'posters')
export const STORAGE_BUCKET =
  cleanEnvValue(process.env.SUPABASE_STORAGE_BUCKET) ||
  cleanEnvValue(process.env.NEXT_PUBLIC_STORAGE_BUCKET) ||
  getCleanEnvVar(['SUPABASE_STORAGE_BUCKET', 'NEXT_PUBLIC_STORAGE_BUCKET']) ||
  'posters';

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

  // Safe diagnostic logging: booleans only, NEVER log credentials, URLs, or secrets
  console.log('[Supabase Admin Diagnostic]', {
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL?.trim()),
    hasNextPublicUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    hasSecretKey: Boolean(
      process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    ),
    resolvedUrlValid: hasValidUrl,
    resolvedKeyValid: hasValidKey,
    isFullyConfigured: hasValidUrl && hasValidKey,
  });

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
