import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

export default function StickyCartSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCartCount, getCartTotal } = useCart();
  const count = getCartCount();
  const hiddenRoutes = ['/cart', '/checkout'];

  if (count === 0 || hiddenRoutes.includes(location.pathname) || location.pathname.startsWith('/admin')) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-3 pb-2 lg:hidden">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-3 rounded-2xl border border-olive/20 bg-white px-3 shadow-elevated">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-olive/10">
          <ShoppingCart className="h-5 w-5 text-olive" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-charcoal">
            السلة: {count} منتجات - {getCartTotal()} جنيه
          </p>
        </div>
        <button
          onClick={() => navigate('/checkout')}
          className="h-10 flex-shrink-0 rounded-xl bg-clay px-4 text-sm font-extrabold text-white shadow-button"
        >
          كمّل الطلب
        </button>
      </div>
    </div>
  );
}
