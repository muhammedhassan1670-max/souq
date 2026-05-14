import { Link } from 'react-router-dom';
import { Clock, MessageCircle, Phone } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useMarketState } from '@/hooks/useMarketState';
import { generateWhatsAppLink } from '@/utils/whatsapp';

export default function Footer() {
  const { settings } = useMarketState();

  return (
    <footer className="mt-12 border-t border-sand bg-white/75 pb-24 pt-8 lg:pb-8">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
        <div>
          <BrandLogo size="lg" showTagline />
          <p className="mt-3 max-w-md text-sm font-semibold leading-7 text-charcoal-muted">
            سوق البلد يوصل احتياجات البيت اليومية من أقرب محل لحد بابك.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-black text-charcoal">روابط مختصرة</h3>
          <div className="mt-3 grid gap-2 text-sm font-bold text-charcoal-muted">
            <Link className="transition hover:text-olive-dark" to="/products">المنتجات</Link>
            <Link className="transition hover:text-olive-dark" to="/offers">العروض</Link>
            <Link className="transition hover:text-olive-dark" to="/shops">المحلات</Link>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-black text-charcoal">التواصل</h3>
          <div className="mt-3 space-y-2 text-sm font-bold text-charcoal-muted">
            <a className="flex items-center gap-2 transition hover:text-olive-dark" href={`tel:${settings.phoneNumber}`}>
              <Phone className="h-4 w-4 text-olive" />
              {settings.phoneNumber}
            </a>
            <a
              className="flex items-center gap-2 transition hover:text-olive-dark"
              href={generateWhatsAppLink('أهلًا سوق البلد، عاوز أطلب واتساب')}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="h-4 w-4 text-whatsapp" />
              واتساب
            </a>
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-clay" />
              {settings.workingHours}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
