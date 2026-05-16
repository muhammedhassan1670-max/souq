import { useMemo } from 'react';
import { ArrowRight, Tag, Clock } from 'lucide-react';
import { useMarketState } from '@/hooks/useMarketState';
import ProductCard from '@/components/ProductCard';
import { EmptyState, InlineError, LoadingGrid } from '@/components/DataState';
import { generateWhatsAppLink } from '@/utils/whatsapp';
import { createCategoryLookups, isProductCategoryVisible } from '@/utils/categoryUtils';

export default function Offers() {
  const { products, categories, isLoading, error, refresh } = useMarketState();

  const categoryLookups = useMemo(() => createCategoryLookups(categories), [categories]);
  const offers = useMemo(
    () => products.filter((product) => {
      return product.isOffer && isProductCategoryVisible(product, categoryLookups);
    }),
    [categoryLookups, products],
  );

  return (
    <div className="pb-24 lg:pb-16">
      {/* Hero */}
      <div className="bg-gradient-to-br from-clay to-clay-dark py-8 px-4 text-white">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => window.history.back()} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10">
            <ArrowRight className="w-5 h-5" />
          </button>
          <Tag className="w-5 h-5" />
          <h1 className="text-xl font-bold">عروض البلد النهارده</h1>
        </div>
        <p className="text-white/85 text-sm mr-11">أحسن العروض على منتجات البلد</p>
        <div className="flex items-center gap-2 mt-3 mr-11 bg-white/20 w-fit px-3 py-1.5 rounded-full">
          <Clock className="w-4 h-4" />
          <span className="text-xs">العروض لحد نفاذ الكمية</span>
        </div>
        </div>
      </div>

      {/* Offers Count */}
      {error && <InlineError message={error} onRetry={() => void refresh()} />}
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <p className="text-sm text-charcoal-muted">{offers.length} عرض متاح</p>
      </div>

      {/* Offers Grid */}
      {isLoading ? (
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <LoadingGrid items={5} />
        </div>
      ) : offers.length === 0 ? (
        <EmptyState
          title="لا توجد عروض حاليًا"
          description="تقدر تطلب أي منتج على واتساب"
          actionLabel="اطلب المنتج واتساب"
          onAction={() => window.open(generateWhatsAppLink('أهلاً سوق البلد، عاوز أطلب منتج'), '_blank')}
        />
      ) : (
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 sm:px-6 md:grid-cols-3 lg:grid-cols-4 lg:px-8 xl:grid-cols-5">
          {offers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

