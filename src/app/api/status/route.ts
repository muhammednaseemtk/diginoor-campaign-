import { NextResponse } from 'next/server';
import {
  isSupabaseConfigured,
  isSupabaseAdminConfigured,
  getSupabaseConfigStatus,
  supabase,
  supabaseAdmin,
  STORAGE_BUCKET,
} from '@/lib/supabase';
import { ensurePostersBucket } from '@/lib/server-storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configStatus = getSupabaseConfigStatus();

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
      ready: isSupabaseConfigured,
      usingPublishableKey: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
    },
    serverAdminClient: {
      ready: isSupabaseAdminConfigured,
      usingSecretKey: Boolean(
        process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY
      ),
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
  } else if (isSupabaseConfigured && isSupabaseAdminConfigured) {
    report.status = 'configured';
    report.note = 'Supabase credentials and URL are fully configured.';

    // Test database connection
    try {
      const { error: dbError } = await supabase
        .from('templates')
        .select('id')
        .limit(1);

      if (!dbError) {
        report.database.connected = true;
      } else {
        report.database.connected = false;
        report.database.error = dbError.message.replace(/sb_[A-Za-z0-9_-]+/g, '[REDACTED]');
      }
    } catch (err) {
      report.database.connected = false;
      report.database.error = (err instanceof Error ? err.message : String(err)).replace(
        /sb_[A-Za-z0-9_-]+/g,
        '[REDACTED]'
      );
    }

    // Test storage connection
    try {
      const bucketOk = await ensurePostersBucket();
      report.storage.verified = bucketOk;
    } catch (err) {
      report.storage.verified = false;
      report.storage.error = (err instanceof Error ? err.message : String(err)).replace(
        /sb_[A-Za-z0-9_-]+/g,
        '[REDACTED]'
      );
    }
  } else {
    report.note = `Setup ready. Missing values: ${configStatus.missingValues.join(', ')}`;
  }

  return NextResponse.json(report);
}
