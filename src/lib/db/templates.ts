import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PosterTemplate, CreateTemplateInput, PhotoArea } from '@/lib/types/template';
import {
  supabase,
  supabaseAdmin,
  isSupabaseConfigured,
  isSupabaseAdminConfigured,
} from '@/lib/supabase';
import { deletePosterFromStorage } from '@/lib/server-storage';

const DATA_FILE_PATH = path.join(process.cwd(), 'data.json');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DEFAULT_TEMPLATES: PosterTemplate[] = [
  {
    id: 'tpl-tech-summit',
    title: 'Future Tech Summit Keynote',
    slug: 'tech-summit-keynote',
    description: 'Conference headliner & keynote speaker showcase with high-tech glowing accents.',
    category: 'Conferences & Events',
    width: 1080,
    height: 1350,
    posterImage: '/templates/tech-summit.svg',
    photoArea: {
      x: 190,
      y: 320,
      width: 700,
      height: 640,
      borderRadius: 24,
      layer: 'inside',
    },
    sampleUserPhoto: '/templates/sample-portrait.jpg',
    createdAt: '2026-10-01T10:00:00.000Z',
  },
  {
    id: 'tpl-employee-award',
    title: 'Employee of the Month Excellence Award',
    slug: 'employee-of-the-month',
    description: 'Luxury navy blue & gold certificate poster honoring leadership and performance.',
    category: 'Corporate & Awards',
    width: 1080,
    height: 1350,
    posterImage: '/templates/employee-award.svg',
    photoArea: {
      x: 240,
      y: 300,
      width: 600,
      height: 600,
      borderRadius: 20,
      layer: 'inside',
    },
    sampleUserPhoto: '/templates/sample-portrait.jpg',
    createdAt: '2026-10-01T11:00:00.000Z',
  },
  {
    id: 'tpl-music-festival',
    title: 'Neon Beats Music Festival Lineup',
    slug: 'neon-beats-music-festival',
    description: 'Electric synthwave aesthetic with magenta neon glow for concert headliners.',
    category: 'Concerts & Music',
    width: 1080,
    height: 1350,
    posterImage: '/templates/music-festival.svg',
    photoArea: {
      x: 180,
      y: 260,
      width: 720,
      height: 680,
      borderRadius: 20,
      layer: 'inside',
    },
    sampleUserPhoto: '/templates/sample-portrait.jpg',
    createdAt: '2026-10-01T12:00:00.000Z',
  },
  {
    id: 'tpl-athlete-spotlight',
    title: 'Championship Athlete Spotlight',
    slug: 'champion-athlete-spotlight',
    description: 'Dynamic sports poster with fiery orange streaks and aggressive tournament layout.',
    category: 'Sports & Fitness',
    width: 1080,
    height: 1350,
    posterImage: '/templates/athlete-spotlight.svg',
    photoArea: {
      x: 200,
      y: 260,
      width: 680,
      height: 660,
      borderRadius: 16,
      layer: 'inside',
    },
    sampleUserPhoto: '/templates/sample-portrait.jpg',
    createdAt: '2026-10-01T13:00:00.000Z',
  },
  {
    id: 'tpl-graduation-2026',
    title: 'Class of 2026 Graduation Honors',
    slug: 'graduation-class-2026',
    description: 'Royal midnight blue and golden confetti celebration of academic achievement.',
    category: 'Celebrations',
    width: 1080,
    height: 1350,
    posterImage: '/templates/graduation.svg',
    photoArea: {
      x: 240,
      y: 290,
      width: 600,
      height: 620,
      borderRadius: 24,
      layer: 'inside',
    },
    sampleUserPhoto: '/templates/sample-portrait.jpg',
    createdAt: '2026-10-01T14:00:00.000Z',
  },
  {
    id: 'tpl-wanted-vintage',
    title: 'Wild West Wanted Poster',
    slug: 'wanted-vintage-outlaw',
    description: 'Parchment texture and vintage slab typography for fun team awards and birthdays.',
    category: 'Fun & Retro',
    width: 1080,
    height: 1350,
    posterImage: '/templates/vintage-wanted.svg',
    photoArea: {
      x: 220,
      y: 280,
      width: 640,
      height: 620,
      borderRadius: 8,
      layer: 'inside',
    },
    sampleUserPhoto: '/templates/sample-portrait.jpg',
    createdAt: '2026-10-01T15:00:00.000Z',
  },
];

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

function readData(): PosterTemplate[] {
  try {
    if (!fs.existsSync(DATA_FILE_PATH)) {
      writeData(DEFAULT_TEMPLATES);
      return DEFAULT_TEMPLATES;
    }
    const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(fileContent);
    const list: PosterTemplate[] = Array.isArray(parsed.templates) ? parsed.templates : [];

    if (list.length === 0) {
      writeData(DEFAULT_TEMPLATES);
      return DEFAULT_TEMPLATES;
    }

    return list;
  } catch (err) {
    console.error('Error reading template data:', err);
    return DEFAULT_TEMPLATES;
  }
}

function writeData(templates: PosterTemplate[]) {
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify({ templates }, null, 2), 'utf-8');
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
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const remoteList: PosterTemplate[] = data.map((row) => ({
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
          }));

          // Merge local/default templates so existing templates never 404
          const localList = readData();
          const merged = [...remoteList];
          for (const localTpl of localList) {
            if (!merged.some((m) => m.slug === localTpl.slug || m.id === localTpl.id)) {
              merged.push(localTpl);
            }
          }
          return merged;
        }
      } catch (err) {
        console.warn('Failed to fetch from Supabase templates table, falling back to local:', err);
      }
    }

    return readData();
  },

  /**
   * Fetches a single poster template by slug or unique ID.
   * Handles UUID check carefully so PostgreSQL does not throw a 22P02 syntax error.
   */
  getBySlug: async (slugOrId: string): Promise<PosterTemplate | null> => {
    if (isSupabaseConfigured) {
      try {
        const isUuid = UUID_REGEX.test(slugOrId);
        let query = supabase.from('templates').select('*');

        if (isUuid) {
          query = query.or(`id.eq.${slugOrId},slug.eq.${slugOrId}`);
        } else {
          query = query.eq('slug', slugOrId);
        }

        const { data, error } = await query.maybeSingle();

        if (!error && data) {
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
        console.warn('Supabase query error in getBySlug:', err);
      }
    }

    const list = readData();
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
   * 4. Syncs locally to maintain offline/fallback availability.
   */
  create: async (input: CreateTemplateInput): Promise<PosterTemplate> => {
    const list = readData();

    // 1. If Supabase admin client is configured, save directly to database
    if (isSupabaseAdminConfigured) {
      try {
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

        if (!error && data) {
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

          // Cache locally
          list.unshift(created);
          writeData(list);
          return created;
        } else if (error) {
          console.warn('Supabase database insert returned error, falling back to local:', error.message);
        }
      } catch (err) {
        console.warn('Error inserting template into Supabase DB, falling back to local:', err);
      }
    }

    // Fallback local storage
    const fallbackTemplate: PosterTemplate = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    list.unshift(fallbackTemplate);
    writeData(list);
    return fallbackTemplate;
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

    if (isSupabaseAdminConfigured) {
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
   * Deletes a poster template from Supabase Storage & Database.
   */
  delete: async (slugOrId: string): Promise<boolean> => {
    const list = readData();
    const toDelete = list.find((t) => t.id === slugOrId || t.slug === slugOrId);
    const filtered = list.filter((t) => t.id !== slugOrId && t.slug !== slugOrId);

    if (toDelete?.posterImage) {
      await deletePosterFromStorage(toDelete.posterImage);
    }

    if (filtered.length !== list.length) {
      writeData(filtered);
    }

    if (isSupabaseAdminConfigured) {
      try {
        const isUuid = UUID_REGEX.test(slugOrId);
        let query = supabaseAdmin.from('templates').delete();

        if (isUuid) {
          query = query.or(`id.eq.${slugOrId},slug.eq.${slugOrId}`);
        } else {
          query = query.eq('slug', slugOrId);
        }

        await query;
      } catch (err) {
        console.warn('Error deleting template from Supabase DB:', err);
      }
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
