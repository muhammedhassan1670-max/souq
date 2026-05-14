import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const navigate = useNavigate();
  const { items, removeFromCart, increaseQuantity, decreaseQuantity, getCartTotal, getDeliveryFee, getFinalTotal, clearCart } = useCart();

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[60] bg-charcoal/55 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed bottom-0 left-0 top-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-elevated animate-slide-up lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:h-[calc(100vh-48px)] lg:max-h-[720px] lg:max-w-[520px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:overflow-hidden lg:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sand">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-sahar" />
            <h2 className="font-bold text-charcoal text-lg">السلة</h2>
            <span className="bg-sahar text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-cream-warm transition-colors"
          >
            <X className="w-5 h-5 text-charcoal" />
          </button>
        </div>

        {/* Cart Items */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <ShoppingCart className="w-16 h-16 text-sand mb-4" />
            <h3 className="text-lg font-semibold text-charcoal mb-2">السلة فاضية</h3>
            <p className="text-sm text-charcoal-muted text-center mb-4">
              اختار منتجاتك واضغط ضيف للسلة
            </p>
            <button
              onClick={() => {
                onClose();
                navigate('/products');
              }}
              className="h-10 bg-sahar text-white px-6 rounded-xl font-semibold text-sm hover:bg-sahar-dark transition-colors"
            >
              تصفح المنتجات
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3 py-3 border-b border-sand last:border-0">
                  {/* Thumbnail */}
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-charcoal line-clamp-1">
                      {item.product.name}
                    </h4>
                    <p className="text-xs text-charcoal-muted mt-0.5">
                      {item.product.price} ج / {item.product.unit}
                    </p>
                    <p className="text-sm font-bold text-sahar-dark mt-1">
                      {item.product.price * item.quantity} ج
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="w-7 h-7 flex items-center justify-center text-error hover:bg-error/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center h-8 border border-sand rounded-lg">
                      <button
                        onClick={() => decreaseQuantity(item.product.id)}
                        className="w-7 h-full flex items-center justify-center hover:bg-cream-warm rounded-r-lg transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => increaseQuantity(item.product.id)}
                        className="w-7 h-full flex items-center justify-center hover:bg-cream-warm rounded-l-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Clear cart */}
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="w-full mt-4 text-error text-sm font-medium py-2 hover:bg-error/5 rounded-xl transition-colors"
                >
                  إفراغ السلة
                </button>
              )}
            </div>

            {/* Summary */}
            <div className="border-t border-sand p-4 bg-cream-warm/30">
              <div className="space-y-2 mb-4">
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

              <button
                onClick={() => {
                  onClose();
                  navigate('/checkout');
                }}
                className="w-full h-12 bg-sahar text-white rounded-xl font-bold text-base hover:bg-sahar-dark transition-colors shadow-button"
              >
              كمّل الطلب
              </button>
              <button
                onClick={onClose}
                className="w-full mt-2 text-charcoal-muted text-sm font-medium py-2 hover:text-charcoal transition-colors flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                كمل تسوق
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
