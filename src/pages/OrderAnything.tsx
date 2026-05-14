import { useState } from 'react';
import { ArrowRight, Camera, Send } from 'lucide-react';
import { generateCustomOrderMessage, openWhatsApp } from '@/utils/whatsapp';
import { createCustomRequest } from '@/services/ordersService';

export default function OrderAnything() {
  const [request, setRequest] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    village: '',
    street: '',
    addressDetails: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!request.trim()) newErrors.request = 'اكتب طلبك';
    if (!formData.name.trim()) newErrors.name = 'الاسم مطلوب';
    if (!formData.phone.trim()) newErrors.phone = 'رقم التليفون مطلوب';
    if (!formData.village.trim()) newErrors.village = 'القرية مطلوبة';
    if (!formData.street.trim()) newErrors.street = 'الشارع مطلوب';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await createCustomRequest({
        customerName: formData.name,
        phone: formData.phone,
        requestText: request,
        address: `${formData.village} - ${formData.street} - ${formData.addressDetails}`,
      });
    } catch {
      // WhatsApp is still the customer-facing confirmation path.
    }
    const message = generateCustomOrderMessage(request, formData);
    openWhatsApp(message);
    setRequest('');
  };

  const handleImageRequest = () => {
    const message = 'أهلاً سوق البلد! ابعتلك صورة للحاجة اللي عاوزها';
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
          <h1 className="text-lg font-bold text-charcoal">اطلب أي حاجة</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Description */}
        <div className="bg-gradient-to-r from-sahar-light to-sahar rounded-xl p-4 mb-6">
          <p className="text-charcoal font-semibold text-sm">
            مش لاقي اللي عاوزه؟ اكتبهولنا وهنجيبهولك
          </p>
          <p className="text-charcoal/70 text-xs mt-1">
            اكتب أي حاجة محتاجها ومش موجودة في المنتجات
          </p>
        </div>

        {/* Request Textarea */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-charcoal mb-1.5">
            اكتب طلبك *
          </label>
          <textarea
            value={request}
            onChange={(e) => {
              setRequest(e.target.value);
              if (errors.request) {
                setErrors(prev => { const n = { ...prev }; delete n.request; return n; });
              }
            }}
            placeholder="مثال: عاوز كيس علف 25 كيلو، عاوز علاج معين من الصيدلية، عاوز لمبة 18 وات..."
            rows={4}
            className={`w-full px-4 py-3 bg-white border rounded-xl text-sm focus:border-sahar focus:ring-2 focus:ring-sahar/15 outline-none transition-all resize-none ${errors.request ? 'border-error' : 'border-sand'}`}
          />
          {errors.request && <p className="text-error text-xs mt-1">{errors.request}</p>}
        </div>

        {/* Image Upload Button */}
        <button
          onClick={handleImageRequest}
          className="w-full h-14 border-2 border-dashed border-sand rounded-xl flex items-center justify-center gap-2 mb-6 hover:border-sahar hover:bg-cream-warm/50 transition-all"
        >
          <Camera className="w-5 h-5 text-charcoal-muted" />
          <span className="text-sm text-charcoal-muted">أو ابعت صورة الحاجة اللي عاوزها على واتساب</span>
        </button>

        {/* Customer Info */}
        <div className="bg-white border border-sand rounded-xl p-4">
          <h3 className="font-bold text-charcoal mb-4">بياناتك</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">الاسم *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="اكتب اسمك"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-sm focus:border-sahar focus:ring-2 focus:ring-sahar/15 outline-none transition-all ${errors.name ? 'border-error' : 'border-sand'}`}
              />
              {errors.name && <p className="text-error text-xs mt-1">{errors.name}</p>}
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
              <label className="block text-sm font-semibold text-charcoal mb-1.5">القرية / المنطقة *</label>
              <input
                type="text"
                value={formData.village}
                onChange={(e) => handleChange('village', e.target.value)}
                placeholder="اسم القرية"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-sm focus:border-sahar focus:ring-2 focus:ring-sahar/15 outline-none transition-all ${errors.village ? 'border-error' : 'border-sand'}`}
              />
              {errors.village && <p className="text-error text-xs mt-1">{errors.village}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">الشارع *</label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) => handleChange('street', e.target.value)}
                placeholder="اسم الشارع"
                className={`w-full h-11 px-4 bg-white border rounded-xl text-sm focus:border-sahar focus:ring-2 focus:ring-sahar/15 outline-none transition-all ${errors.street ? 'border-error' : 'border-sand'}`}
              />
              {errors.street && <p className="text-error text-xs mt-1">{errors.street}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">العنوان بالتفصيل</label>
              <textarea
                value={formData.addressDetails}
                onChange={(e) => handleChange('addressDetails', e.target.value)}
                placeholder="رقم البيت، علامة مميزة..."
                rows={2}
                className="w-full px-4 py-3 bg-white border border-sand rounded-xl text-sm focus:border-sahar focus:ring-2 focus:ring-sahar/15 outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={() => void handleSubmit()}
          className="w-full h-14 bg-whatsapp text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 mt-6 hover:opacity-90 transition-opacity shadow-md"
        >
          <Send className="w-5 h-5" />
          ابعت الطلب على واتساب
        </button>
      </div>
    </div>
  );
}

