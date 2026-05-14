import { useState } from 'react';
import { Check, Minus, Plus, ShoppingCart } from 'lucide-react';
import type { Product } from '@/data/types';
import { useCart } from '@/contexts/CartContext';

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
}

export default function ProductCard({ product, onQuickView }: ProductCardProps) {
  const { addToCart, removeFromCart, isInCart, getCartItem, increaseQuantity, decreaseQuantity } = useCart();
  const [imageLoaded, setImageLoaded] = useState(false);
  const cartItem = getCartItem(product.id);
  const inCart = isInCart(product.id);

  const handleCardClick = () => {
    onQuickView?.(product);
  };

  const stopAndRun = (event: React.MouseEvent, action: () => void) => {
    event.stopPropagation();
    action();
  };

  const handleAddToCart = () => {
    addToCart(product);
    window.dispatchEvent(new Event('souq-cart-added'));
  };

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-xl border border-sand bg-white shadow-card transition hover:border-olive/40 ${
        onQuickView ? 'cursor-pointer' : ''
      } ${!product.available ? 'opacity-75' : ''}`}
      onClick={handleCardClick}
    >
      <div className="relative aspect-square overflow-hidden bg-cream-warm">
        <img
          src={product.image}
          alt={product.name}
          className={`h-full w-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={(event) => {
            event.currentTarget.src = '/images/products/rice.jpg';
            setImageLoaded(true);
          }}
          loading="lazy"
        />
        {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-sand/60" />}

        {!product.available && (
          <span className="absolute right-2 top-2 rounded-full bg-charcoal px-2.5 py-1 text-[11px] font-extrabold text-white">
            خلصان حاليًا
          </span>
        )}
        {product.available && product.isOffer && (
          <span className="absolute right-2 top-2 rounded-full bg-clay px-2.5 py-1 text-[11px] font-extrabold text-white shadow-button">
            عرض
          </span>
        )}
        {product.available && product.isLocalProduct && (
          <span className="absolute left-2 top-2 rounded-full bg-olive px-2.5 py-1 text-[11px] font-extrabold text-white shadow-button">
            بلدي
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 lg:p-4">
        <h3 className="min-h-[40px] text-sm font-extrabold leading-5 text-charcoal line-clamp-2 lg:text-base lg:leading-6">
          {product.name}
        </h3>

        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xl font-black leading-none text-olive-dark lg:text-2xl">{product.price} جنيه</p>
            {product.oldPrice && product.oldPrice > product.price && (
              <p className="mt-1 text-xs font-semibold text-charcoal-muted line-through">{product.oldPrice} جنيه</p>
            )}
          </div>
          <span className="rounded-full bg-cream-warm px-2.5 py-1 text-[11px] font-bold text-charcoal">
            {product.unit}
          </span>
        </div>

        <div className="mt-3">
          {product.available ? (
            !inCart ? (
              <button
                onClick={(event) => stopAndRun(event, handleAddToCart)}
                className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-olive text-base font-extrabold text-white shadow-button transition hover:bg-olive-dark"
              >
                <ShoppingCart className="h-4 w-4" />
                ضيف للسلة
              </button>
            ) : (
              <div className="flex h-12 items-center overflow-hidden rounded-xl border border-sand bg-cream">
                <button
                  onClick={(event) =>
                    stopAndRun(event, () => {
                      if (cartItem && cartItem.quantity <= 1) {
                        removeFromCart(product.id);
                      } else {
                        decreaseQuantity(product.id);
                      }
                    })
                  }
                  className="flex h-full w-11 items-center justify-center bg-cream-warm transition hover:bg-sand"
                  aria-label="قلل الكمية"
                >
                  {cartItem && cartItem.quantity <= 1 ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Minus className="h-4 w-4 text-charcoal" />
                  )}
                </button>
                <span className="flex-1 text-center text-base font-extrabold text-charcoal">
                  {cartItem?.quantity || 0}
                </span>
                <button
                  onClick={(event) => stopAndRun(event, () => increaseQuantity(product.id))}
                  className="flex h-full w-11 items-center justify-center bg-cream-warm transition hover:bg-sand"
                  aria-label="زود الكمية"
                >
                  <Plus className="h-4 w-4 text-charcoal" />
                </button>
              </div>
            )
          ) : (
            <button
              disabled
              className="h-12 w-full cursor-not-allowed rounded-xl bg-sand text-base font-extrabold text-charcoal-muted"
            >
              خلصان حاليًا
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
