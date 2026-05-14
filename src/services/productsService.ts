import { products as seedProducts } from '@/data/products';
import type { Product } from '@/data/types';
import { isSupabaseConfigured, requireSupabase, supabase } from '@/lib/supabase';

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  shop_id: string | null;
  price: number;
  old_price: number | null;
  unit: string | null;
  image_url: string | null;
  available: boolean;
  active: boolean;
  stock_quantity: number | null;
  is_offer: boolean;
  is_local_product: boolean;
  is_featured: boolean;
  keywords: string[] | null;
  tags: string[] | null;
  sort_order: number | null;
  created_at?: string;
  updated_at?: string;
  categories?: { name: string } | null;
};

export type ProductInput = {
  name: string;
  description?: string;
  categoryId: string;
  shopId?: string;
  price: number;
  oldPrice?: number;
  unit?: string;
  imageUrl?: string;
  available?: boolean;
  active?: boolean;
  stockQuantity?: number;
  isOffer?: boolean;
  isLocalProduct?: boolean;
  isFeatured?: boolean;
  keywords?: string[];
  tags?: string[];
  sortOrder?: number;
};

export function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    category: row.categories?.name || '',
    categoryId: row.category_id || undefined,
    shopId: row.shop_id || undefined,
    price: Number(row.price),
    oldPrice: row.old_price === null || row.old_price === undefined ? undefined : Number(row.old_price),
    unit: row.unit || 'قطعة',
    image: row.image_url || '/images/products/rice.jpg',
    imageUrl: row.image_url || undefined,
    available: row.available,
    active: row.active,
    stockQuantity: row.stock_quantity ?? 0,
    isOffer: row.is_offer,
    isLocalProduct: row.is_local_product,
    isFeatured: row.is_featured,
    keywords: row.keywords || [],
    tags: row.tags || [],
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProducts(options: {
  activeOnly?: boolean;
  offersOnly?: boolean;
  localOnly?: boolean;
  featuredOnly?: boolean;
  categoryId?: string;
  shopId?: string | number;
} = {}) {
  if (!isSupabaseConfigured) {
    return seedProducts.filter((product) => {
      if (options.activeOnly && product.active === false) return false;
      if (options.offersOnly && !product.isOffer) return false;
      if (options.localOnly && !product.isLocalProduct) return false;
      if (options.featuredOnly && !product.isFeatured && product.tags.length === 0) return false;
      if (options.shopId && String(product.shopId) !== String(options.shopId)) return false;
      return true;
    });
  }

  const client = requireSupabase();
  let query = client
    .from('products')
    .select('*, categories(name)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (options.activeOnly) query = query.eq('active', true);
  if (options.offersOnly) query = query.eq('is_offer', true);
  if (options.localOnly) query = query.eq('is_local_product', true);
  if (options.featuredOnly) query = query.eq('is_featured', true);
  if (options.categoryId) query = query.eq('category_id', options.categoryId);
  if (options.shopId) query = query.eq('shop_id', String(options.shopId));

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => mapProduct(row as ProductRow));
}

export async function createProduct(input: ProductInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('products')
    .insert(toProductRow(input))
    .select('*, categories(name)')
    .single();
  if (error) throw error;
  return mapProduct(data as ProductRow);
}

export async function updateProduct(id: string, input: ProductInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('products')
    .update({ ...toProductRow(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, categories(name)')
    .single();
  if (error) throw error;
  return mapProduct(data as ProductRow);
}

export async function deleteProduct(id: string) {
  const client = requireSupabase();
  const { error } = await client.from('products').delete().eq('id', id);
  if (error) throw error;
}

function toProductRow(input: ProductInput) {
  return {
    name: input.name,
    description: input.description || null,
    category_id: input.categoryId,
    shop_id: input.shopId || null,
    price: input.price,
    old_price: input.oldPrice || null,
    unit: input.unit || 'قطعة',
    image_url: input.imageUrl || null,
    available: input.available ?? true,
    stock_quantity: input.stockQuantity ?? 0,
    active: input.active ?? true,
    is_offer: input.isOffer ?? false,
    is_local_product: input.isLocalProduct ?? false,
    is_featured: input.isFeatured ?? false,
    keywords: input.keywords || [],
    tags: input.tags || [],
    sort_order: input.sortOrder ?? 0,
  };
}

export function subscribeToProducts(onChange: () => void) {
  if (!supabase) return () => undefined;
  const client = supabase;
  const channel = client
    .channel('products-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onChange)
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
