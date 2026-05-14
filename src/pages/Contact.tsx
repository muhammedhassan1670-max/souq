import { ArrowRight, Phone, MessageCircle, Clock, MapPin } from 'lucide-react';
import { generateWhatsAppLink } from '@/utils/whatsapp';
import { useMarketState } from '@/hooks/useMarketState';

export default function Contact() {
  const { settings } = useMarketState();

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-cream/95 backdrop-blur border-b border-sand">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => window.history.back()} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-cream-warm">
            <ArrowRight className="w-5 h-5 text-charcoal" />
          </button>
          <h1 className="text-lg font-bold text-charcoal">تواصل معنا</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Contact Cards */}
        <div className="space-y-3">
          <a
            href={`tel:${settings.phoneNumber}`}
            className="flex items-center gap-4 bg-white border border-sand rounded-xl p-4 hover:shadow-card transition-shadow"
          >
            <div className="w-12 h-12 bg-sahar/15 rounded-full flex items-center justify-center">
              <Phone className="w-6 h-6 text-sahar-dark" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-charcoal">اتصل بنا</p>
              <p className="text-sm text-charcoal-muted">{settings.phoneNumber}</p>
            </div>
          </a>

          <a
            href={generateWhatsAppLink('أهلاً سوق البلد!')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 bg-white border border-sand rounded-xl p-4 hover:shadow-card transition-shadow"
          >
            <div className="w-12 h-12 bg-whatsapp/15 rounded-full flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-whatsapp" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-charcoal">واتساب</p>
              <p className="text-sm text-charcoal-muted">{settings.whatsappNumber}</p>
            </div>
          </a>

          <div className="flex items-center gap-4 bg-white border border-sand rounded-xl p-4">
            <div className="w-12 h-12 bg-olive/15 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-olive" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-charcoal">ساعات العمل</p>
              <p className="text-sm text-charcoal-muted">{settings.workingHours}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white border border-sand rounded-xl p-4">
            <div className="w-12 h-12 bg-clay/15 rounded-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-clay" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-charcoal">مناطق التوصيل</p>
              <p className="text-sm text-charcoal-muted">{settings.deliveryAreas}</p>
              <p className="text-sm text-charcoal-muted">مجاني للطلبات فوق {settings.freeDeliveryMinimum} جنيه</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="font-bold text-charcoal mb-3">محتاج مساعدة؟</h3>
          <a
            href={generateWhatsAppLink('أهلاً سوق البلد، محتاج مساعدة')}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 bg-whatsapp text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="w-5 h-5" />
            تواصل معنا على واتساب
          </a>
        </div>
      </div>
    </div>
  );
}

