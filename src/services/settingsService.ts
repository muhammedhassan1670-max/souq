import { defaultSettings, type MarketSettings } from './marketStore';
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';
import { subscribeToTableChanges } from '@/services/realtimeService';

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
  localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(normalizeAppSettings(settings)));
}

export function getCachedSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    return raw ? normalizeAppSettings({ ...defaultAppSettings, ...JSON.parse(raw) }) : defaultAppSettings;
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
  const normalizedSettings = normalizeAppSettings(settings);
  cacheSettings(normalizedSettings);
  return normalizedSettings;
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
  return subscribeToTableChanges('settings-changes', ['settings'], onChange);
}

function normalizeAppSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    whatsappNumber: normalizeSavedPhone(settings.whatsappNumber, defaultAppSettings.whatsappNumber),
    phoneNumber: normalizeSavedPhone(settings.phoneNumber, defaultAppSettings.phoneNumber),
  };
}

function normalizeSavedPhone(value: string, fallback: string) {
  const digits = String(value || '').replace(/\D/g, '');
  const oldPlaceholders = new Set(['201000000000', '01000000000', '201234567890', '01234567890']);
  return !digits || oldPlaceholders.has(digits) ? fallback : value;
}
