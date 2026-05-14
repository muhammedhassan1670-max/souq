import { defaultSettings, type MarketSettings } from './marketStore';
import { isSupabaseConfigured, requireSupabase, supabase } from '@/lib/supabase';

const SETTINGS_CACHE_KEY = 'souq-elbalad-settings-cache';

export type AppSettings = MarketSettings & {
  topAnnouncement?: string;
  logoUrl?: string;
};

export const defaultAppSettings: AppSettings = {
  ...defaultSettings,
  topAnnouncement: 'اطلب بدل ما تنزل',
  logoUrl: '/images/brand/logo-mark.png',
};

export function cacheSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
}

export function getCachedSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    return raw ? { ...defaultAppSettings, ...JSON.parse(raw) } : defaultAppSettings;
  } catch {
    return defaultAppSettings;
  }
}

export async function getSettings(): Promise<AppSettings> {
  if (!isSupabaseConfigured) {
    const cached = getCachedSettings();
    cacheSettings(cached);
    return cached;
  }

  const client = requireSupabase();
  const { data, error } = await client.from('settings').select('key,value');
  if (error) throw error;

  const settings = (data || []).reduce<AppSettings>(
    (acc, row) => ({ ...acc, [row.key]: row.value }),
    { ...defaultAppSettings },
  );
  cacheSettings(settings);
  return settings;
}

export async function saveSettings(settings: AppSettings) {
  cacheSettings(settings);
  if (!isSupabaseConfigured) return settings;

  const client = requireSupabase();
  const rows = Object.entries(settings).map(([key, value]) => ({ key, value }));
  const { error } = await client.from('settings').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
  return settings;
}

export function subscribeToSettings(onChange: () => void) {
  if (!supabase) return () => undefined;
  const client = supabase;
  const channel = client
    .channel('settings-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, onChange)
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
