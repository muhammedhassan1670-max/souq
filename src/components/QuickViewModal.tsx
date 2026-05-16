import { useMemo } from 'react';
import { X, Plus, Minus, ShoppingCart, MessageCircle, Check } from 'lucide-react';
import type { Product } from '@/data/types';
import { useCart } from '@/contexts/CartContext';
import { useMarketState } from '@/hooks/useMarketState';
import { generateWhatsAppLink } from '@/utils/whatsapp';
import { createCategoryLookups, findProductCategory } from '@/utils/categoryUtils';

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const { shops, categories } = useMarketState();
  const { addToCart, isInCart, getCartItem, increaseQuantity, decreaseQuantity, removeFromCart } = useCart();
  const categoryLookups = useMemo(() => createCategoryLookups(categories), [categories]);

  if (!isOpen || !product) return null;

  const cartItem = getCartItem(product.id);
  const inCart = isInCart(product.id);
  const shop = product.shopId ? shops.find((s) => s.id === product.shopId) : null;
  const categoryName = findProductCategory(product, categoryLookups)?.name || product.category;

  const discountPercent = product.oldPrice && product.oldPrice > product.price
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  const handleWhatsAppOrder = () => {
    const message = `أهلاً، عاوز أطلب ${product.name} - ${product.price} جنيه (${product.unit})`;
    window.open(generateWhatsAppLink(message), '_blank');
  };

  const handleAddToCart = () => {
    addToCart(product);
    window.dispatchEvent(new Event('souq-cart-added'));
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-charcoal/50 z-[60] animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white z-[70] animate-slide-up rounded-t-3xl overflow-hidden flex flex-col">
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-sand rounded-full" />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md z-10"
        >
          <X className="w-5 h-5 text-charcoal" />
        </button>

        {/* Image */}
        <div className="relative h-56 flex-shrink-0">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4 flex gap-1">
            {product.isOffer && discountPercent > 0 && (
              <span className="bg-error text-white text-xs font-bold px-3 py-1 rounded-full">
                خصم {discountPercent}%
              </span>
            )}
            {product.isLocalProduct && (
              <span className="bg-olive text-white text-xs font-bold px-3 py-1 rounded-full">
                بلدي
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <span className="text-xs text-charcoal-muted">{categoryName}</span>
          <h2 className="text-xl font-bold text-charcoal mt-1">{product.name}</h2>

          {/* Price */}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-2xl font-bold text-sahar-dark">{product.price} جنيه</span>
            {product.oldPrice && product.oldPrice > product.price && (
              <span className="text-base text-charcoal-muted line-through">{product.oldPrice} جنيه</span>
            )}
          </div>

          {/* Unit & Availability */}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-sm bg-cream-warm text-charcoal px-3 py-1 rounded-full">
              {product.unit}
            </span>
            {product.available ? (
              <span className="flex items-center gap-1.5 text-sm text-success">
                <span className="w-2 h-2 rounded-full bg-success" />
                متاح
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-error">
                <span className="w-2 h-2 rounded-full bg-error" />
                خلصان حاليًا
              </span>
            )}
          </div>

          {/* Shop */}
          {shop && (
            <div className="mt-4 p-3 bg-cream-warm/50 rounded-xl">
              <p className="text-xs text-charcoal-muted mb-1">البيع من</p>
              <p className="text-sm font-semibold text-charcoal">{shop.name}</p>
            </div>
          )}

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {product.tags.map((tag) => (
                <span key={tag} className="text-xs bg-cream-warm text-charcoal-muted px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {product.available && (
          <div className="p-4 border-t border-sand bg-white">
            {!inCart ? (
              <div className="flex gap-2">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 h-12 bg-sahar text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-sahar-dark transition-colors shadow-button"
                >
                  <ShoppingCart className="w-5 h-5" />
                  ضيف للسلة
                </button>
                <button
                  onClick={handleWhatsAppOrder}
                  className="h-12 px-4 bg-olive text-white rounded-xl font-semibold text-sm flex items-center gap-1.5 hover:bg-olive-dark transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  واتساب
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center h-12 border border-sand rounded-xl">
                  <button
                    onClick={() => {
                      if (cartItem && cartItem.quantity <= 1) {
                        removeFromCart(product.id);
                      } else {
                        decreaseQuantity(product.id);
                      }
                    }}
                    className="w-12 h-full flex items-center justify-center bg-cream-warm rounded-r-xl hover:bg-sand transition-colors"
                  >
                    {cartItem && cartItem.quantity <= 1 ? (
                      <Check className="w-5 h-5 text-success" />
                    ) : (
                      <Minus className="w-5 h-5" />
                    )}
                  </button>
                  <span className="flex-1 text-center text-lg font-semibold">
                    {cartItem?.quantity || 0}
                  </span>
                  <button
                    onClick={() => increaseQuantity(product.id)}
                    className="w-12 h-full flex items-center justify-center bg-cream-warm rounded-l-xl hover:bg-sand transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={handleWhatsAppOrder}
                  className="h-12 px-4 bg-olive text-white rounded-xl font-semibold text-sm flex items-center gap-1.5 hover:bg-olive-dark transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  واتساب
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
