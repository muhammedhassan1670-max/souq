import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, MessageCircle, Phone, ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { generateOrderMessage, openWhatsApp } from '@/utils/whatsapp';
import { createOrder } from '@/services/ordersService';
import { getCachedSettings } from '@/services/settingsService';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, getCartTotal, getDeliveryFee, getFinalTotal, clearCart } = useCart();
  const settings = getCachedSettings();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.name.trim()) nextErrors.name = 'الاسم مطلوب';
    if (!formData.phone.trim()) nextErrors.phone = 'رقم الموبايل مطلوب';
    if (!formData.address.trim()) nextErrors.address = 'العنوان مطلوب';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!settings.ordersOpen) return;

    const orderItems = items.map((item) => ({
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
    }));

    const totals = {
      subtotal: getCartTotal(),
      deliveryFee: getDeliveryFee(),
      discount: 0,
      total: getFinalTotal(),
    };

    let savedOrder: { id: string; orderNumber: string };
    try {
      savedOrder = await createOrder({
        customerName: formData.name,
        customerPhone: formData.phone,
        address: formData.address,
        street: formData.address,
        notes: formData.notes,
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee,
        discount: totals.discount,
        total: totals.total,
        items,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'تعذر حفظ الطلب');
      return;
    }

    const message =
      `رقم الطلب: ${savedOrder.orderNumber}\n\n` +
      generateOrderMessage(
        orderItems,
        {
          name: formData.name,
          phone: formData.phone,
          village: '',
          street: formData.address,
          addressDetails: '',
          deliveryNotes: formData.notes,
          preferredTime: 'أقرب وقت',
        },
        totals,
      );

    openWhatsApp(message);
    clearCart();
    window.dispatchEvent(new Event('market-data-change'));
    navigate('/');
  };

  if (items.length === 0) {
    return (
      <div className="pb-24 lg:pb-16">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-cream-warm">
            <ShoppingCart className="h-10 w-10 text-sand" />
          </div>
          <h2 className="mb-2 text-xl font-extrabold text-charcoal">مفيش حاجة في السلة</h2>
          <button
            onClick={() => navigate('/products')}
            className="mt-4 h-12 rounded-xl bg-olive px-6 font-extrabold text-white"
          >
            تصفح المنتجات
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 lg:pb-24">
      <div className="sticky top-14 z-40 border-b border-sand bg-cream/95 backdrop-blur lg:top-16">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button
            onClick={() => window.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-cream-warm"
          >
            <ArrowRight className="h-5 w-5 text-charcoal" />
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-charcoal">كمّل الطلب</h1>
            <p className="text-xs font-semibold text-charcoal-muted">ابعت الطلب واتساب بدون تسجيل</p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        {!settings.ordersOpen && (
          <div className="mb-4 rounded-xl bg-error/10 p-4 text-center text-sm font-black text-error">
            استقبال الطلبات متوقف حاليًا، برجاء المحاولة لاحقًا
          </div>
        )}
        {submitError && (
          <div className="mb-4 rounded-xl bg-error/10 p-4 text-center text-sm font-black text-error">
            {submitError}
          </div>
        )}
        <div className="rounded-xl border border-sand bg-white p-4 shadow-card lg:order-2 lg:sticky lg:top-28 lg:self-start">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-extrabold text-charcoal">طلبك</h2>
            <span className="rounded-full bg-cream-warm px-3 py-1 text-xs font-extrabold text-charcoal">
              {items.length} منتجات
            </span>
          </div>
          <div className="max-h-44 space-y-2 overflow-y-auto">
            {items.map((item, index) => (
              <div key={item.product.id} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 text-charcoal">
                  {index + 1}- {item.product.name} × {item.quantity}
                </span>
                <span className="flex-shrink-0 font-bold">{item.product.price * item.quantity} ج</span>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-sand pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-charcoal-muted">المنتجات</span>
              <span className="font-bold">{getCartTotal()} جنيه</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-charcoal-muted">التوصيل</span>
              <span className="font-bold">{getDeliveryFee() === 0 ? 'مجاني' : `${getDeliveryFee()} جنيه`}</span>
            </div>
            <div className="mt-2 flex justify-between text-lg font-black text-charcoal">
              <span>الإجمالي</span>
              <span className="text-olive-dark">{getFinalTotal()} جنيه</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-sand bg-white p-4 shadow-card lg:order-1 lg:mt-0">
          <h2 className="mb-4 font-extrabold text-charcoal">بيانات التوصيل</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-base font-extrabold text-charcoal">الاسم</label>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => handleChange('name', event.target.value)}
                placeholder="اكتب اسمك"
                className={`h-[52px] w-full rounded-xl border bg-white px-4 text-base font-semibold outline-none transition focus:border-olive focus:ring-4 focus:ring-olive/10 ${
                  errors.name ? 'border-error' : 'border-sand'
                }`}
              />
              {errors.name && <p className="mt-1 text-xs font-bold text-error">{errors.name}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-base font-extrabold text-charcoal">رقم الموبايل</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(event) => handleChange('phone', event.target.value)}
                placeholder="01xxxxxxxxx"
                className={`h-[52px] w-full rounded-xl border bg-white px-4 text-base font-semibold outline-none transition focus:border-olive focus:ring-4 focus:ring-olive/10 ${
                  errors.phone ? 'border-error' : 'border-sand'
                }`}
              />
              {errors.phone && <p className="mt-1 text-xs font-bold text-error">{errors.phone}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-base font-extrabold text-charcoal">العنوان / الشارع</label>
              <input
                type="text"
                value={formData.address}
                onChange={(event) => handleChange('address', event.target.value)}
                placeholder="اسم الشارع، البيت، علامة مميزة"
                className={`h-[52px] w-full rounded-xl border bg-white px-4 text-base font-semibold outline-none transition focus:border-olive focus:ring-4 focus:ring-olive/10 ${
                  errors.address ? 'border-error' : 'border-sand'
                }`}
              />
              {errors.address && <p className="mt-1 text-xs font-bold text-error">{errors.address}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-base font-extrabold text-charcoal">ملاحظات</label>
              <textarea
                value={formData.notes}
                onChange={(event) => handleChange('notes', event.target.value)}
                placeholder="أي ملاحظة للطلب أو التوصيل"
                rows={3}
                className="w-full resize-none rounded-xl border border-sand bg-white px-4 py-3 text-base font-semibold outline-none transition focus:border-olive focus:ring-4 focus:ring-olive/10"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-success/10 p-3">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-success" />
            <p className="text-sm font-bold text-charcoal">الدفع عند الاستلام</p>
          </div>
          <a
            href={`tel:${settings.phoneNumber.replace(/\s/g, '')}`}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-olive/25 bg-cream text-base font-extrabold text-olive-dark"
          >
            <Phone className="h-5 w-5" />
            اطلب بالتليفون
          </a>
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-sand bg-white p-3 lg:bottom-0">
        <div className="mx-auto max-w-7xl lg:px-8">
          <button
            onClick={() => void handleSubmit()}
            disabled={!settings.ordersOpen}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-whatsapp text-base font-black text-white shadow-button lg:mr-auto lg:max-w-md"
          >
            <MessageCircle className="h-5 w-5" />
            ابعت الطلب واتساب
          </button>
        </div>
      </div>
    </div>
  );
}

