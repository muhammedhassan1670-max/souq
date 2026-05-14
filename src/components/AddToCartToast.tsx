import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';

export default function AddToCartToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;

    const showToast = () => {
      setVisible(true);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setVisible(false), 1500);
    };

    window.addEventListener('souq-cart-added', showToast);
    return () => {
      window.removeEventListener('souq-cart-added', showToast);
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed left-1/2 top-20 z-[90] -translate-x-1/2 rounded-full border border-success/20 bg-white px-4 py-2 shadow-elevated">
      <div className="flex items-center gap-2 text-sm font-extrabold text-success">
        <CheckCircle className="h-5 w-5" />
        تمت الإضافة للسلة
      </div>
    </div>
  );
}
