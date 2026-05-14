import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Search, ArrowLeft, MessageCircle } from 'lucide-react';
import { useMarketState } from '@/hooks/useMarketState';
import type { Product } from '@/data/types';
import ProductCard from './ProductCard';
import { generateWhatsAppLink } from '@/utils/whatsapp';
import { searchProducts } from '@/utils/productSearch';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onProductClick?: (product: Product) => void;
}

export default function SearchOverlay({ isOpen, onClose, onProductClick }: SearchOverlayProps) {
  const { products } = useMarketState();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    return searchProducts(products, query);
  }, [query, products]);

  const handleWhatsAppOrder = () => {
    window.open(generateWhatsAppLink(`مش لاقي المنتج؟ عاوز أطلب: ${query}`), '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-white animate-fade-in flex flex-col">
      {/* Search Header */}
      <div className="p-4 border-b border-sand">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-cream-warm transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-charcoal" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بتدور على إيه؟ سكر، زيت، رز، طماطم..."
              className="w-full h-12 pr-10 pl-10 bg-cream border-2 border-olive/20 rounded-xl text-base font-semibold focus:border-olive focus:ring-4 focus:ring-olive/10 outline-none transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-charcoal-muted" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-7xl">
        {!query.trim() ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-sand mx-auto mb-3" />
            <p className="text-charcoal-muted text-sm font-semibold">
              اكتب اسم المنتج أو دوس على كلمة جاهزة
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {['سكر', 'زيت', 'رز', 'خضار', 'منظفات', 'فراخ', 'لبن'].map((term) => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="h-10 px-4 bg-cream-warm text-charcoal text-sm font-bold rounded-full hover:bg-sand transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <X className="w-12 h-12 text-sand mx-auto mb-3" />
            <p className="text-charcoal font-extrabold mb-2">مش لاقي المنتج؟ ابعتلنا طلبك واتساب</p>
            <button
              onClick={handleWhatsAppOrder}
              className="mx-auto mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-whatsapp px-5 text-sm font-extrabold text-white shadow-button"
            >
              <MessageCircle className="h-5 w-5" />
              اطلب واتساب
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-charcoal-muted mb-3">
              {results.length} نتيجة لـ "{query}"
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {results.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={onProductClick}
                />
              ))}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
