import type { CartItem } from '@/data/types';
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';
import { loadMarketState, saveMarketState } from './marketStore';
import { subscribeToTableChanges } from '@/services/realtimeService';

export type OrderStatus =
  | 'جديد'
  | 'تم استلام الطلب'
  | 'جاري التجهيز'
  | 'خرج للتوصيل'
  | 'تم التسليم'
  | 'ملغي';

export type CustomerOrderInput = {
  customerName: string;
  customerPhone: string;
  address: string;
  street?: string;
  notes?: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  items: CartItem[];
};

export type OrderRecord = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  street?: string;
  notes?: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: OrderStatus;
  createdAt: string;
  items: {
    id?: string;
    productId?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  address: string | null;
  street: string | null;
  notes: string | null;
  subtotal: number | null;
  delivery_fee: number | null;
  discount: number | null;
  total: number | null;
  payment_method: string | null;
  status: OrderStatus;
  created_at: string;
  order_items?: Array<{
    id: string;
    product_id: string | null;
    product_name: string | null;
    quantity: number | null;
    unit_price: number | null;
    total_price: number | null;
  }>;
};

export async function createOrder(input: CustomerOrderInput) {
  if (!isSupabaseConfigured) {
    const state = loadMarketState();
    const orderNumber = `SB-${new Date().getFullYear()}-${String(state.orders.length + 1).padStart(4, '0')}`;
    saveMarketState({
      ...state,
      orders: [
        {
          id: orderNumber,
          customer: input.customerName,
          phone: input.customerPhone,
          address: input.address,
          total: input.total,
          status: 'جديد',
          createdAt: new Date().toISOString(),
          itemsCount: input.items.length,
        },
        ...state.orders,
      ],
    });
    return { id: orderNumber, orderNumber };
  }

  const client = requireSupabase();
  const orderNumber = await generateOrderNumber();
  const { data: order, error } = await client
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      address: input.address,
      street: input.street || input.address,
      notes: input.notes || null,
      subtotal: input.subtotal,
      delivery_fee: input.deliveryFee,
      discount: input.discount,
      total: input.total,
      payment_method: 'الدفع عند الاستلام',
      status: 'جديد',
    })
    .select('id, order_number')
    .single();
  if (error) throw error;

  const rows = input.items.map((item) => ({
    order_id: order.id,
    product_id: typeof item.product.id === 'string' ? item.product.id : null,
    product_name: item.product.name,
    quantity: item.quantity,
    unit_price: item.product.price,
    total_price: item.product.price * item.quantity,
  }));
  const { error: itemsError } = await client.from('order_items').insert(rows);
  if (itemsError) throw itemsError;

  return { id: order.id as string, orderNumber: order.order_number as string };
}

export async function listOrders(filters: { search?: string; status?: string } = {}) {
  if (!isSupabaseConfigured) {
    const orders = loadMarketState().orders.map<OrderRecord>((order) => ({
      id: order.id,
      orderNumber: order.id,
      customerName: order.customer,
      customerPhone: order.phone,
      address: order.address,
      subtotal: order.total,
      deliveryFee: 0,
      discount: 0,
      total: order.total,
      paymentMethod: 'الدفع عند الاستلام',
      status: order.status,
      createdAt: order.createdAt,
      items: [],
    }));
    return applyOrderFilters(orders, filters);
  }

  const client = requireSupabase();
  const { data: authData } = await client.auth.getSession();
  if (!authData.session) return [];

  let query = client
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.search) {
    const search = filters.search.trim();
    query = query.or(`customer_phone.ilike.%${search}%,order_number.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => mapOrder(row as OrderRow));
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  if (!isSupabaseConfigured) {
    const state = loadMarketState();
    saveMarketState({
      ...state,
      orders: state.orders.map((order) => (order.id === id ? { ...order, status } : order)),
    });
    return;
  }

  const client = requireSupabase();
  const { error } = await client
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function generateOrderNumber() {
  const client = requireSupabase();
  const { data, error } = await client.rpc('next_order_number');
  if (error) throw error;
  return String(data);
}

function mapOrder(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    address: row.address || '',
    street: row.street || undefined,
    notes: row.notes || undefined,
    subtotal: Number(row.subtotal || 0),
    deliveryFee: Number(row.delivery_fee || 0),
    discount: Number(row.discount || 0),
    total: Number(row.total || 0),
    paymentMethod: row.payment_method || 'الدفع عند الاستلام',
    status: row.status,
    createdAt: row.created_at,
    items: (row.order_items || []).map((item) => ({
      id: item.id,
      productId: item.product_id || undefined,
      productName: item.product_name || '',
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unit_price || 0),
      totalPrice: Number(item.total_price || 0),
    })),
  };
}

function applyOrderFilters(orders: OrderRecord[], filters: { search?: string; status?: string }) {
  const search = filters.search?.trim();
  return orders.filter((order) => {
    if (filters.status && order.status !== filters.status) return false;
    if (!search) return true;
    return order.orderNumber.includes(search) || order.customerPhone.includes(search);
  });
}

export function subscribeToOrders(onChange: () => void) {
  return subscribeToTableChanges('orders-changes', ['orders', 'order_items'], onChange);
}

export async function createCustomRequest(input: {
  customerName: string;
  phone: string;
  requestText: string;
  address: string;
}) {
  if (!isSupabaseConfigured) return;
  const client = requireSupabase();
  const { error } = await client.from('custom_requests').insert({
    customer_name: input.customerName,
    phone: input.phone,
    request_text: input.requestText,
    address: input.address,
    status: 'جديد',
  });
  if (error) throw error;
}

export async function createSellerRequest(input: {
  shopName: string;
  ownerName: string;
  phone: string;
  category: string;
  address: string;
  notes?: string;
}) {
  if (!isSupabaseConfigured) return;
  const client = requireSupabase();
  const { error } = await client.from('seller_requests').insert({
    shop_name: input.shopName,
    owner_name: input.ownerName,
    phone: input.phone,
    category: input.category,
    address: input.address,
    notes: input.notes || null,
    status: 'جديد',
  });
  if (error) throw error;
}
