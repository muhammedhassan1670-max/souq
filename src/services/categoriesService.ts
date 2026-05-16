import type { Category } from '@/data/types';
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';
import { subscribeToTableChanges } from '@/services/realtimeService';

type CategoryRow = {
  id: string;
  name: string;
  slug: string | null;
  icon: string | null;
  image_url: string | null;
  active: boolean;
  coming_soon: boolean | null;
  sort_order: number | null;
  created_at?: string;
  updated_at?: string;
};

export type CategoryInput = {
  name: string;
  slug?: string;
  icon?: string;
  imageUrl?: string;
  active?: boolean;
  comingSoon?: boolean;
  sortOrder?: number;
};

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug || undefined,
    icon: row.icon || 'ShoppingBag',
    imageUrl: row.image_url || undefined,
    color: '#5B6B4E',
    active: row.active !== false,
    comingSoon: row.coming_soon ?? false,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCategories(options: { activeOnly?: boolean } = {}) {
  if (!isSupabaseConfigured) {
    return [];
  }

  const client = requireSupabase();
  let query = client.from('categories').select('*').order('sort_order', { ascending: true }).order('name');
  if (options.activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapCategory);
}

export async function createCategory(input: CategoryInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('categories')
    .insert({
      name: input.name,
      slug: input.slug || null,
      icon: input.icon || null,
      image_url: input.imageUrl || null,
      active: input.active ?? true,
      coming_soon: input.comingSoon ?? false,
      sort_order: input.sortOrder ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return mapCategory(data);
}

export async function updateCategory(id: string, input: CategoryInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('categories')
    .update({
      name: input.name,
      slug: input.slug || null,
      icon: input.icon || null,
      image_url: input.imageUrl || null,
      active: input.active ?? true,
      coming_soon: input.comingSoon ?? false,
      sort_order: input.sortOrder ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapCategory(data);
}

export async function deleteCategory(id: string) {
  const client = requireSupabase();
  const { error } = await client.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export function subscribeToCategories(onChange: () => void) {
  return subscribeToTableChanges('categories-changes', ['categories'], onChange);
}
