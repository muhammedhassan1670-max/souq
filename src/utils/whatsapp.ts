import { getCachedSettings } from '@/services/settingsService';

// WhatsApp configuration - easy to change
export const PLATFORM_PHONE_NUMBER = '01019851670';
export const WHATSAPP_NUMBER = PLATFORM_PHONE_NUMBER;

export const normalizeWhatsAppNumber = (value?: string): string => {
  const digits = (value || WHATSAPP_NUMBER).replace(/\D/g, '');
  if (!digits) return WHATSAPP_NUMBER.replace(/\D/g, '');
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return `20${digits.slice(1)}`;
  if (digits.startsWith('1') && digits.length === 10) return `20${digits}`;
  return digits;
};

export const generateWhatsAppLink = (message: string, overrideNumber?: string): string => {
  const encodedMessage = encodeURIComponent(message);
  const settingsNumber = getCachedSettings().whatsappNumber;
  const number = normalizeWhatsAppNumber(overrideNumber || settingsNumber || WHATSAPP_NUMBER);
  return `https://wa.me/${number}?text=${encodedMessage}`;
};

export const generateOrderMessage = (
  items: { name: string; quantity: number; price: number }[],
  formData: {
    name: string;
    phone: string;
    village: string;
    street: string;
    addressDetails: string;
    deliveryNotes: string;
    preferredTime: string;
  },
  totals: {
    subtotal: number;
    deliveryFee: number;
    discount: number;
    total: number;
  }
): string => {
  const itemsList = items
    .map((item, index) => `${index + 1}- ${item.name} × ${item.quantity} = ${item.price * item.quantity} جنيه`)
    .join('\n');
  const addressParts = [formData.village, formData.street, formData.addressDetails]
    .map((part) => part.trim())
    .filter(Boolean);
  const address = addressParts.length > 0 ? addressParts.join(' - ') : 'لم يتم تحديده';

  return `طلب جديد من سوق البلد 🛒

📋 بيانات العميل:
الاسم: ${formData.name || 'لم يتم تحديده'}
رقم الهاتف: ${formData.phone || 'لم يتم تحديده'}
العنوان / الشارع: ${address}

📦 الطلبات:
${itemsList}

💰 الإجمالي:
الإجمالي: ${totals.subtotal} جنيه
رسوم التوصيل: ${totals.deliveryFee === 0 ? 'مجاني' : totals.deliveryFee + ' جنيه'}
الخصم: ${totals.discount} جنيه
الإجمالي النهائي: ${totals.total} جنيه

💳 طريقة الدفع:
الدفع عند الاستلام

📝 ملاحظات: ${formData.deliveryNotes || 'لا يوجد'}`;
};

type WhatsAppOrderStatus =
  | 'جديد'
  | 'تم استلام الطلب'
  | 'جاري التجهيز'
  | 'خرج للتوصيل'
  | 'تم التسليم'
  | 'ملغي';

export const generateOrderStatusUpdateMessage = (order: {
  orderNumber: string;
  customerName?: string;
  status: WhatsAppOrderStatus;
  total: number;
}): string => {
  const detail =
    order.status === 'جديد' ? 'وصلنا طلبك وهتتم مراجعته حالًا.' :
    order.status === 'تم استلام الطلب' ? 'تم استلام الطلب وجاري تأكيده وتجهيزه.' :
    order.status === 'جاري التجهيز' ? 'طلبك بيتجهز الآن.' :
    order.status === 'خرج للتوصيل' ? 'طلبك خرج للتوصيل وفي الطريق ليك.' :
    order.status === 'تم التسليم' ? 'تم تسليم الطلب. شكرًا لثقتك في سوق البلد.' :
    'تم إلغاء الطلب. لو محتاج مساعدة ابعتلنا على واتساب.';

  const timeline =
    order.status === 'ملغي'
      ? 'الحالة: ملغي'
      : [
          'مراحل الطلب:',
          `1. تم استلام الطلب${isOrderStepDone(order.status, 'تم استلام الطلب') ? ' - تم' : ''}`,
          `2. جاري التجهيز${isOrderStepDone(order.status, 'جاري التجهيز') ? ' - تم' : ''}`,
          `3. خرج للتوصيل${isOrderStepDone(order.status, 'خرج للتوصيل') ? ' - تم' : ''}`,
          `4. تم التسليم${isOrderStepDone(order.status, 'تم التسليم') ? ' - تم' : ''}`,
        ].join('\n');

  return `أهلاً ${order.customerName || 'عميلنا العزيز'}

تحديث طلبك من سوق البلد
رقم الطلب: ${order.orderNumber}
الحالة الحالية: ${order.status}
${detail}

${timeline}

إجمالي الطلب: ${order.total} جنيه
الدفع عند الاستلام`;
};

export const generateCustomOrderMessage = (
  request: string,
  formData: {
    name: string;
    phone: string;
    village: string;
    street: string;
    addressDetails: string;
  }
): string => {
  return `طلب خاص من سوق البلد 📝

📋 بيانات العميل:
الاسم: ${formData.name || 'لم يتم تحديده'}
رقم الهاتف: ${formData.phone || 'لم يتم تحديده'}
القرية/المنطقة: ${formData.village || 'لم يتم تحديده'}
الشارع: ${formData.street || 'لم يتم تحديده'}
العنوان: ${formData.addressDetails || 'لم يتم تحديده'}

📦 الطلب الخاص:
${request}

💳 طريقة الدفع: الدفع عند الاستلام`;
};

export const generateSellerRequestMessage = (
  formData: {
    shopName: string;
    ownerName: string;
    phone: string;
    category: string;
    address: string;
    notes: string;
  }
): string => {
  return `طلب انضمام كبائع في سوق البلد 🏪

📋 بيانات المحل:
اسم المحل: ${formData.shopName}
اسم المالك: ${formData.ownerName}
رقم التليفون: ${formData.phone}
نوع المحل: ${formData.category}
العنوان: ${formData.address}

📝 ملاحظات:
${formData.notes || 'لا يوجد'}

يرجى التواصل للتأكيد والتفاصيل.`;
};

export const generateStreetOrderMessage = (
  formData: {
    streetName: string;
    homesCount: string;
    products: string;
    notes: string;
  }
): string => {
  return `طلبية شارع من سوق البلد 🏘️

📍 اسم الشارع: ${formData.streetName}
🏠 عدد البيوت المشتركة: ${formData.homesCount}

📦 المنتجات المطلوبة:
${formData.products}

📝 ملاحظات: ${formData.notes || 'لا يوجد'}

💳 الدفع عند الاستلام`;
};

export const openWhatsApp = (message: string): void => {
  const link = generateWhatsAppLink(message);
  window.open(link, '_blank');
};

function isOrderStepDone(status: WhatsAppOrderStatus, step: WhatsAppOrderStatus) {
  const steps: WhatsAppOrderStatus[] = ['جديد', 'تم استلام الطلب', 'جاري التجهيز', 'خرج للتوصيل', 'تم التسليم'];
  return steps.indexOf(status) >= steps.indexOf(step);
}
