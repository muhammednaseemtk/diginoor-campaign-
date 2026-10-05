-- Supabase Configuration for Diginoor Ready-Made Poster Photo Replacement

-- 1. Templates Table
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

-- Enable Row Level Security (RLS)
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Public Read Access
CREATE POLICY "Allow public read templates"
ON templates FOR SELECT
TO anon, authenticated
USING (true);

-- Public Insert Access for Admin
CREATE POLICY "Allow public insert templates"
ON templates FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Public Update Access for Admin
CREATE POLICY "Allow public update templates"
ON templates FOR UPDATE
TO anon, authenticated
USING (true);

-- Public Delete Access for Admin
CREATE POLICY "Allow public delete templates"
ON templates FOR DELETE
TO anon, authenticated
USING (true);

-- 2. Dedicated Supabase Storage Bucket ('posters')
INSERT INTO storage.buckets (id, name, public)
VALUES ('posters', 'posters', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for poster images and logo assets
CREATE POLICY "Public Read Posters Bucket"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'posters' );

-- Upload access for poster images and logos
CREATE POLICY "Allow Upload Posters Bucket"
ON storage.objects FOR INSERT
TO public
WITH CHECK ( bucket_id = 'posters' );

-- Update access for posters bucket
CREATE POLICY "Allow Update Posters Bucket"
ON storage.objects FOR UPDATE
TO public
USING ( bucket_id = 'posters' );

-- Delete access for poster cleanup
CREATE POLICY "Allow Delete Posters Bucket"
ON storage.objects FOR DELETE
TO public
USING ( bucket_id = 'posters' );
