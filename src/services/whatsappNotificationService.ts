import type { OrderRecord } from '@/services/ordersService';
import { supabase } from '@/lib/supabase';

export type WhatsAppNotificationResult = {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
};

export async function sendOrderStatusWhatsAppNotification(order: OrderRecord): Promise<WhatsAppNotificationResult> {
  const token = await getAccessToken();
  const response = await fetch('/api/whatsapp/status-update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      status: order.status,
      total: order.total,
    }),
  });
  const data = await response.json().catch(() => ({})) as WhatsAppNotificationResult;

  if (!response.ok) {
    throw new Error(data.error || 'تعذر إرسال واتساب تلقائيًا');
  }

  return data;
}

async function getAccessToken() {
  if (!supabase) return '';
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}
