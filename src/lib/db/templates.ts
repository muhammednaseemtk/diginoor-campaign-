import fs from 'fs';
import path from 'path';
import { PosterTemplate, CreateTemplateInput, PhotoArea, PosterTextOverlay } from '@/lib/types/template';
import {
  supabase,
  supabaseAdmin,
  checkIsSupabaseConfigured,
  checkIsSupabaseAdminConfigured,
} from '@/lib/supabase';
import { deletePosterFromStorage } from '@/lib/server-storage';
import { categoryDb } from '@/lib/db/categories';

const DATA_FILE_PATH = path.join(process.cwd(), 'data.json');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DEFAULT_TEMPLATES: PosterTemplate[] = [];

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
  let parsed: Record<string, unknown> = {};
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { x: 200, y: 250, width: 680, height: 650, borderRadius: 16, layer: 'inside', textOverlays: [] };
    }
  } else if (raw && typeof raw === 'object') {
    parsed = raw as Record<string, unknown>;
  } else {
    return { x: 200, y: 250, width: 680, height: 650, borderRadius: 16, layer: 'inside', textOverlays: [] };
  }

  const rawTexts = Array.isArray(parsed.textOverlays) ? parsed.textOverlays : [];
  const textOverlays: PosterTextOverlay[] = rawTexts.map((item: Partial<PosterTextOverlay>) => ({
    id: item.id || `txt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    text: String(item.text || ''),
    x: Number(item.x) || 540,
    y: Number(item.y) || 1200,
    fontSize: Number(item.fontSize) || 54,
    fontFamily: item.fontFamily || 'system-ui, -apple-system, sans-serif',
    color: item.color || '#ffffff',
    fontWeight: item.fontWeight || 'bold',
    textAlign: (item.textAlign as 'left' | 'center' | 'right') || 'center',
    shadowColor: item.shadowColor || 'rgba(0,0,0,0.85)',
    shadowBlur: Number(item.shadowBlur ?? 8),
  }));

  return {
    x: Number(parsed.x) || 200,
    y: Number(parsed.y) || 250,
    width: Number(parsed.width) || 680,
    height: Number(parsed.height) || 650,
    borderRadius: Number(parsed.borderRadius) || 16,
    layer: parsed.layer === 'behind' ? 'behind' : 'inside',
    textOverlays,
  };
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
  const cleanTemplates = templates.filter((t) => !isUnwantedDefaultPoster(t));
  let existingCategories: string[] = [];
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.categories)) {
        existingCategories = parsed.categories;
      }
    }
  } catch {}
  fs.writeFileSync(
    DATA_FILE_PATH,
    JSON.stringify({ templates: cleanTemplates, categories: existingCategories }, null, 2),
    'utf-8'
  );
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
            .map((row) => {
              const photoArea = parseCanvasConfig(row.canvas_config);
              return {
                id: String(row.id),
                title: row.title,
                slug: row.slug,
                description: row.description || '',
                category: row.category || 'General',
                width: Number(row.width) || 1080,
                height: Number(row.height) || 1350,
                posterImage: row.base_image_url,
                photoArea,
                textOverlays: photoArea.textOverlays || [],
                sampleUserPhoto: '/templates/sample-portrait.jpg',
                createdAt: row.created_at || new Date().toISOString(),
              };
            })
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
  getBySlug: async (
    slugOrId: string,
    hints?: { id?: string; slug?: string }
  ): Promise<PosterTemplate | null> => {
    if (UNWANTED_DEFAULT_SLUGS.includes(slugOrId) || UNWANTED_DEFAULT_IDS.includes(slugOrId)) {
      return null;
    }

    const candidateId = hints?.id || (UUID_REGEX.test(slugOrId) ? slugOrId : undefined);
    const candidateSlug = hints?.slug || (!UUID_REGEX.test(slugOrId) ? slugOrId : undefined);

    const isConfigured = checkIsSupabaseAdminConfigured() || checkIsSupabaseConfigured();
    if (isConfigured) {
      try {
        const client = checkIsSupabaseAdminConfigured() ? supabaseAdmin : supabase;
        let data: Record<string, unknown> | null = null;

        // 1. Try querying by candidateId if it's a valid UUID
        if (candidateId && UUID_REGEX.test(candidateId)) {
          const res = await client.from('templates').select('*').eq('id', candidateId).maybeSingle();
          if (!res.error && res.data) {
            data = res.data;
          }
        }

        // 2. Try querying by candidateSlug
        if (!data && candidateSlug) {
          const res = await client.from('templates').select('*').eq('slug', candidateSlug).maybeSingle();
          if (!res.error && res.data) {
            data = res.data;
          }
        }

        // 3. Try slugOrId as slug
        if (!data && slugOrId) {
          const res = await client.from('templates').select('*').eq('slug', slugOrId).maybeSingle();
          if (!res.error && res.data) {
            data = res.data;
          }
        }

        // 4. Try slugOrId as id if UUID
        if (!data && slugOrId && UUID_REGEX.test(slugOrId) && slugOrId !== candidateId) {
          const res = await client.from('templates').select('*').eq('id', slugOrId).maybeSingle();
          if (!res.error && res.data) {
            data = res.data;
          }
        }

        if (data) {
          const photoArea = parseCanvasConfig(data.canvas_config);
          const template: PosterTemplate = {
            id: String(data.id),
            title: String(data.title || ''),
            slug: String(data.slug || ''),
            description: String(data.description || ''),
            category: String(data.category || 'General'),
            width: Number(data.width) || 1080,
            height: Number(data.height) || 1350,
            posterImage: String(data.base_image_url || ''),
            photoArea,
            textOverlays: photoArea.textOverlays || [],
            sampleUserPhoto: '/templates/sample-portrait.jpg',
            createdAt: String(data.created_at || new Date().toISOString()),
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
    return (
      list.find(
        (t) =>
          t.slug === slugOrId ||
          t.id === slugOrId ||
          (candidateId && t.id === candidateId) ||
          (candidateSlug && t.slug === candidateSlug)
      ) || null
    );
  },

  /**
   * Fetches template by unique database ID.
   */
  getById: async (id: string): Promise<PosterTemplate | null> => {
    return templateDb.getBySlug(id, { id });
  },

  /**
   * Creates a new poster template:
   * 1. Inserts into Supabase 'templates' database table using elevated server client.
   * 2. Obtains the unique database UUID.
   * 3. Retains the exact photo-area and text-overlay configuration associated with that record.
   */
  create: async (input: CreateTemplateInput): Promise<PosterTemplate> => {
    const isConfigured = checkIsSupabaseAdminConfigured();
    const photoAreaToStore = {
      ...input.photoArea,
      textOverlays: input.textOverlays || input.photoArea.textOverlays || [],
    };

    // Auto-register category
    if (input.category) {
      categoryDb.create(input.category).catch(() => {});
    }

    // 1. If Supabase admin client is configured, save directly to database table 'templates'
    if (isConfigured) {
      const { data, error } = await supabaseAdmin
        .from('templates')
        .insert({
          title: input.title,
          slug: input.slug,
          base_image_url: input.posterImage,
          canvas_config: JSON.stringify(photoAreaToStore),
          category: input.category || 'General',
          description: input.description || '',
          width: input.width || 1080,
          height: input.height || 1350,
        })
        .select('*')
        .single();

      if (error) {
        const errorMsg = error.message || '';
        if (errorMsg.toLowerCase().includes('fetch failed')) {
          throw new Error(
            'Failed to save template to database: Network connection failed (fetch failed). Please verify that SUPABASE_URL in Vercel is set to your active Supabase project URL (https://<project-ref>.supabase.co) and the project is active on Supabase.'
          );
        }
        throw new Error(`Failed to save template to database: ${error.message}`);
      }

      if (!data) {
        throw new Error('Database insert completed but returned no record.');
      }

      const createdPhotoArea = parseCanvasConfig(data.canvas_config);
      const created: PosterTemplate = {
        id: String(data.id),
        title: data.title,
        slug: data.slug,
        description: data.description || '',
        category: data.category || 'General',
        width: Number(data.width) || 1080,
        height: Number(data.height) || 1350,
        posterImage: data.base_image_url,
        photoArea: createdPhotoArea,
        textOverlays: createdPhotoArea.textOverlays || [],
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

    // 2. Local fallback if Supabase is not configured
    const created: PosterTemplate = {
      id: `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: input.title,
      slug: input.slug,
      description: input.description || '',
      category: input.category || 'General',
      width: input.width || 1080,
      height: input.height || 1350,
      posterImage: input.posterImage,
      photoArea: photoAreaToStore,
      textOverlays: photoAreaToStore.textOverlays || [],
      sampleUserPhoto: '/templates/sample-portrait.jpg',
      createdAt: new Date().toISOString(),
    };
    try {
      const list = readData();
      list.unshift(created);
      writeData(list);
    } catch {}

    return created;
  },

  /**
   * Updates an existing poster template record in Supabase & locally.
   */
  update: async (slugOrId: string, updates: Partial<PosterTemplate>): Promise<PosterTemplate | null> => {
    if (updates.category) {
      categoryDb.create(updates.category).catch(() => {});
    }

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
        if (updates.photoArea || updates.textOverlays) {
          const baseArea = updates.photoArea || (index !== -1 ? list[index].photoArea : {});
          payload.canvas_config = JSON.stringify({
            ...baseArea,
            textOverlays: updates.textOverlays ?? updates.photoArea?.textOverlays ?? (index !== -1 ? list[index].textOverlays : []),
          });
        }
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
          const updatedArea = parseCanvasConfig(data.canvas_config);
          return {
            id: String(data.id),
            title: data.title,
            slug: data.slug,
            description: data.description || '',
            category: data.category || 'General',
            width: Number(data.width) || 1080,
            height: Number(data.height) || 1350,
            posterImage: data.base_image_url,
            photoArea: updatedArea,
            textOverlays: updatedArea.textOverlays || [],
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
   * Deletes a poster template permanently from persistent storage (Supabase database and local file).
   * Ensures:
   * 1. Resolves record across persistent sources and admin hints before deletion.
   * 2. Permanently deletes the record from Supabase table 'templates' using verified returning queries.
   * 3. Associated image is deleted from Supabase Storage only when not shared with other posters.
   * 4. Completely removes from local data.json so no fallback can recreate it.
   * 5. Returns true on success or false if record was not found.
   */
  delete: async (
    slugOrId: string,
    hints?: { id?: string; slug?: string }
  ): Promise<boolean> => {
    // 1. Locate template across persistent sources (Supabase and local data.json)
    const toDelete =
      (await templateDb.getBySlug(slugOrId, hints)) ||
      (hints?.id ? await templateDb.getBySlug(hints.id) : null) ||
      (hints?.slug ? await templateDb.getBySlug(hints.slug) : null) ||
      readData().find(
        (t) =>
          t.id === slugOrId ||
          t.slug === slugOrId ||
          (hints?.id && t.id === hints.id) ||
          (hints?.slug && t.slug === hints.slug)
      ) ||
      null;

    const list = readData();
    const localIndex = list.findIndex(
      (t) =>
        t.id === slugOrId ||
        t.slug === slugOrId ||
        (hints?.id && t.id === hints.id) ||
        (hints?.slug && t.slug === hints.slug) ||
        (toDelete && (t.id === toDelete.id || t.slug === toDelete.slug))
    );

    // If template does not exist in persistent sources or local cache
    if (!toDelete && localIndex === -1) {
      return false;
    }

    const posterImage =
      toDelete?.posterImage || (localIndex !== -1 ? list[localIndex].posterImage : undefined);
    const targetId = toDelete?.id || hints?.id || (localIndex !== -1 ? list[localIndex].id : undefined);
    const targetSlug = toDelete?.slug || hints?.slug || (localIndex !== -1 ? list[localIndex].slug : undefined);

    // 2. Remove permanently from Supabase database first if configured
    const isSupabaseActive = checkIsSupabaseAdminConfigured() || checkIsSupabaseConfigured();
    if (isSupabaseActive) {
      if (!checkIsSupabaseAdminConfigured()) {
        throw new Error('Supabase admin credentials are required to permanently delete templates from database.');
      }

      let deletedRowsCount = 0;

      // 2a. Delete by UUID if targetId or slugOrId is a UUID
      const candidateUuid =
        targetId && UUID_REGEX.test(targetId)
          ? targetId
          : UUID_REGEX.test(slugOrId)
          ? slugOrId
          : null;

      if (candidateUuid) {
        const { data, error } = await supabaseAdmin
          .from('templates')
          .delete()
          .eq('id', candidateUuid)
          .select('id, slug, base_image_url');

        if (error) {
          console.error('Error deleting template by ID from Supabase DB:', error);
          throw new Error(`Failed to delete template from database: ${error.message}`);
        }
        if (Array.isArray(data)) {
          deletedRowsCount += data.length;
        }
      }

      // 2b. Delete by slug if targetSlug or candidate slug exists
      const candidateSlug =
        targetSlug || (!UUID_REGEX.test(slugOrId) ? slugOrId : null);

      if (candidateSlug && deletedRowsCount === 0) {
        const { data, error } = await supabaseAdmin
          .from('templates')
          .delete()
          .eq('slug', candidateSlug)
          .select('id, slug, base_image_url');

        if (error) {
          console.error('Error deleting template by slug from Supabase DB:', error);
          throw new Error(`Failed to delete template from database: ${error.message}`);
        }
        if (Array.isArray(data)) {
          deletedRowsCount += data.length;
        }
      }

      // 2c. If still 0 rows deleted, attempt fallback with slugOrId directly
      if (deletedRowsCount === 0 && slugOrId) {
        if (UUID_REGEX.test(slugOrId) && slugOrId !== candidateUuid) {
          const { data, error } = await supabaseAdmin
            .from('templates')
            .delete()
            .eq('id', slugOrId)
            .select('id, slug, base_image_url');
          if (error) throw new Error(`Failed to delete template from database: ${error.message}`);
          if (Array.isArray(data)) deletedRowsCount += data.length;
        } else if (!UUID_REGEX.test(slugOrId) && slugOrId !== candidateSlug) {
          const { data, error } = await supabaseAdmin
            .from('templates')
            .delete()
            .eq('slug', slugOrId)
            .select('id, slug, base_image_url');
          if (error) throw new Error(`Failed to delete template from database: ${error.message}`);
          if (Array.isArray(data)) deletedRowsCount += data.length;
        }
      }
    }

    // 3. Remove associated poster image only if not shared with other posters
    if (posterImage) {
      const isShared = await isPosterImageShared(posterImage, targetId, targetSlug);
      if (!isShared) {
        await deletePosterFromStorage(posterImage);
      }
    }

    // 4. Remove from local data.json persistent cache
    const filtered = list.filter((t) => {
      if (t.id === slugOrId || t.slug === slugOrId) return false;
      if (targetId && t.id === targetId) return false;
      if (targetSlug && t.slug === targetSlug) return false;
      if (hints?.id && t.id === hints.id) return false;
      if (hints?.slug && t.slug === hints.slug) return false;
      if (toDelete && (t.id === toDelete.id || t.slug === toDelete.slug)) return false;
      return true;
    });

    writeData(filtered);

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
