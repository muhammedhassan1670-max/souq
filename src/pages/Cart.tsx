import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Minus, Trash2, ShoppingCart, Gift } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeFromCart, increaseQuantity, decreaseQuantity, getCartTotal, getDeliveryFee, getFinalTotal, getLoyaltyPoints, clearCart } = useCart();

  return (
    <div className="pb-24 lg:pb-16">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-cream/95 backdrop-blur border-b border-sand lg:top-16">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between sm:px-6 lg:px-8">
          <button onClick={() => window.history.back()} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-cream-warm">
            <ArrowRight className="w-5 h-5 text-charcoal" />
          </button>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-sahar" />
            <h1 className="text-lg font-bold text-charcoal">السلة</h1>
            <span className="bg-sahar text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          </div>
          <div className="w-9" />
        </div>
      </div>

      {/* Cart Content */}
      {items.length === 0 ? (
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
          <div className="w-24 h-24 bg-cream-warm rounded-full flex items-center justify-center mb-4">
            <ShoppingCart className="w-12 h-12 text-sand" />
          </div>
          <h2 className="text-xl font-bold text-charcoal mb-2">السلة فاضية</h2>
          <p className="text-sm text-charcoal-muted text-center mb-6">
            اختار منتجاتك واضغط ضيف للسلة
          </p>
          <button
            onClick={() => navigate('/products')}
            className="h-11 px-6 bg-sahar text-white font-semibold rounded-xl hover:bg-sahar-dark transition-colors"
          >
            تصفح المنتجات
          </button>
        </div>
      ) : (
        <>
          {/* Items */}
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            {items.map((item) => (
              <div key={item.product.id} className="flex gap-3 py-4 border-b border-sand last:border-0">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-charcoal line-clamp-1">{item.product.name}</h3>
                  <p className="text-xs text-charcoal-muted mt-0.5">{item.product.category}</p>
                  <p className="text-sm font-bold text-sahar-dark mt-1">
                    {item.product.price * item.quantity} جنيه
                  </p>
                  {item.product.oldPrice && item.product.oldPrice > item.product.price && (
                    <p className="text-xs text-success">
                      وفرت {((item.product.oldPrice - item.product.price) * item.quantity).toFixed(0)} جنيه
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center h-8 border border-sand rounded-lg">
                      <button
                        onClick={() => {
                          if (item.quantity <= 1) {
                            removeFromCart(item.product.id);
                          } else {
                            decreaseQuantity(item.product.id);
                          }
                        }}
                        className="w-8 h-full flex items-center justify-center hover:bg-cream-warm rounded-r-lg"
                      >
                        {item.quantity <= 1 ? <Trash2 className="w-3.5 h-3.5 text-error" /> : <Minus className="w-3.5 h-3.5" />}
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => increaseQuantity(item.product.id)}
                        className="w-8 h-full flex items-center justify-center hover:bg-cream-warm rounded-l-lg"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-xs text-charcoal-muted">{item.product.unit}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="w-8 h-8 flex items-center justify-center text-error hover:bg-error/10 rounded-lg self-start"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Clear Cart */}
          <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
            <button
              onClick={clearCart}
              className="w-full py-2 text-error text-sm font-medium hover:bg-error/5 rounded-xl transition-colors"
            >
              إفراغ السلة
            </button>
          </div>

          {/* Loyalty Points */}
          <div className="mx-4 mb-4 bg-gradient-to-r from-sahar-light to-sahar rounded-xl p-4 flex items-center gap-3 sm:mx-auto sm:max-w-7xl">
            <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center">
              <Gift className="w-5 h-5 text-sahar-dark" />
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal">نقط البلد</p>
              <p className="text-xs text-charcoal/70">
                هتكسب <span className="font-bold">{getLoyaltyPoints()}</span> نقطة من الطلب ده
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="mx-4 bg-white border border-sand rounded-xl p-4 mb-4 sm:mx-auto sm:max-w-7xl">
            <h3 className="font-bold text-charcoal mb-3">ملخص الطلب</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-muted">الإجمالي</span>
                <span className="font-semibold">{getCartTotal()} جنيه</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-muted">التوصيل</span>
                <span className={`font-semibold ${getDeliveryFee() === 0 ? 'text-success' : ''}`}>
                  {getDeliveryFee() === 0 ? 'مجاني' : `${getDeliveryFee()} جنيه`}
                </span>
              </div>
              <div className="border-t border-sand pt-2 flex justify-between">
                <span className="font-bold text-charcoal">الإجمالي النهائي</span>
                <span className="font-bold text-sahar-dark text-lg">{getFinalTotal()} جنيه</span>
              </div>
            </div>
          </div>

          {/* Checkout Button */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => navigate('/checkout')}
              className="w-full h-14 bg-sahar text-white rounded-xl font-bold text-base hover:bg-sahar-dark transition-colors shadow-button"
            >
              كمّل الطلب
            </button>
          </div>
        </>
      )}
    </div>
  );
}

