import fs from 'fs';
import path from 'path';
import { PosterTemplate, CreateTemplateInput } from '@/lib/types/template';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { deletePosterFromStorage } from '@/lib/server-storage';

const DATA_FILE_PATH = path.join(process.cwd(), 'data.json');

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
  getAll: async (): Promise<PosterTemplate[]> => {
    // If Supabase is configured, try fetching remote templates
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const remoteList: PosterTemplate[] = data.map((row) => ({
            id: String(row.id),
            title: row.title,
            slug: row.slug,
            description: row.description || '',
            category: row.category || 'General',
            width: Number(row.width) || 1080,
            height: Number(row.height) || 1350,
            posterImage: row.base_image_url,
            photoArea:
              typeof row.canvas_config === 'string'
                ? JSON.parse(row.canvas_config)
                : row.canvas_config,
            sampleUserPhoto: '/templates/sample-portrait.jpg',
            createdAt: row.created_at || new Date().toISOString(),
          }));

          // Merge local defaults if any are missing
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

  getBySlug: async (slug: string): Promise<PosterTemplate | null> => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('templates')
          .select('*')
          .or(`slug.eq.${slug},id.eq.${slug}`)
          .maybeSingle();

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
            photoArea:
              typeof data.canvas_config === 'string'
                ? JSON.parse(data.canvas_config)
                : data.canvas_config,
            sampleUserPhoto: '/templates/sample-portrait.jpg',
            createdAt: data.created_at || new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn('Supabase query error in getBySlug:', err);
      }
    }

    const list = readData();
    return list.find((t) => t.slug === slug || t.id === slug) || null;
  },

  getById: async (id: string): Promise<PosterTemplate | null> => {
    return templateDb.getBySlug(id);
  },

  create: async (input: CreateTemplateInput): Promise<PosterTemplate> => {
    const list = readData();
    const newTemplate: PosterTemplate = {
      ...input,
      id: `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    // Save locally
    list.unshift(newTemplate);
    writeData(list);

    // Sync to Supabase Database if configured
    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin.from('templates').insert({
          title: newTemplate.title,
          slug: newTemplate.slug,
          base_image_url: newTemplate.posterImage,
          canvas_config: JSON.stringify(newTemplate.photoArea),
          category: newTemplate.category,
          description: newTemplate.description,
          width: newTemplate.width,
          height: newTemplate.height,
        });
      } catch (err) {
        console.warn('Error syncing new template to Supabase DB:', err);
      }
    }

    return newTemplate;
  },

  update: async (slug: string, updates: Partial<PosterTemplate>): Promise<PosterTemplate | null> => {
    const list = readData();
    const index = list.findIndex((t) => t.slug === slug || t.id === slug);
    if (index === -1) return null;
    list[index] = { ...list[index], ...updates };
    writeData(list);

    if (isSupabaseConfigured) {
      try {
        const payload: Record<string, unknown> = {};
        if (updates.title) payload.title = updates.title;
        if (updates.description) payload.description = updates.description;
        if (updates.category) payload.category = updates.category;
        if (updates.photoArea) payload.canvas_config = JSON.stringify(updates.photoArea);
        if (updates.posterImage) payload.base_image_url = updates.posterImage;
        await supabaseAdmin.from('templates').update(payload).or(`slug.eq.${slug},id.eq.${slug}`);
      } catch (err) {
        console.warn('Error updating template in Supabase DB:', err);
      }
    }

    return list[index];
  },

  delete: async (id: string): Promise<boolean> => {
    const list = readData();
    const toDelete = list.find((t) => t.id === id || t.slug === id);
    const filtered = list.filter((t) => t.id !== id && t.slug !== id);

    if (toDelete?.posterImage) {
      await deletePosterFromStorage(toDelete.posterImage);
    }

    if (filtered.length === list.length && !isSupabaseConfigured) {
      return false;
    }

    writeData(filtered);

    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin.from('templates').delete().or(`id.eq.${id},slug.eq.${id}`);
      } catch (err) {
        console.warn('Error deleting template from Supabase DB:', err);
      }
    }

    return true;
  },

  resetDefaults: async (): Promise<PosterTemplate[]> => {
    writeData(DEFAULT_TEMPLATES);
    return DEFAULT_TEMPLATES;
  },
};
