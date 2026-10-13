import dns from 'dns/promises';
import { NextResponse } from 'next/server';
import {
  checkIsSupabaseConfigured,
  checkIsSupabaseAdminConfigured,
  getSupabaseConfigStatus,
  getCleanSupabaseUrl,
  getCleanSupabasePublishableKey,
  getCleanSupabaseSecretKey,
  supabase,
  supabaseAdmin,
  STORAGE_BUCKET,
} from '@/lib/supabase';
import { ensurePostersBucket } from '@/lib/server-storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configStatus = getSupabaseConfigStatus();
  const isAdminReady = checkIsSupabaseAdminConfigured();
  const isClientReady = checkIsSupabaseConfigured();

  const report: {
    status: 'configured' | 'pending_project_url' | 'unconfigured';
    frontendClient: {
      ready: boolean;
      usingPublishableKey: boolean;
    };
    serverAdminClient: {
      ready: boolean;
      usingSecretKey: boolean;
    };
    networkDiagnostic?: {
      urlHostMasked: string;
      urlProtocol: string;
      urlEndsWithSupabaseCo: boolean;
      dnsResolved: boolean;
      dnsError?: string;
      rawFetchStatus?: number;
      rawFetchError?: string;
      rawFetchCause?: string;
    };
    database: {
      connected: boolean;
      error?: string;
    };
    storage: {
      bucket: string;
      verified: boolean;
      error?: string;
    };
    missingValues: string[];
    note: string;
  } = {
    status: 'unconfigured',
    frontendClient: {
      ready: isClientReady,
      usingPublishableKey: Boolean(getCleanSupabasePublishableKey()),
    },
    serverAdminClient: {
      ready: isAdminReady,
      usingSecretKey: Boolean(getCleanSupabaseSecretKey()),
    },
    database: {
      connected: false,
    },
    storage: {
      bucket: STORAGE_BUCKET,
      verified: false,
    },
    missingValues: configStatus.missingValues,
    note: '',
  };

  // If URL is the only missing value
  if (
    configStatus.missingValues.length === 1 &&
    configStatus.missingValues[0].includes('SUPABASE_URL')
  ) {
    report.status = 'pending_project_url';
    report.note =
      'Supabase Publishable and Secret credentials are configured properly. The Supabase Project URL is the only missing value.';
  } else if (isAdminReady || isClientReady) {
    report.status = 'configured';
    report.note = 'Supabase credentials and URL are detected and active.';

    // Safe network & DNS diagnostic
    const resolvedUrl = getCleanSupabaseUrl();
    if (resolvedUrl) {
      try {
        const parsed = new URL(resolvedUrl);
        const host = parsed.hostname;
        let masked = host;
        if (host.length > 8) {
          masked = `${host.slice(0, 3)}...${host.slice(-10)}`;
        }
        report.networkDiagnostic = {
          urlHostMasked: masked,
          urlProtocol: parsed.protocol,
          urlEndsWithSupabaseCo: host.endsWith('.supabase.co'),
          dnsResolved: false,
        };

        try {
          const lookup = await dns.lookup(host);
          report.networkDiagnostic.dnsResolved = Boolean(lookup?.address);
        } catch (e: unknown) {
          report.networkDiagnostic.dnsResolved = false;
          report.networkDiagnostic.dnsError =
            e instanceof Error ? e.message : String(e);
        }

        try {
          const pingRes = await fetch(`${resolvedUrl}/rest/v1/`, {
            method: 'GET',
            headers: {
              apikey: getCleanSupabaseSecretKey() || getCleanSupabasePublishableKey(),
            },
          });
          report.networkDiagnostic.rawFetchStatus = pingRes.status;
        } catch (e: unknown) {
          report.networkDiagnostic.rawFetchError =
            e instanceof Error ? e.message : String(e);
          const cause = (e as { cause?: { code?: string; message?: string } })?.cause;
          report.networkDiagnostic.rawFetchCause =
            cause?.code || cause?.message || String(cause || '');
        }
      } catch (err: unknown) {
        report.networkDiagnostic = {
          urlHostMasked: 'malformed_url',
          urlProtocol: 'invalid',
          urlEndsWithSupabaseCo: false,
          dnsResolved: false,
          dnsError: err instanceof Error ? err.message : String(err),
        };
      }
    }

    const client = isAdminReady ? supabaseAdmin : supabase;

    // Test database connection
    try {
      const { error: dbError } = await client
        .from('templates')
        .select('id')
        .limit(1);

      if (!dbError) {
        report.database.connected = true;
      } else {
        report.database.connected = false;
        report.database.error = (dbError.message || JSON.stringify(dbError)).replace(/sb_[A-Za-z0-9_-]+/g, '[REDACTED]');
      }
    } catch (err: unknown) {
      report.database.connected = false;
      const cause = (err as { cause?: { code?: string; message?: string } })?.cause;
      const causeStr = cause?.code ? ` (${cause.code})` : '';
      report.database.error = `${err instanceof Error ? err.message : String(err)}${causeStr}`.replace(
        /sb_[A-Za-z0-9_-]+/g,
        '[REDACTED]'
      );
    }

    // Test storage connection
    try {
      const bucketOk = await ensurePostersBucket();
      report.storage.verified = bucketOk;
    } catch (err: unknown) {
      report.storage.verified = false;
      const cause = (err as { cause?: { code?: string; message?: string } })?.cause;
      const causeStr = cause?.code ? ` (${cause.code})` : '';
      report.storage.error = `${err instanceof Error ? err.message : String(err)}${causeStr}`.replace(
        /sb_[A-Za-z0-9_-]+/g,
        '[REDACTED]'
      );
    }
  } else {
    report.note = `Setup ready. Missing values: ${configStatus.missingValues.join(', ')}`;
  }

  return NextResponse.json(report);
}
