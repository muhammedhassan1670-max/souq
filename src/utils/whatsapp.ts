import { getCachedSettings } from '@/services/settingsService';

// WhatsApp configuration - easy to change
export const WHATSAPP_NUMBER = '201234567890'; // Replace with actual number

export const generateWhatsAppLink = (message: string, overrideNumber?: string): string => {
  const encodedMessage = encodeURIComponent(message);
  const settingsNumber = getCachedSettings().whatsappNumber;
  const number = (overrideNumber || settingsNumber || WHATSAPP_NUMBER).replace(/\D/g, '');
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
