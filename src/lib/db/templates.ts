import fs from 'fs';
import path from 'path';
import { PosterTemplate, CreateTemplateInput, PhotoArea } from '@/lib/types/template';
import {
  supabase,
  supabaseAdmin,
  checkIsSupabaseConfigured,
  checkIsSupabaseAdminConfigured,
} from '@/lib/supabase';
import { deletePosterFromStorage } from '@/lib/server-storage';

const DATA_FILE_PATH = path.join(process.cwd(), 'data.json');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DEFAULT_TEMPLATES: PosterTemplate[] = [
  {
    id: 'tpl-1791129688649-kvvog',
    title: '20261004 200434',
    slug: '20261004-200434-0dcu',
    description: 'Ready-made 20261004 200434 poster template.',
    category: 'Ready-Made Posters',
    width: 960,
    height: 1280,
    posterImage: '/uploads/poster-1791129688640-20261004_200434.png',
    photoArea: {
      x: 69,
      y: 328,
      width: 830,
      height: 767,
      borderRadius: 20,
      layer: 'behind',
    },
    sampleUserPhoto: '/templates/sample-portrait.jpg',
    createdAt: '2026-10-04T16:01:28.649Z',
  },
];

export const UNWANTED_DEFAULT_SLUGS = [
  'tech-summit-keynote',
  'employee-of-the-month',
  'neon-beats-music-festival',
  'champion-athlete-spotlight',
  'graduation-class-2026',
  'wanted-vintage-outlaw',
];

export const UNWANTED_DEFAULT_IDS = [
  'tpl-tech-summit',
  'tpl-employee-award',
  'tpl-music-festival',
  'tpl-athlete-spotlight',
  'tpl-graduation-2026',
  'tpl-wanted-vintage',
];

export function isUnwantedDefaultPoster(template?: { id?: string; slug?: string; posterImage?: string } | null): boolean {
  if (!template) return false;
  if (template.slug && UNWANTED_DEFAULT_SLUGS.includes(template.slug)) return true;
  if (template.id && UNWANTED_DEFAULT_IDS.includes(template.id)) return true;
  if (template.posterImage && (
    template.posterImage.includes('/templates/tech-summit.svg') ||
    template.posterImage.includes('/templates/employee-award.svg') ||
    template.posterImage.includes('/templates/music-festival.svg') ||
    template.posterImage.includes('/templates/athlete-spotlight.svg') ||
    template.posterImage.includes('/templates/graduation.svg') ||
    template.posterImage.includes('/templates/vintage-wanted.svg')
  )) {
    return true;
  }
  return false;
}

let supabaseCleanupRan = false;

function parseCanvasConfig(raw: unknown): PhotoArea {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return { x: 200, y: 250, width: 680, height: 650, borderRadius: 16, layer: 'inside' };
    }
  }
  if (raw && typeof raw === 'object') {
    return raw as PhotoArea;
  }
  return { x: 200, y: 250, width: 680, height: 650, borderRadius: 16, layer: 'inside' };
}

async function isPosterImageShared(
  imageUrl: string,
  excludeId?: string,
  excludeSlug?: string
): Promise<boolean> {
  if (!imageUrl) return false;

  // Never delete default/sample template stock assets
  if (imageUrl.startsWith('/templates/') || imageUrl.includes('sample-portrait')) {
    return true;
  }

  // Check Supabase if configured
  if (checkIsSupabaseAdminConfigured()) {
    try {
      const { data } = await supabaseAdmin
        .from('templates')
        .select('id, slug')
        .eq('base_image_url', imageUrl);

      if (Array.isArray(data)) {
        const others = data.filter(
          (row) => String(row.id) !== excludeId && row.slug !== excludeSlug
        );
        if (others.length > 0) {
          return true;
        }
      }
    } catch (err) {
      console.warn('Error checking shared image in Supabase:', err);
    }
  }

  // Check local data.json
  const localList = readData();
  const localOthers = localList.filter(
    (t) => t.id !== excludeId && t.slug !== excludeSlug && t.posterImage === imageUrl
  );
  return localOthers.length > 0;
}

function readData(): PosterTemplate[] {
  try {
    if (!fs.existsSync(DATA_FILE_PATH)) {
      writeData(DEFAULT_TEMPLATES);
      return DEFAULT_TEMPLATES;
    }
    const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(fileContent);
    const rawList: PosterTemplate[] = Array.isArray(parsed.templates) ? parsed.templates : [];

    // Filter out any unwanted default/demo templates
    const cleanList = rawList.filter((t) => !isUnwantedDefaultPoster(t));

    if (cleanList.length !== rawList.length) {
      writeData(cleanList);
    }

    return cleanList;
  } catch (err) {
    console.error('Error reading template data:', err);
    return [];
  }
}

function writeData(templates: PosterTemplate[]) {
  try {
    const cleanTemplates = templates.filter((t) => !isUnwantedDefaultPoster(t));
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify({ templates: cleanTemplates }, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing template data:', err);
  }
}

export const templateDb = {
  /**
   * Fetches all poster templates from Supabase with graceful fallback/merge
   * to ensure ready-made posters are always accessible.
   */
  getAll: async (): Promise<PosterTemplate[]> => {
    const isConfigured = checkIsSupabaseAdminConfigured() || checkIsSupabaseConfigured();
    if (isConfigured) {
      try {
        const client = checkIsSupabaseAdminConfigured() ? supabaseAdmin : supabase;

        // Perform one-time cleanup on Supabase table if admin client is available
        if (checkIsSupabaseAdminConfigured() && !supabaseCleanupRan) {
          supabaseCleanupRan = true;
          try {
            await supabaseAdmin.from('templates').delete().in('slug', UNWANTED_DEFAULT_SLUGS);
            await supabaseAdmin.from('templates').delete().in('id', UNWANTED_DEFAULT_IDS);
          } catch (cleanErr) {
            console.warn('Notice: Default poster cleanup check in Supabase:', cleanErr);
          }
        }

        const { data, error } = await client
          .from('templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const remoteList: PosterTemplate[] = data
            .map((row) => ({
              id: String(row.id),
              title: row.title,
              slug: row.slug,
              description: row.description || '',
              category: row.category || 'General',
              width: Number(row.width) || 1080,
              height: Number(row.height) || 1350,
              posterImage: row.base_image_url,
              photoArea: parseCanvasConfig(row.canvas_config),
              sampleUserPhoto: '/templates/sample-portrait.jpg',
              createdAt: row.created_at || new Date().toISOString(),
            }))
            .filter((t) => !isUnwantedDefaultPoster(t));

          // Keep local cache file synchronized with Supabase persistent state
          try {
            writeData(remoteList);
          } catch {
            // Ignore in read-only filesystems
          }

          return remoteList;
        }
      } catch (err) {
        console.warn('Failed to fetch from Supabase templates table, falling back to local:', err);
      }
    }

    return readData().filter((t) => !isUnwantedDefaultPoster(t));
  },

  /**
   * Fetches a single poster template by slug or unique ID.
   * Handles UUID check carefully so PostgreSQL does not throw a 22P02 syntax error.
   */
  getBySlug: async (slugOrId: string): Promise<PosterTemplate | null> => {
    if (UNWANTED_DEFAULT_SLUGS.includes(slugOrId) || UNWANTED_DEFAULT_IDS.includes(slugOrId)) {
      return null;
    }

    const isConfigured = checkIsSupabaseAdminConfigured() || checkIsSupabaseConfigured();
    if (isConfigured) {
      try {
        const client = checkIsSupabaseAdminConfigured() ? supabaseAdmin : supabase;
        const isUuid = UUID_REGEX.test(slugOrId);
        let query = client.from('templates').select('*');

        if (isUuid) {
          query = query.or(`id.eq.${slugOrId},slug.eq.${slugOrId}`);
        } else {
          query = query.eq('slug', slugOrId);
        }

        const { data, error } = await query.maybeSingle();

        if (!error && data) {
          const template: PosterTemplate = {
            id: String(data.id),
            title: data.title,
            slug: data.slug,
            description: data.description || '',
            category: data.category || 'General',
            width: Number(data.width) || 1080,
            height: Number(data.height) || 1350,
            posterImage: data.base_image_url,
            photoArea: parseCanvasConfig(data.canvas_config),
            sampleUserPhoto: '/templates/sample-portrait.jpg',
            createdAt: data.created_at || new Date().toISOString(),
          };

          if (isUnwantedDefaultPoster(template)) {
            return null;
          }

          return template;
        }
      } catch (err) {
        console.warn('Supabase query error in getBySlug:', err);
      }
    }

    const list = readData().filter((t) => !isUnwantedDefaultPoster(t));
    return list.find((t) => t.slug === slugOrId || t.id === slugOrId) || null;
  },

  /**
   * Fetches template by unique database ID.
   */
  getById: async (id: string): Promise<PosterTemplate | null> => {
    return templateDb.getBySlug(id);
  },

  /**
   * Creates a new poster template:
   * 1. Inserts into Supabase 'templates' database table using elevated server client.
   * 2. Obtains the unique database UUID.
   * 3. Retains the exact photo-area configuration associated with that record.
   */
  create: async (input: CreateTemplateInput): Promise<PosterTemplate> => {
    const isConfigured = checkIsSupabaseAdminConfigured();
    // 1. If Supabase admin client is configured, save directly to database table 'templates'
    if (isConfigured) {
      const { data, error } = await supabaseAdmin
        .from('templates')
        .insert({
          title: input.title,
          slug: input.slug,
          base_image_url: input.posterImage,
          canvas_config: JSON.stringify(input.photoArea),
          category: input.category || 'General',
          description: input.description || '',
          width: input.width || 1080,
          height: input.height || 1350,
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to save template to database: ${error.message}`);
      }

      if (!data) {
        throw new Error('Database insert completed but returned no record.');
      }

      const created: PosterTemplate = {
        id: String(data.id),
        title: data.title,
        slug: data.slug,
        description: data.description || '',
        category: data.category || 'General',
        width: Number(data.width) || 1080,
        height: Number(data.height) || 1350,
        posterImage: data.base_image_url,
        photoArea: parseCanvasConfig(data.canvas_config),
        sampleUserPhoto: '/templates/sample-portrait.jpg',
        createdAt: data.created_at || new Date().toISOString(),
      };

      // Safely sync local cache if filesystem permits, but never fail on read-only environments
      try {
        const list = readData();
        list.unshift(created);
        writeData(list);
      } catch {
        // Read-only filesystem in serverless hosting - safely ignore
      }

      return created;
    }

    throw new Error(
      'Supabase database is not configured. Please ensure NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SECRET_KEY are set in your environment variables.'
    );
  },

  /**
   * Updates an existing poster template record in Supabase & locally.
   */
  update: async (slugOrId: string, updates: Partial<PosterTemplate>): Promise<PosterTemplate | null> => {
    const list = readData();
    const index = list.findIndex((t) => t.slug === slugOrId || t.id === slugOrId);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates };
      writeData(list);
    }

    if (checkIsSupabaseAdminConfigured()) {
      try {
        const payload: Record<string, unknown> = {};
        if (updates.title) payload.title = updates.title;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.category) payload.category = updates.category;
        if (updates.photoArea) payload.canvas_config = JSON.stringify(updates.photoArea);
        if (updates.posterImage) payload.base_image_url = updates.posterImage;

        const isUuid = UUID_REGEX.test(slugOrId);
        let query = supabaseAdmin.from('templates').update(payload);

        if (isUuid) {
          query = query.or(`id.eq.${slugOrId},slug.eq.${slugOrId}`);
        } else {
          query = query.eq('slug', slugOrId);
        }

        const { data } = await query.select('*').maybeSingle();
        if (data) {
          return {
            id: String(data.id),
            title: data.title,
            slug: data.slug,
            description: data.description || '',
            category: data.category || 'General',
            width: Number(data.width) || 1080,
            height: Number(data.height) || 1350,
            posterImage: data.base_image_url,
            photoArea: parseCanvasConfig(data.canvas_config),
            sampleUserPhoto: '/templates/sample-portrait.jpg',
            createdAt: data.created_at || new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn('Error updating template in Supabase DB:', err);
      }
    }

    return index !== -1 ? list[index] : null;
  },

  /**
   * Deletes a poster template from persistent storage (Supabase / local data.json).
   * Ensures:
   * 1. Resolves record from Supabase or local cache before deletion.
   * 2. Confirms actual persistent deletion from database and local storage.
   * 3. Associated image is removed only when appropriate and avoids deleting shared images.
   * 4. Returns true on success or false if record was not found.
   */
  delete: async (slugOrId: string): Promise<boolean> => {
    // 1. Locate template across persistent sources
    const toDelete =
      (await templateDb.getBySlug(slugOrId)) ||
      readData().find((t) => t.id === slugOrId || t.slug === slugOrId) ||
      null;

    const list = readData();
    const localIndex = list.findIndex(
      (t) => t.id === slugOrId || t.slug === slugOrId || (toDelete && (t.id === toDelete.id || t.slug === toDelete.slug))
    );

    // If template does not exist in either Supabase or local data
    if (!toDelete && localIndex === -1) {
      return false;
    }

    const posterImage = toDelete?.posterImage || (localIndex !== -1 ? list[localIndex].posterImage : undefined);
    const targetId = toDelete?.id || (localIndex !== -1 ? list[localIndex].id : slugOrId);
    const targetSlug = toDelete?.slug || (localIndex !== -1 ? list[localIndex].slug : slugOrId);

    // 2. Remove associated poster image only if not shared with other posters
    if (posterImage) {
      const isShared = await isPosterImageShared(posterImage, targetId, targetSlug);
      if (!isShared) {
        await deletePosterFromStorage(posterImage);
      }
    }

    // 3. Remove from Supabase DB if configured
    if (checkIsSupabaseAdminConfigured()) {
      let query = supabaseAdmin.from('templates').delete();
      const isUuidTargetId = UUID_REGEX.test(targetId);
      const isUuidSlugOrId = UUID_REGEX.test(slugOrId);

      if (isUuidTargetId && targetSlug && targetSlug !== targetId) {
        query = query.or(`id.eq.${targetId},slug.eq.${targetSlug}`);
      } else if (isUuidTargetId) {
        query = query.eq('id', targetId);
      } else if (isUuidSlugOrId) {
        query = query.eq('id', slugOrId);
      } else if (targetSlug) {
        query = query.eq('slug', targetSlug);
      } else {
        query = query.eq('slug', slugOrId);
      }

      const { error: dbError } = await query;
      if (dbError) {
        console.error('Error deleting template from Supabase DB:', dbError);
        throw new Error(`Failed to delete template from database: ${dbError.message}`);
      }
    }

    // 4. Remove from local data.json
    const filtered = list.filter((t) => {
      if (t.id === slugOrId || t.slug === slugOrId) return false;
      if (targetId && t.id === targetId) return false;
      if (targetSlug && t.slug === targetSlug) return false;
      return true;
    });

    if (filtered.length !== list.length) {
      writeData(filtered);
    }

    return true;
  },

  /**
   * Resets templates to default ready-made posters.
   */
  resetDefaults: async (): Promise<PosterTemplate[]> => {
    writeData(DEFAULT_TEMPLATES);
    return DEFAULT_TEMPLATES;
  },
};
