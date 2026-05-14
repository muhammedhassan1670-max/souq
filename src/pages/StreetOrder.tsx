import { useState } from 'react';
import { ArrowRight, Home, Users, Send } from 'lucide-react';
import { generateStreetOrderMessage, openWhatsApp } from '@/utils/whatsapp';

export default function StreetOrder() {
  const [formData, setFormData] = useState({
    streetName: '',
    homesCount: '',
    products: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.streetName.trim()) newErrors.streetName = 'اسم الشارع مطلوب';
    if (!formData.homesCount.trim()) newErrors.homesCount = 'عدد البيوت مطلوب';
    if (!formData.products.trim()) newErrors.products = 'اكتب المنتجات المطلوبة';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const message = generateStreetOrderMessage(formData);
    openWhatsApp(message);
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-cream/95 backdrop-blur border-b border-sand">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => window.history.back()} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-cream-warm">
            <ArrowRight className="w-5 h-5 text-charcoal" />
          </button>
          <h1 className="text-lg font-bold text-charcoal">طلبية شارع</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Info Card */}
        <div className="bg-gradient-to-r from-sahar-light to-sahar rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Home className="w-5 h-5 text-sahar-dark" />
            <h2 className="font-bold text-charcoal">طلبية شارع</h2>
          </div>
          <p className="text-sm text-charcoal/80 mb-3">
            لو أكتر من بيت في نفس الشارع طلبوا مع بعض، التوصيل يبقى أرخص أو مجاني
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-white/40 rounded-lg px-3 py-2">
              <Users className="w-4 h-4 text-sahar-dark" />
              <span className="text-sm text-charcoal">3 بيوت من نفس الشارع = خصم على التوصيل</span>
            </div>
            <div className="flex items-center gap-2 bg-white/40 rounded-lg px-3 py-2">
              <Home className="w-4 h-4 text-sahar-dark" />
              <span className="text-sm text-charcoal">طلبية الشارع فوق 500 جنيه = توصيل مجاني</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white border border-sand rounded-xl p-4">
          <h3 className="font-bold text-charcoal mb-4">تفاصيل الطلبية</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">اسم الشارع *</label>
              <input
                type="text"
                value={formData.streetName}
                onChange={(e) => handleChange('streetName', e.target.value)}
                placeholder="مثال: شارع الجمهورية"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-sm focus:border-sahar focus:ring-2 focus:ring-sahar/15 outline-none transition-all ${errors.streetName ? 'border-error' : 'border-sand'}`}
              />
              {errors.streetName && <p className="text-error text-xs mt-1">{errors.streetName}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">عدد البيوت المشتركة *</label>
              <input
                type="number"
                value={formData.homesCount}
                onChange={(e) => handleChange('homesCount', e.target.value)}
                placeholder="مثال: 5"
                min="2"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-sm focus:border-sahar focus:ring-2 focus:ring-sahar/15 outline-none transition-all ${errors.homesCount ? 'border-error' : 'border-sand'}`}
              />
              {errors.homesCount && <p className="text-error text-xs mt-1">{errors.homesCount}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">المنتجات المطلوبة *</label>
              <textarea
                value={formData.products}
                onChange={(e) => handleChange('products', e.target.value)}
                placeholder="اكتب المنتجات اللي محتاجينها..."
                rows={4}
                className={`w-full px-4 py-3 bg-white border rounded-xl text-sm focus:border-sahar focus:ring-2 focus:ring-sahar/15 outline-none transition-all resize-none ${errors.products ? 'border-error' : 'border-sand'}`}
              />
              {errors.products && <p className="text-error text-xs mt-1">{errors.products}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">ملاحظات</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="أي ملاحظات إضافية..."
                rows={2}
                className="w-full px-4 py-3 bg-white border border-sand rounded-xl text-sm focus:border-sahar focus:ring-2 focus:ring-sahar/15 outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className="w-full h-14 bg-whatsapp text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 mt-6 hover:opacity-90 transition-opacity shadow-md"
        >
          <Send className="w-5 h-5" />
          ابعت الطلب على واتساب
        </button>
      </div>
    </div>
  );
}

