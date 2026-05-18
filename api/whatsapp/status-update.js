const DEFAULT_GRAPH_API_VERSION = 'v20.0';

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', request.headers.origin || '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authResult = await verifySupabaseSession(request);
  if (!authResult.ok) {
    response.status(authResult.status).json({ error: authResult.error });
    return;
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) {
    response.status(200).json({ sent: false, skipped: true, reason: 'missing_whatsapp_config' });
    return;
  }

  let body = {};
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body || {};
  } catch {
    response.status(400).json({ error: 'Invalid JSON body' });
    return;
  }
  const order = {
    customerName: String(body.customerName || ''),
    customerPhone: String(body.customerPhone || ''),
    orderNumber: String(body.orderNumber || ''),
    status: String(body.status || ''),
    total: Number(body.total || 0),
  };

  if (!order.customerPhone || !order.orderNumber || !order.status) {
    response.status(400).json({ error: 'Missing order notification data' });
    return;
  }

  const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION;
  const templateName = process.env.WHATSAPP_STATUS_TEMPLATE_NAME;
  const to = normalizeWhatsAppNumber(order.customerPhone);
  const payload = templateName
    ? createTemplatePayload(to, templateName, order)
    : createTextPayload(to, createStatusMessage(order));

  const graphResponse = await fetch(`https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const graphData = await graphResponse.json().catch(() => ({}));

  if (!graphResponse.ok) {
    response.status(502).json({
      sent: false,
      error: graphData?.error?.message || 'WhatsApp API request failed',
      details: graphData?.error,
    });
    return;
  }

  response.status(200).json({
    sent: true,
    messageId: graphData?.messages?.[0]?.id,
  });
}

async function verifySupabaseSession(request) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, error: 'Supabase auth env vars are missing' };
  }

  const authorization = request.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Admin session is required' };
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: authorization,
    },
  });

  if (!userResponse.ok) {
    return { ok: false, status: 401, error: 'Invalid admin session' };
  }

  return { ok: true };
}

function createTextPayload(to, message) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      preview_url: false,
      body: message,
    },
  };
}

function createTemplatePayload(to, templateName, order) {
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: process.env.WHATSAPP_STATUS_TEMPLATE_LANGUAGE || 'ar',
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: order.customerName || 'عميلنا العزيز' },
            { type: 'text', text: order.orderNumber },
            { type: 'text', text: order.status },
            { type: 'text', text: getStatusDetail(order.status) },
            { type: 'text', text: `${order.total} جنيه` },
          ],
        },
      ],
    },
  };
}

function createStatusMessage(order) {
  const timeline = order.status === 'ملغي'
    ? 'الحالة: ملغي'
    : [
        'مراحل الطلب:',
        `1. تم استلام الطلب${isStepDone(order.status, 'تم استلام الطلب') ? ' - تم' : ''}`,
        `2. جاري التجهيز${isStepDone(order.status, 'جاري التجهيز') ? ' - تم' : ''}`,
        `3. خرج للتوصيل${isStepDone(order.status, 'خرج للتوصيل') ? ' - تم' : ''}`,
        `4. تم التسليم${isStepDone(order.status, 'تم التسليم') ? ' - تم' : ''}`,
      ].join('\n');

  return `أهلاً ${order.customerName || 'عميلنا العزيز'}

تحديث طلبك من سوق البلد
رقم الطلب: ${order.orderNumber}
الحالة الحالية: ${order.status}
${getStatusDetail(order.status)}

${timeline}

إجمالي الطلب: ${order.total} جنيه
الدفع عند الاستلام`;
}

function getStatusDetail(status) {
  if (status === 'جديد') return 'وصلنا طلبك وهتتم مراجعته حالًا.';
  if (status === 'تم استلام الطلب') return 'تم استلام الطلب وجاري تأكيده وتجهيزه.';
  if (status === 'جاري التجهيز') return 'طلبك بيتجهز الآن.';
  if (status === 'خرج للتوصيل') return 'طلبك خرج للتوصيل وفي الطريق ليك.';
  if (status === 'تم التسليم') return 'تم تسليم الطلب. شكرًا لثقتك في سوق البلد.';
  return 'تم إلغاء الطلب. لو محتاج مساعدة ابعتلنا على واتساب.';
}

function isStepDone(status, step) {
  const steps = ['جديد', 'تم استلام الطلب', 'جاري التجهيز', 'خرج للتوصيل', 'تم التسليم'];
  return steps.indexOf(status) >= steps.indexOf(step);
}

function normalizeWhatsAppNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return `20${digits.slice(1)}`;
  if (digits.startsWith('1') && digits.length === 10) return `20${digits}`;
  return digits;
}
