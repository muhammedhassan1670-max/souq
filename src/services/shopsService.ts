import { shops as seedShops } from '@/data/shops';
import type { Shop } from '@/data/types';
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';
import { subscribeToTableChanges } from '@/services/realtimeService';

type ShopRow = {
  id: string;
  name: string;
  owner_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  category: string | null;
  address: string | null;
  image_url: string | null;
  rating: number | null;
  is_open: boolean;
  active: boolean;
  delivery_available: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ShopInput = {
  name: string;
  ownerName?: string;
  phone?: string;
  whatsapp?: string;
  category?: string;
  address?: string;
  imageUrl?: string;
  rating?: number;
  isOpen?: boolean;
  active?: boolean;
  deliveryAvailable?: boolean;
};

export function mapShop(row: ShopRow): Shop {
  return {
    id: row.id,
    name: row.name,
    ownerName: row.owner_name || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    category: row.category || '',
    address: row.address || '',
    rating: Number(row.rating ?? 5),
    deliveryAvailable: row.delivery_available,
    isOpen: row.is_open,
    active: row.active,
    productsCount: 0,
    image: row.image_url || '/images/shops/shop1.jpg',
    imageUrl: row.image_url || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listShops(options: { activeOnly?: boolean } = {}) {
  if (!isSupabaseConfigured) {
    return seedShops.filter((shop) => !options.activeOnly || shop.active !== false);
  }

  const client = requireSupabase();
  let query = client.from('shops').select('*').order('name');
  if (options.activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapShop);
}

export async function createShop(input: ShopInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('shops')
    .insert(toShopRow(input))
    .select()
    .single();
  if (error) throw error;
  return mapShop(data);
}

export async function updateShop(id: string, input: ShopInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('shops')
    .update({ ...toShopRow(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapShop(data);
}

export async function deleteShop(id: string) {
  const client = requireSupabase();
  const { error } = await client.from('shops').delete().eq('id', id);
  if (error) throw error;
}

function toShopRow(input: ShopInput) {
  return {
    name: input.name,
    owner_name: input.ownerName || null,
    phone: input.phone || null,
    whatsapp: input.whatsapp || null,
    category: input.category || null,
    address: input.address || null,
    image_url: input.imageUrl || null,
    rating: input.rating ?? 5,
    is_open: input.isOpen ?? true,
    active: input.active ?? true,
    delivery_available: input.deliveryAvailable ?? true,
  };
}

export function subscribeToShops(onChange: () => void) {
  return subscribeToTableChanges('shops-changes', ['shops'], onChange);
}
