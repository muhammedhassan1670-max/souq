import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';

export type PriceChangeSource = 'inline' | 'quick_update' | 'bulk_update' | 'csv_import' | 'full_form';

export type ProductPriceHistoryInput = {
  productId: string;
  oldPrice?: number;
  newPrice?: number;
  oldOldPrice?: number;
  newOldPrice?: number;
  changeSource: PriceChangeSource;
};

export type ProductPriceHistoryRecord = ProductPriceHistoryInput & {
  id: string;
  changedAt: string;
  changedBy?: string;
};

type ProductPriceHistoryRow = {
  id: string;
  product_id: string;
  old_price: number | null;
  new_price: number | null;
  old_old_price: number | null;
  new_old_price: number | null;
  change_source: PriceChangeSource;
  changed_at: string;
  changed_by: string | null;
};

export async function recordProductPriceHistory(input: ProductPriceHistoryInput) {
  if (!isSupabaseConfigured) return;
  const priceChanged = input.oldPrice !== input.newPrice;
  const oldPriceChanged = input.oldOldPrice !== input.newOldPrice;
  if (!priceChanged && !oldPriceChanged) return;

  const client = requireSupabase();
  const { data: authData } = await client.auth.getSession();
  const { error } = await client.from('product_price_history').insert({
    product_id: input.productId,
    old_price: input.oldPrice ?? null,
    new_price: input.newPrice ?? null,
    old_old_price: input.oldOldPrice ?? null,
    new_old_price: input.newOldPrice ?? null,
    change_source: input.changeSource,
    changed_by: authData.session?.user.id ?? null,
  });
  if (error) throw error;
}

export async function listProductPriceHistory(productId: string, limit = 10) {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client
    .from('product_price_history')
    .select('*')
    .eq('product_id', productId)
    .order('changed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapHistoryRow);
}

function mapHistoryRow(row: ProductPriceHistoryRow): ProductPriceHistoryRecord {
  return {
    id: row.id,
    productId: row.product_id,
    oldPrice: row.old_price ?? undefined,
    newPrice: row.new_price ?? undefined,
    oldOldPrice: row.old_old_price ?? undefined,
    newOldPrice: row.new_old_price ?? undefined,
    changeSource: row.change_source,
    changedAt: row.changed_at,
    changedBy: row.changed_by ?? undefined,
  };
}
