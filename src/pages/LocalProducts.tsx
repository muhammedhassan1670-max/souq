import { useState, useMemo } from 'react';
import { ArrowRight, Heart } from 'lucide-react';
import { useMarketState } from '@/hooks/useMarketState';
import type { Product } from '@/data/types';
import ProductCard from '@/components/ProductCard';
import QuickViewModal from '@/components/QuickViewModal';
import { EmptyState } from '@/components/DataState';
import {
  createCategoryLookups,
  getActiveCategories,
  isProductCategoryVisible,
  productMatchesCategory,
} from '@/utils/categoryUtils';

export default function LocalProducts() {
  const { products, categories } = useMarketState();
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const activeCategories = useMemo(() => getActiveCategories(categories), [categories]);
  const categoryLookups = useMemo(() => createCategoryLookups(categories), [categories]);
  const selectedCategory = activeCategory === 'الكل'
    ? undefined
    : activeCategories.find((category) => category.id === activeCategory || category.name === activeCategory);
  const localProducts = useMemo(() => {
    let result = products.filter((product) => product.isLocalProduct && isProductCategoryVisible(product, categoryLookups));
    if (activeCategory !== 'الكل') {
      if (!selectedCategory || selectedCategory.comingSoon) return [];
      result = result.filter((product) => productMatchesCategory(product, selectedCategory, categoryLookups));
    }
    return result;
  }, [activeCategory, categoryLookups, products, selectedCategory]);

  return (
    <div className="pb-24 lg:pb-16">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-cream/95 backdrop-blur border-b border-sand lg:top-16">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3 sm:px-6 lg:px-8">
          <button onClick={() => window.history.back()} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-cream-warm">
            <ArrowRight className="w-5 h-5 text-charcoal" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-charcoal">من خير بلدنا</h1>
            <p className="text-xs text-charcoal-muted">منتجات طازجة من قريتك</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {['الكل', ...activeCategories.map((category) => category.id)].map((cat) => {
            const category = cat === 'الكل' ? undefined : activeCategories.find((item) => item.id === cat);
            const label = category?.name || cat;
            return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-olive text-white'
                  : 'bg-cream-warm text-charcoal border border-sand hover:border-olive'
              }`}
            >
              {label}
              {category?.comingSoon && <span className="mr-1 text-[10px] font-black">قريبًا</span>}
            </button>
            );
          })}
        </div>
      </div>

      {/* Products */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-olive" />
          <span className="text-sm text-charcoal-muted">{localProducts.length} منتج بلدي</span>
        </div>
        {localProducts.length === 0 ? (
          <EmptyState title="لا توجد منتجات بلدي" description="سيتم عرض المنتجات البلدي هنا بعد إضافتها من الأدمن." />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {localProducts.map((product) => (
              <ProductCard key={product.id} product={product} onQuickView={(p) => { setSelectedProduct(p); setQuickViewOpen(true); }} />
            ))}
          </div>
        )}
      </div>

      <QuickViewModal product={selectedProduct} isOpen={quickViewOpen} onClose={() => setQuickViewOpen(false)} />
    </div>
  );
}

