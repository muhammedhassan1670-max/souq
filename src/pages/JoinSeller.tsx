import { useState } from 'react';
import { ArrowRight, Store, Send, CheckCircle } from 'lucide-react';
import { categories } from '@/data/categories';
import { generateSellerRequestMessage, openWhatsApp } from '@/utils/whatsapp';
import { createSellerRequest } from '@/services/ordersService';

export default function JoinSeller() {
  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    category: '',
    address: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.shopName.trim()) newErrors.shopName = 'اسم المحل مطلوب';
    if (!formData.ownerName.trim()) newErrors.ownerName = 'اسم المالك مطلوب';
    if (!formData.phone.trim()) newErrors.phone = 'رقم التليفون مطلوب';
    if (!formData.category.trim()) newErrors.category = 'نوع المحل مطلوب';
    if (!formData.address.trim()) newErrors.address = 'العنوان مطلوب';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await createSellerRequest(formData);
    } catch {
      // Keep WhatsApp as the visible confirmation channel for sellers.
    }
    const message = generateSellerRequestMessage(formData);
    openWhatsApp(message);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="pb-24">
        <div className="px-4 py-16 text-center">
          <div className="w-20 h-20 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-xl font-bold text-charcoal mb-2">تم إرسال طلبك!</h2>
          <p className="text-sm text-charcoal-muted">
            هنراجع بياناتك ونتواصل معاك في خلال 24 ساعة
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-6 h-10 px-5 bg-sahar text-white font-semibold rounded-xl"
          >
            رجوع
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-cream/95 backdrop-blur border-b border-sand">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => window.history.back()} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-cream-warm">
            <ArrowRight className="w-5 h-5 text-charcoal" />
          </button>
          <h1 className="text-lg font-bold text-charcoal">انضم كبائع</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Description */}
        <div className="bg-gradient-to-r from-sahar-light to-sahar rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Store className="w-5 h-5 text-sahar-dark" />
            <h2 className="font-bold text-charcoal">عاوز تعرض منتجاتك؟</h2>
          </div>
          <p className="text-sm text-charcoal/80">
            سجل بياناتك وهنتواصل معاك عشان نضيف محلك على سوق البلد
          </p>
        </div>

        {/* Form */}
        <div className="bg-white border border-sand rounded-xl p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">اسم المحل *</label>
              <input
                type="text"
                value={formData.shopName}
                onChange={(e) => handleChange('shopName', e.target.value)}
                placeholder="مثال: بقالة البلد"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-sm focus:border-sahar focus:ring-2 focus:ring-sahar/15 outline-none transition-all ${errors.shopName ? 'border-error' : 'border-sand'}`}
              />
              {errors.shopName && <p className="text-error text-xs mt-1">{errors.shopName}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">اسم المالك *</label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => handleChange('ownerName', e.target.value)}
                placeholder="اسم صاحب المحل"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-sm focus:border-sahar focus:ring-2 focus:ring-sahar/15 outline-none transition-all ${errors.ownerName ? 'border-error' : 'border-sand'}`}
              />
              {errors.ownerName && <p className="text-error text-xs mt-1">{errors.ownerName}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">رقم التليفون *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="01xxxxxxxxx"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-sm focus:border-sahar focus:ring-2 focus:ring-sahar/15 outline-none transition-all ${errors.phone ? 'border-error' : 'border-sand'}`}
              />
              {errors.phone && <p className="text-error text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">نوع المحل *</label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className={`w-full h-11 px-4 bg-white border rounded-xl text-sm focus:border-sahar focus:ring-2 focus:ring-sahar/15 outline-none transition-all ${errors.category ? 'border-error' : 'border-sand'}`}
              >
                <option value="">اختار نوع المحل</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
                <option value="أخرى">أخرى</option>
              </select>
              {errors.category && <p className="text-error text-xs mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">العنوان *</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="عنوان المحل"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-sm focus:border-sahar focus:ring-2 focus:ring-sahar/15 outline-none transition-all ${errors.address ? 'border-error' : 'border-sand'}`}
              />
              {errors.address && <p className="text-error text-xs mt-1">{errors.address}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">ملاحظات</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="أي ملاحظات إضافية..."
                rows={3}
                className="w-full px-4 py-3 bg-white border border-sand rounded-xl text-sm focus:border-sahar focus:ring-2 focus:ring-sahar/15 outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-charcoal-muted text-center mt-4">
          هنراجع بياناتك ونتواصل في خلال 24 ساعة
        </p>

        <button
          onClick={() => void handleSubmit()}
          className="w-full h-14 bg-sahar text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 mt-6 hover:bg-sahar-dark transition-colors shadow-button"
        >
          <Send className="w-5 h-5" />
          سجل المحل
        </button>
      </div>
    </div>
  );
}

