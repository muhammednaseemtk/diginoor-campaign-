-- ==============================================================================
-- Supabase Configuration for Diginoor Ready-Made Poster Photo Replacement
-- ==============================================================================

-- 1. TEMPLATES TABLE
-- Stores ready-made poster templates and their designated photo area configurations.
CREATE TABLE IF NOT EXISTS templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  base_image_url text NOT NULL,
  canvas_config text NOT NULL,
  category text DEFAULT 'General',
  description text DEFAULT '',
  width integer DEFAULT 1080,
  height integer DEFAULT 1350,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for high performance slug queries
CREATE INDEX IF NOT EXISTS idx_templates_slug ON templates (slug);

-- Enable Row Level Security (RLS)
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Drop existing public read policy if re-running
DROP POLICY IF EXISTS "Allow public read templates" ON templates;
DROP POLICY IF EXISTS "Allow public insert templates" ON templates;
DROP POLICY IF EXISTS "Allow public update templates" ON templates;
DROP POLICY IF EXISTS "Allow public delete templates" ON templates;

-- PUBLIC READ POLICY:
-- Normal frontend users only receive permissions they actually need (SELECT).
CREATE POLICY "Allow public read templates"
ON templates FOR SELECT
TO anon, authenticated
USING (true);

-- NOTE ON ADMIN MUTATIONS (INSERT, UPDATE, DELETE):
-- Poster creation, editing, and deletion are handled securely on the server
-- using the Supabase Secret Key (Service Role client).
-- The Service Role client automatically bypasses RLS, so frontend clients
-- never receive unauthorized write access and the secret key is NEVER exposed to browsers.

-- 2. DEDICATED SUPABASE STORAGE BUCKET ('posters')
-- Stores ready-made poster designs and user assets.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'posters',
  'posters',
  true,
  15728640, -- 15MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

-- Drop existing storage policies if re-running
DROP POLICY IF EXISTS "Public Read Posters Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload Posters Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update Posters Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow Delete Posters Bucket" ON storage.objects;

-- PUBLIC STORAGE READ:
-- Enables anyone to view and load poster artwork for canvas rendering.
CREATE POLICY "Public Read Posters Bucket"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'posters' );

-- NOTE ON STORAGE UPLOADS & DELETES:
-- Poster uploads and cleanup are performed server-side by the admin client
-- via the SUPABASE_SECRET_KEY, ensuring secure access control.
