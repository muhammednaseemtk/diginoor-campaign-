import { useEffect, useState, useRef, useCallback } from 'react';
import { PosterTemplate, PhotoArea, PosterTextOverlay } from '@/lib/types/template';
import { supabase, checkIsSupabaseConfigured } from '@/lib/supabase';

export type PosterSyncEvent =
  | { type: 'INSERT'; template: PosterTemplate }
  | { type: 'DELETE'; id: string; slug?: string }
  | { type: 'UPDATE'; template: PosterTemplate }
  | { type: 'REFRESH' };

export const POSTER_SYNC_CHANNEL_NAME = 'diginoor_posters_sync';
const LOCAL_STORAGE_EVENT_KEY = 'diginoor_poster_sync_storage_event';
const TOMBSTONE_EXPIRY_MS = 30000; // 30 seconds

export const UNWANTED_SLUGS = [
  'tech-summit-keynote',
  'employee-of-the-month',
  'neon-beats-music-festival',
  'champion-athlete-spotlight',
  'graduation-class-2026',
  'wanted-vintage-outlaw',
];

export const UNWANTED_IDS = [
  'tpl-tech-summit',
  'tpl-employee-award',
  'tpl-music-festival',
  'tpl-athlete-spotlight',
  'tpl-graduation-2026',
  'tpl-wanted-vintage',
];

export function isUnwantedPoster(t?: { id?: string; slug?: string; posterImage?: string } | null): boolean {
  if (!t) return false;
  if (t.slug && UNWANTED_SLUGS.includes(t.slug)) return true;
  if (t.id && UNWANTED_IDS.includes(t.id)) return true;
  if (
    t.posterImage &&
    (t.posterImage.includes('/templates/tech-summit.svg') ||
      t.posterImage.includes('/templates/employee-award.svg') ||
      t.posterImage.includes('/templates/music-festival.svg') ||
      t.posterImage.includes('/templates/athlete-spotlight.svg') ||
      t.posterImage.includes('/templates/graduation.svg') ||
      t.posterImage.includes('/templates/vintage-wanted.svg'))
  ) {
    return true;
  }
  return false;
}

/**
 * Parses canvas_config from a Supabase row or raw database record.
 */
export function parseCanvasConfig(raw: unknown): PhotoArea {
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
    x: typeof item.x === 'number' && !isNaN(item.x) ? item.x : (item.x !== undefined && !isNaN(Number(item.x)) ? Number(item.x) : 540),
    y: typeof item.y === 'number' && !isNaN(item.y) ? item.y : (item.y !== undefined && !isNaN(Number(item.y)) ? Number(item.y) : 1200),
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

/**
 * Formats a Supabase `templates` database row into a client PosterTemplate.
 */
export function parsePosterFromDbRow(row: Record<string, unknown>): PosterTemplate | null {
  if (!row || !row.id) return null;
  const photoArea = parseCanvasConfig(row.canvas_config);
  const template: PosterTemplate = {
    id: String(row.id),
    title: String(row.title || ''),
    slug: String(row.slug || ''),
    description: String(row.description || ''),
    category: String(row.category || 'General'),
    width: Number(row.width) || 1080,
    height: Number(row.height) || 1350,
    posterImage: String(row.base_image_url || row.posterImage || ''),
    photoArea,
    textOverlays: photoArea.textOverlays || [],
    sampleUserPhoto: '/templates/sample-portrait.jpg',
    createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
  };

  if (isUnwantedPoster(template)) return null;
  return template;
}

/**
 * Broadcasts a poster mutation across browser tabs using BroadcastChannel and localStorage.
 */
export function broadcastPosterChange(event: PosterSyncEvent): void {
  if (typeof window === 'undefined') return;

  // 1. BroadcastChannel API (Modern cross-tab communication)
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(POSTER_SYNC_CHANNEL_NAME);
      channel.postMessage(event);
      channel.close();
    }
  } catch (err) {
    console.warn('[PosterSync] BroadcastChannel error:', err);
  }

  // 2. Storage event fallback for older or sandboxed contexts
  try {
    localStorage.setItem(
      LOCAL_STORAGE_EVENT_KEY,
      JSON.stringify({ event, timestamp: Date.now(), rand: Math.random() })
    );
  } catch {
    // Ignore localStorage failures
  }
}

export interface UsePosterSyncOptions {
  initialTemplates?: PosterTemplate[];
  pollIntervalMs?: number;
  enablePolling?: boolean;
}

export function usePosterSync(options: UsePosterSyncOptions = {}) {
  const {
    initialTemplates,
    pollIntervalMs = 3000,
    enablePolling = true,
  } = options;

  const [templates, setTemplates] = useState<PosterTemplate[]>(() =>
    Array.isArray(initialTemplates) ? initialTemplates.filter((t) => !isUnwantedPoster(t)) : []
  );
  const [loading, setLoading] = useState<boolean>(() => !initialTemplates || initialTemplates.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Deleted poster tombstone map (id/slug -> timestamp) to prevent race conditions & stale cache resurrection
  const recentlyDeletedRef = useRef<Map<string, number>>(new Map());
  const latestFetchIdRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // Record a poster as recently deleted
  const recordDeleted = useCallback((id?: string, slug?: string) => {
    const now = Date.now();
    if (id) recentlyDeletedRef.current.set(id, now);
    if (slug) recentlyDeletedRef.current.set(slug, now);
  }, []);

  // Check if a poster has been recently deleted
  const isDeleted = useCallback((id?: string, slug?: string) => {
    const now = Date.now();
    // Prune expired tombstones
    for (const [key, timestamp] of recentlyDeletedRef.current.entries()) {
      if (now - timestamp > TOMBSTONE_EXPIRY_MS) {
        recentlyDeletedRef.current.delete(key);
      }
    }
    if (id && recentlyDeletedRef.current.has(id)) return true;
    if (slug && recentlyDeletedRef.current.has(slug)) return true;
    return false;
  }, []);

  // Filter an array of templates against tombstones & unwanted templates
  const sanitizeList = useCallback(
    (list: PosterTemplate[]): PosterTemplate[] => {
      return list.filter((t) => !isUnwantedPoster(t) && !isDeleted(t.id, t.slug));
    },
    [isDeleted]
  );

  // Revalidate templates from `/api/templates`
  const refresh = useCallback(async (): Promise<PosterTemplate[]> => {
    const fetchId = ++latestFetchIdRef.current;
    try {
      const cacheBust = `_t=${Date.now()}`;
      const res = await fetch(`/api/templates?${cacheBust}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch templates: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!isMountedRef.current || fetchId !== latestFetchIdRef.current) {
        return [];
      }

      if (Array.isArray(data)) {
        const cleanList = sanitizeList(data);
        setTemplates((prev) => {
          // Compare lists to avoid unnecessary re-renders
          if (
            prev.length === cleanList.length &&
            prev.every((p, idx) => p.id === cleanList[idx]?.id && p.slug === cleanList[idx]?.slug)
          ) {
            return prev;
          }
          return cleanList;
        });
        setError(null);
        return cleanList;
      }
      return [];
    } catch (err: unknown) {
      if (isMountedRef.current && fetchId === latestFetchIdRef.current) {
        const msg = err instanceof Error ? err.message : 'Error fetching templates';
        console.warn('[PosterSync] Background refresh error:', msg);
        // Do not overwrite templates on temporary background poll error
      }
      return [];
    } finally {
      if (isMountedRef.current && fetchId === latestFetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [sanitizeList]);

  // When initialTemplates prop changes externally, update if non-empty
  useEffect(() => {
    if (Array.isArray(initialTemplates) && initialTemplates.length > 0) {
      setTemplates((prev) => {
        // If prev is already populated with sanitized items, keep any newer items
        const cleanInitial = sanitizeList(initialTemplates);
        if (prev.length === 0) return cleanInitial;
        return prev;
      });
      setLoading(false);
    }
  }, [initialTemplates, sanitizeList]);

  // Add poster helper: updates local state immediately, records, and broadcasts
  const addPoster = useCallback(
    (template: PosterTemplate) => {
      if (isDeleted(template.id, template.slug) || isUnwantedPoster(template)) return;
      setTemplates((prev) => [
        template,
        ...prev.filter((t) => t.id !== template.id && t.slug !== template.slug),
      ]);
      broadcastPosterChange({ type: 'INSERT', template });
      // Schedule background verification
      setTimeout(() => refresh(), 500);
    },
    [isDeleted, refresh]
  );

  // Remove poster helper: removes from state, records tombstone, and broadcasts
  const removePoster = useCallback(
    (id: string, slug?: string) => {
      recordDeleted(id, slug);
      setTemplates((prev) =>
        prev.filter((t) => (id ? t.id !== id : true) && (slug ? t.slug !== slug : true))
      );
      broadcastPosterChange({ type: 'DELETE', id, slug });
      // Schedule background verification
      setTimeout(() => refresh(), 500);
    },
    [recordDeleted, refresh]
  );

  // Update poster helper: updates state and broadcasts
  const updatePoster = useCallback(
    (template: PosterTemplate) => {
      if (isDeleted(template.id, template.slug) || isUnwantedPoster(template)) return;
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id || t.slug === template.slug ? template : t))
      );
      broadcastPosterChange({ type: 'UPDATE', template });
      setTimeout(() => refresh(), 500);
    },
    [isDeleted, refresh]
  );

  // Setup Realtime & Broadcast listeners and Polling
  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch if templates array is empty
    if (!initialTemplates || initialTemplates.length === 0) {
      refresh();
    }

    // 1. Cross-tab synchronization via BroadcastChannel
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        broadcastChannel = new BroadcastChannel(POSTER_SYNC_CHANNEL_NAME);
        broadcastChannel.onmessage = (event: MessageEvent<PosterSyncEvent>) => {
          const payload = event.data;
          if (!payload || !payload.type) return;

          if (payload.type === 'INSERT') {
            const t = payload.template;
            if (t && !isDeleted(t.id, t.slug) && !isUnwantedPoster(t)) {
              setTemplates((prev) => [
                t,
                ...prev.filter((item) => item.id !== t.id && item.slug !== t.slug),
              ]);
            }
          } else if (payload.type === 'DELETE') {
            recordDeleted(payload.id, payload.slug);
            setTemplates((prev) =>
              prev.filter(
                (item) =>
                  (payload.id ? item.id !== payload.id : true) &&
                  (payload.slug ? item.slug !== payload.slug : true)
              )
            );
          } else if (payload.type === 'UPDATE') {
            const t = payload.template;
            if (t && !isDeleted(t.id, t.slug) && !isUnwantedPoster(t)) {
              setTemplates((prev) =>
                prev.map((item) => (item.id === t.id || item.slug === t.slug ? t : item))
              );
            }
          } else if (payload.type === 'REFRESH') {
            refresh();
          }
        };
      } catch (err) {
        console.warn('[PosterSync] BroadcastChannel init error:', err);
      }
    }

    // 2. Fallback cross-tab synchronization via storage event
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key !== LOCAL_STORAGE_EVENT_KEY || !e.newValue) return;
      try {
        const { event: payload } = JSON.parse(e.newValue);
        if (!payload || !payload.type) return;

        if (payload.type === 'INSERT') {
          const t = payload.template;
          if (t && !isDeleted(t.id, t.slug) && !isUnwantedPoster(t)) {
            setTemplates((prev) => [
              t,
              ...prev.filter((item) => item.id !== t.id && item.slug !== t.slug),
            ]);
          }
        } else if (payload.type === 'DELETE') {
          recordDeleted(payload.id, payload.slug);
          setTemplates((prev) =>
            prev.filter(
              (item) =>
                (payload.id ? item.id !== payload.id : true) &&
                (payload.slug ? item.slug !== payload.slug : true)
            )
          );
        } else if (payload.type === 'UPDATE') {
          const t = payload.template;
          if (t && !isDeleted(t.id, t.slug) && !isUnwantedPoster(t)) {
            setTemplates((prev) =>
              prev.map((item) => (item.id === t.id || item.slug === t.slug ? t : item))
            );
          }
        }
      } catch {}
    };
    window.addEventListener('storage', handleStorageEvent);

    // 3. Supabase Realtime Subscription for database-level live updates
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    const isSupabaseLive = checkIsSupabaseConfigured();

    if (isSupabaseLive) {
      try {
        const channelName = `templates-realtime-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        realtimeChannel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'templates',
            },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                const parsed = parsePosterFromDbRow(payload.new as Record<string, unknown>);
                if (parsed && !isDeleted(parsed.id, parsed.slug)) {
                  setTemplates((prev) => [
                    parsed,
                    ...prev.filter((t) => t.id !== parsed.id && t.slug !== parsed.slug),
                  ]);
                  // Quietly refresh to verify complete consistency
                  refresh();
                }
              } else if (payload.eventType === 'DELETE') {
                const oldRow = (payload.old || {}) as Record<string, unknown>;
                const deletedId = oldRow.id ? String(oldRow.id) : '';
                const deletedSlug = oldRow.slug ? String(oldRow.slug) : '';
                recordDeleted(deletedId, deletedSlug);
                setTemplates((prev) =>
                  prev.filter(
                    (t) =>
                      (deletedId ? t.id !== deletedId : true) &&
                      (deletedSlug ? t.slug !== deletedSlug : true)
                  )
                );
                refresh();
              } else if (payload.eventType === 'UPDATE') {
                const parsed = parsePosterFromDbRow(payload.new as Record<string, unknown>);
                if (parsed && !isDeleted(parsed.id, parsed.slug)) {
                  setTemplates((prev) =>
                    prev.map((t) => (t.id === parsed.id || t.slug === parsed.slug ? parsed : t))
                  );
                }
              }
            }
          )
          .subscribe((status, err) => {
            if (err) {
              console.warn('[PosterSync] Supabase Realtime channel status:', status, err.message);
            }
          });
      } catch (subErr) {
        console.warn('[PosterSync] Could not initialize Supabase Realtime channel:', subErr);
      }
    }

    // 4. Background Polling & Window Focus / Visibility Sync (Reliable Alternative & Fallback)
    let pollTimer: NodeJS.Timeout | null = null;

    const schedulePoll = () => {
      if (!enablePolling) return;
      const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
      const delay = isVisible ? pollIntervalMs : Math.max(pollIntervalMs * 3, 10000);

      pollTimer = setTimeout(async () => {
        if (!isMountedRef.current) return;
        await refresh();
        if (isMountedRef.current) {
          schedulePoll();
        }
      }, delay);
    };

    if (enablePolling) {
      schedulePoll();
    }

    // Immediately refresh when user focuses or returns to tab
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Cleanup all subscriptions and timers on unmount
    return () => {
      isMountedRef.current = false;

      if (broadcastChannel) {
        try {
          broadcastChannel.close();
        } catch {}
      }

      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);

      if (pollTimer) {
        clearTimeout(pollTimer);
      }

      if (realtimeChannel) {
        try {
          supabase.removeChannel(realtimeChannel);
        } catch (cleanupErr) {
          console.warn('[PosterSync] Error cleaning up Supabase Realtime channel:', cleanupErr);
        }
      }
    };
  }, [
    initialTemplates,
    enablePolling,
    pollIntervalMs,
    isDeleted,
    recordDeleted,
    refresh,
    sanitizeList,
  ]);

  return {
    templates,
    setTemplates,
    loading,
    error,
    setError,
    refresh,
    addPoster,
    removePoster,
    updatePoster,
  };
}
