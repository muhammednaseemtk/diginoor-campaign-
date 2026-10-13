import fs from 'fs';
import path from 'path';
import { supabase, supabaseAdmin, checkIsSupabaseAdminConfigured, checkIsSupabaseConfigured } from '@/lib/supabase';

const DATA_FILE_PATH = path.join(process.cwd(), 'data.json');

export const DEFAULT_CATEGORIES = [
  'Conferences & Events',
  'Corporate & Awards',
  'Concerts & Music',
  'Sports & Fitness',
  'Celebrations',
  'Fun & Retro',
  'Ready-Made Posters',
  'Other',
];

interface DataFileSchema {
  templates?: unknown[];
  categories?: string[];
}

function readStoredCategories(): string[] {
  try {
    if (!fs.existsSync(DATA_FILE_PATH)) return [];
    const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
    const parsed: DataFileSchema = JSON.parse(content);
    return Array.isArray(parsed.categories) ? parsed.categories : [];
  } catch {
    return [];
  }
}

function writeStoredCategories(categories: string[]): void {
  try {
    let existingData: DataFileSchema = { templates: [] };
    if (fs.existsSync(DATA_FILE_PATH)) {
      const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      existingData = JSON.parse(content);
    }
    existingData.categories = categories;
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(existingData, null, 2), 'utf-8');
  } catch {
    // Read-only filesystem in serverless hosting - safe ignore
  }
}

let supabaseCategoriesTableChecked = false;

async function ensureSupabaseCategoriesTable(): Promise<void> {
  if (supabaseCategoriesTableChecked || !checkIsSupabaseAdminConfigured()) return;
  supabaseCategoriesTableChecked = true;
  try {
    // Check if table exists or can be queried
    await supabaseAdmin.from('categories').select('id').limit(1);
  } catch {
    // Table may not exist yet, will rely on templates.category & data.json
  }
}

export const categoryDb = {
  /**
   * Fetches all unique categories from all sources (defaults, templates, stored categories)
   */
  getAll: async (): Promise<string[]> => {
    const categorySet = new Set<string>();

    // 1. Add predefined default categories
    DEFAULT_CATEGORIES.forEach((cat) => categorySet.add(cat));

    // 2. Add locally stored custom categories
    const stored = readStoredCategories();
    stored.forEach((cat) => {
      if (cat && typeof cat === 'string' && cat.trim()) {
        categorySet.add(cat.trim());
      }
    });

    // 3. Add categories present in local templates data.json
    try {
      if (fs.existsSync(DATA_FILE_PATH)) {
        const content = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.templates)) {
          parsed.templates.forEach((t: { category?: string }) => {
            if (t.category && typeof t.category === 'string' && t.category.trim()) {
              categorySet.add(t.category.trim());
            }
          });
        }
      }
    } catch {}

    // 4. Query Supabase if configured for categories from templates table or categories table
    const isConfigured = checkIsSupabaseAdminConfigured() || checkIsSupabaseConfigured();
    if (isConfigured) {
      const client = checkIsSupabaseAdminConfigured() ? supabaseAdmin : supabase;
      try {
        const { data: templateRows } = await client.from('templates').select('category');
        if (Array.isArray(templateRows)) {
          templateRows.forEach((row: { category?: string }) => {
            if (row.category && typeof row.category === 'string' && row.category.trim()) {
              categorySet.add(row.category.trim());
            }
          });
        }
      } catch {}

      try {
        const { data: catRows } = await client.from('categories').select('name');
        if (Array.isArray(catRows)) {
          catRows.forEach((row: { name?: string }) => {
            if (row.name && typeof row.name === 'string' && row.name.trim()) {
              categorySet.add(row.name.trim());
            }
          });
        }
      } catch {}
    }

    return Array.from(categorySet);
  },

  /**
   * Creates a new unique category persistently
   */
  create: async (name: string): Promise<{ category: string; categories: string[] }> => {
    const trimmed = name?.trim();
    if (!trimmed) {
      throw new Error('Category name cannot be empty.');
    }

    const currentCategories = await categoryDb.getAll();

    // Check for duplicate (case-insensitive)
    const existing = currentCategories.find(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      return { category: existing, categories: currentCategories };
    }

    // Save locally
    const stored = readStoredCategories();
    if (!stored.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      stored.push(trimmed);
      writeStoredCategories(stored);
    }

    // Save to Supabase if configured
    if (checkIsSupabaseAdminConfigured()) {
      try {
        await ensureSupabaseCategoriesTable();
        await supabaseAdmin.from('categories').insert({ name: trimmed });
      } catch (err) {
        console.warn('Notice: categories table insert skipped/unavailable:', err);
      }
    }

    const updated = await categoryDb.getAll();
    return { category: trimmed, categories: updated };
  },
};
