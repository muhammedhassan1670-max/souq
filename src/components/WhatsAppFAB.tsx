import { MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { generateWhatsAppLink } from '@/utils/whatsapp';

export default function WhatsAppFAB() {
  const { getCartCount } = useCart();
  const location = useLocation();

  if (['/cart', '/checkout'].includes(location.pathname) || location.pathname.startsWith('/admin')) return null;

  const handleClick = () => {
    window.open(generateWhatsAppLink('أهلًا سوق البلد، عاوز أطلب واتساب'), '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed left-3 z-40 flex h-12 items-center gap-2 rounded-full bg-whatsapp px-3 text-white shadow-fab transition hover:scale-[1.02] lg:bottom-6 lg:left-6 lg:px-4 ${
        getCartCount() > 0 ? 'bottom-32' : 'bottom-20'
      }`}
      aria-label="اطلب واتساب"
    >
      <MessageCircle className="h-5 w-5 flex-shrink-0" />
      <span className="hidden text-sm font-extrabold sm:inline">واتساب</span>
    </button>
  );
}
