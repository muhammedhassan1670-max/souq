import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  Menu,
  MessageCircle,
  ShoppingCart,
  X,
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { generateWhatsAppLink } from '@/utils/whatsapp';
import { useMarketState } from '@/hooks/useMarketState';
import BrandLogo from '@/components/BrandLogo';

interface HeaderProps {
  onCartClick?: () => void;
}

const navItems = [
  { label: 'الرئيسية', path: '/' },
  { label: 'المنتجات', path: '/products' },
  { label: 'العروض', path: '/offers' },
];

const drawerItems = [
  ...navItems,
  { label: 'السلة', path: '/cart' },
  { label: 'اطلب واتساب', path: '/order-anything' },
  { label: 'تواصل معنا', path: '/contact' },
];

export default function Header({ onCartClick }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCartCount } = useCart();
  const { settings } = useMarketState();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleMenuItemClick = (path: string) => {
    setDrawerOpen(false);
    navigate(path);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-sand bg-white/90 shadow-xs backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between lg:hidden">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-cream-warm"
              aria-label="القائمة"
            >
              <Menu className="h-5 w-5 text-charcoal" />
            </button>

            <button onClick={() => navigate('/')} className="rounded-2xl px-1 py-0.5 transition hover:bg-cream">
              <BrandLogo size="sm" showTagline={false} />
            </button>

            <button
              onClick={onCartClick}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-cream-warm"
              aria-label="السلة"
            >
              <ShoppingCart className="h-5 w-5 text-charcoal" />
              {getCartCount() > 0 && (
                <span className="absolute -left-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                  {getCartCount()}
                </span>
              )}
            </button>
          </div>

          <div className="hidden h-16 items-center justify-between gap-6 lg:flex">
            <button onClick={() => navigate('/')} className="min-w-[210px] rounded-2xl p-1 text-right transition hover:bg-cream">
              <BrandLogo size="md" showTagline />
            </button>

            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex h-10 items-center rounded-xl px-4 text-sm font-extrabold transition ${
                      isActive ? 'bg-cream text-olive-dark' : 'text-charcoal-muted hover:bg-cream hover:text-charcoal'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <a
                href={generateWhatsAppLink('أهلًا سوق البلد، عاوز أطلب واتساب')}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center gap-2 rounded-xl bg-whatsapp px-4 text-sm font-extrabold text-white shadow-button"
              >
                <MessageCircle className="h-5 w-5" />
                واتساب
              </a>
              <button
                onClick={onCartClick}
                className="relative flex h-11 items-center gap-2 rounded-xl bg-olive px-4 text-sm font-extrabold text-white shadow-button"
              >
                <ShoppingCart className="h-5 w-5" />
                السلة
                {getCartCount() > 0 && (
                  <span className="absolute -left-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-error px-1 text-xs text-white">
                    {getCartCount()}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-charcoal/50 animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed bottom-0 right-0 top-0 z-[70] w-72 bg-white shadow-elevated animate-slide-up">
            <div className="flex items-center justify-between border-b border-sand p-4">
              <BrandLogo size="md" showTagline />
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-cream-warm"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5 text-charcoal" />
              </button>
            </div>

            <nav className="py-2">
              {drawerItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleMenuItemClick(item.path)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-right transition-colors ${
                      isActive ? 'bg-cream-warm text-olive-dark' : 'text-charcoal hover:bg-cream-warm'
                    }`}
                  >
                    <span className="flex-1 text-sm font-bold">{item.label}</span>
                    <ChevronLeft className="h-4 w-4 text-charcoal-muted" />
                  </button>
                );
              })}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 border-t border-sand bg-cream-warm/50 p-4">
              <p className="text-center text-xs font-bold text-charcoal-muted">للتواصل: {settings.phoneNumber}</p>
              <p className="mt-1 text-center text-xs text-charcoal-muted">من 8 صباحًا لـ 10 مساءً</p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
