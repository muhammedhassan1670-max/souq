import { useNavigate } from 'react-router-dom';
import { ArrowRight, Star, MapPin, Phone, ChevronLeft } from 'lucide-react';
import { useMarketState } from '@/hooks/useMarketState';
import { EmptyState, InlineError } from '@/components/DataState';

export default function Shops() {
  const { shops, isLoading, error, refresh } = useMarketState();
  const navigate = useNavigate();
  const activeShops = shops.filter((shop) => shop.active !== false);

  return (
    <div className="pb-24 lg:pb-16">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-cream/95 backdrop-blur border-b border-sand lg:top-16">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3 sm:px-6 lg:px-8">
          <button onClick={() => window.history.back()} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-cream-warm">
            <ArrowRight className="w-5 h-5 text-charcoal" />
          </button>
          <h1 className="text-lg font-bold text-charcoal">محلات بلدنا</h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {error && <InlineError message={error} onRetry={() => void refresh()} />}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-xl bg-sand/60" />
            ))}
          </div>
        ) : activeShops.length === 0 ? (
          <EmptyState title="لا توجد محلات" description="تقدر تطلب المنتج مباشرة على واتساب" actionLabel="اطلب المنتج واتساب" onAction={() => navigate('/order-anything')} />
        ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeShops.map((shop) => (
            <button
              key={shop.id}
              onClick={() => navigate('/products', { state: { shopId: shop.id } })}
              className="bg-white border border-sand rounded-xl overflow-hidden hover:shadow-card transition-shadow text-right"
            >
              <img
                src={shop.image}
                alt={shop.name}
                onError={(event) => {
                  event.currentTarget.src = '/images/shops/shop1.jpg';
                }}
                className="w-full h-32 object-cover"
              />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-charcoal">{shop.name}</h3>
                    <p className="text-xs text-charcoal-muted mt-0.5">{shop.ownerName}</p>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${shop.isOpen ? 'bg-success/15 text-success' : 'bg-error/15 text-error'}`}>
                    {shop.isOpen ? 'مفتوح' : 'مقفول'}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-charcoal-muted">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-sahar fill-sahar" />
                    {shop.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {shop.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {shop.deliveryAvailable ? 'توصيل متاح' : 'بدون توصيل'}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-charcoal-muted">{shop.productsCount} منتج</span>
                  <span className="text-xs text-sahar font-semibold flex items-center gap-0.5">
                    شوف المنتجات
                    <ChevronLeft className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

