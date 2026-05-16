import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';

export type RequestStatus = 'جديد' | 'قيد المراجعة' | 'تم التواصل' | 'تم التنفيذ' | 'ملغي';

export type CustomRequestRecord = {
  id: string;
  customerName: string;
  phone: string;
  requestText: string;
  address: string;
  status: RequestStatus;
  createdAt: string;
};

export type SellerRequestRecord = {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  category: string;
  address: string;
  notes?: string;
  status: RequestStatus;
  createdAt: string;
};

type CustomRequestRow = {
  id: string;
  customer_name: string | null;
  phone: string | null;
  request_text: string | null;
  address: string | null;
  status: RequestStatus | null;
  created_at: string;
};

type SellerRequestRow = {
  id: string;
  shop_name: string | null;
  owner_name: string | null;
  phone: string | null;
  category: string | null;
  address: string | null;
  notes: string | null;
  status: RequestStatus | null;
  created_at: string;
};

export async function listCustomRequests() {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client
    .from('custom_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapCustomRequest);
}

export async function listSellerRequests() {
  if (!isSupabaseConfigured) return [];
  const client = requireSupabase();
  const { data, error } = await client
    .from('seller_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSellerRequest);
}

export async function updateCustomRequestStatus(id: string, status: RequestStatus) {
  if (!isSupabaseConfigured) return;
  const client = requireSupabase();
  const { error } = await client.from('custom_requests').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updateSellerRequestStatus(id: string, status: RequestStatus) {
  if (!isSupabaseConfigured) return;
  const client = requireSupabase();
  const { error } = await client.from('seller_requests').update({ status }).eq('id', id);
  if (error) throw error;
}

function mapCustomRequest(row: CustomRequestRow): CustomRequestRecord {
  return {
    id: row.id,
    customerName: row.customer_name || 'عميل',
    phone: row.phone || '',
    requestText: row.request_text || '',
    address: row.address || '',
    status: row.status || 'جديد',
    createdAt: row.created_at,
  };
}

function mapSellerRequest(row: SellerRequestRow): SellerRequestRecord {
  return {
    id: row.id,
    shopName: row.shop_name || 'محل جديد',
    ownerName: row.owner_name || '',
    phone: row.phone || '',
    category: row.category || '',
    address: row.address || '',
    notes: row.notes || undefined,
    status: row.status || 'جديد',
    createdAt: row.created_at,
  };
}
