import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Tag, ShoppingCart, MessageCircle } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { generateWhatsAppLink } from '@/utils/whatsapp';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCartCount } = useCart();

  const openWhatsApp = () => {
    window.open(generateWhatsAppLink('أهلاً سوق البلد، مش عارف أستخدم الموقع وعاوز أطلب واتساب'), '_blank');
  };

  const tabs: Array<{
    label: string;
    icon: typeof Home;
    path?: string;
    action?: () => void;
  }> = [
    { label: 'الرئيسية', icon: Home, path: '/' },
    { label: 'الأقسام', icon: LayoutGrid, path: '/products' },
    { label: 'العروض', icon: Tag, path: '/offers' },
    { label: 'السلة', icon: ShoppingCart, path: '/cart' },
    { label: 'واتساب', icon: MessageCircle, action: openWhatsApp },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-sand lg:hidden">
      <div className="max-w-lg mx-auto h-16 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = 'path' in tab && location.pathname === tab.path;
          return (
            <button
              key={tab.label}
              onClick={() => {
                if (tab.action) {
                  tab.action();
                  return;
                }
                if (tab.path) navigate(tab.path);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full relative transition-colors ${
                isActive ? 'text-sahar' : 'text-charcoal-muted'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.label === 'السلة' && getCartCount() > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {getCartCount()}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-sahar" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
