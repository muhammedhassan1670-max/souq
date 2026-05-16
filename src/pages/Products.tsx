import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMarketState } from '@/hooks/useMarketState';
import ProductCard from '@/components/ProductCard';
import { EmptyState, InlineError, LoadingGrid } from '@/components/DataState';
import { getQuickSearchTerms, searchProducts } from '@/utils/productSearch';
import { generateWhatsAppLink } from '@/utils/whatsapp';
import {
  createCategoryLookups,
  getActiveCategories,
  isProductCategoryVisible,
  productMatchesCategory,
} from '@/utils/categoryUtils';

export default function Products() {
  const { products, categories, isLoading, error, refresh } = useMarketState();
  const location = useLocation();
  const initialCategory = (location.state as { category?: string })?.category || '';
  const initialShopId = (location.state as { shopId?: string | number })?.shopId;
  const initialLocalOnly = (location.state as { localOnly?: boolean })?.localOnly || false;
  const initialOffersOnly = (location.state as { offersOnly?: boolean })?.offersOnly || false;
  const initialQuery = (location.state as { query?: string })?.query || '';

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high' | 'popular'>('newest');

  // Filters
  const [offersOnly, setOffersOnly] = useState(initialOffersOnly);
  const [localOnly, setLocalOnly] = useState(initialLocalOnly);
  const [availableOnly, setAvailableOnly] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const activeCategories = useMemo(() => getActiveCategories(categories), [categories]);
  const categoryLookups = useMemo(() => createCategoryLookups(categories), [categories]);
  const selectedCategoryInfo = selectedCategory
    ? activeCategories.find((category) => category.id === selectedCategory || category.name === selectedCategory)
    : undefined;
  const selectedCategoryLabel = selectedCategoryInfo?.name || '';
  const selectedCategoryComingSoon = selectedCategoryInfo?.comingSoon === true;

  const filteredProducts = useMemo(() => {
    let result = [...products];

    result = result.filter((product) => isProductCategoryVisible(product, categoryLookups));

    if (selectedCategory && !selectedCategoryInfo) {
      return [];
    }

    if (selectedCategoryComingSoon) {
      return [];
    }

    if (selectedCategoryInfo) {
      result = result.filter((product) => productMatchesCategory(product, selectedCategoryInfo, categoryLookups));
    }

    if (searchQuery.trim()) {
      result = searchProducts(result, searchQuery);
    }

    // Shop filter
    if (initialShopId) {
      result = result.filter(p => p.shopId === initialShopId);
    }

    // Offers only
    if (offersOnly) {
      result = result.filter(p => p.isOffer);
    }

    // Local only
    if (localOnly) {
      result = result.filter(p => p.isLocalProduct);
    }

    // Available only
    if (availableOnly) {
      result = result.filter(p => p.available);
    }

    // Sort
    switch (sortBy) {
      case 'price_low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        result.sort((a, b) => b.tags.length - a.tags.length);
        break;
      default:
        // newest - keep original order
        break;
    }

    return result;
  }, [products, categoryLookups, selectedCategory, selectedCategoryInfo, selectedCategoryComingSoon, searchQuery, initialShopId, offersOnly, localOnly, availableOnly, sortBy]);

  const filterChips = [
    { label: 'كل المنتجات', active: !selectedCategory && !offersOnly && !localOnly && !searchQuery, onClick: () => { setSelectedCategory(''); setOffersOnly(false); setLocalOnly(false); setSearchQuery(''); } },
    { label: 'عروض', active: offersOnly, onClick: () => { setOffersOnly(!offersOnly); setLocalOnly(false); } },
    { label: 'بلدي', active: localOnly, onClick: () => { setLocalOnly(!localOnly); setOffersOnly(false); } },
    { label: 'المتاح فقط', active: availableOnly, onClick: () => setAvailableOnly(!availableOnly) },
  ];
  const quickSearchTerms = useMemo(() => getQuickSearchTerms(products.filter((product) => isProductCategoryVisible(product, categoryLookups))), [categoryLookups, products]);

  const handleWhatsAppOrder = () => {
    window.open(generateWhatsAppLink(searchQuery ? `مش لاقي المنتج؟ عاوز أطلب: ${searchQuery}` : 'مش لاقي المنتج؟ عاوز أطلب واتساب'), '_blank');
  };

  return (
    <div className="pb-24 lg:pb-16">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-cream/95 backdrop-blur border-b border-sand lg:top-16">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => window.history.back()} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-cream-warm">
              <ArrowRight className="w-5 h-5 text-charcoal" />
            </button>
            <h1 className="text-lg font-bold text-charcoal">
              {initialShopId ? 'منتجات المحل' : selectedCategoryLabel || 'كل المنتجات'}
            </h1>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-cream-warm"
            >
              <SlidersHorizontal className="w-5 h-5 text-charcoal" />
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-olive" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="بتدور على إيه؟ سكر، زيت، رز، طماطم..."
              className="h-12 w-full rounded-xl border-2 border-olive/20 bg-white pr-10 pl-10 text-base font-semibold text-charcoal outline-none transition focus:border-olive focus:ring-4 focus:ring-olive/10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-cream-warm text-charcoal-muted"
                aria-label="مسح البحث"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mb-2 flex gap-2 overflow-x-auto no-scrollbar">
            {quickSearchTerms.map((term) => (
              <button
                key={term}
                onClick={() => setSearchQuery(term)}
                className="h-9 flex-shrink-0 rounded-full border border-sand bg-white px-3 text-xs font-extrabold text-charcoal"
              >
                {term}
              </button>
            ))}
          </div>

          {/* Filter Chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {filterChips.map((chip, index) => (
              <button
                key={index}
                onClick={chip.onClick}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  chip.active
                    ? 'bg-sahar text-white'
                    : 'bg-cream-warm text-charcoal border border-sand hover:border-sahar'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mt-1">
            {activeCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategoryInfo?.id === cat.id ? '' : cat.id)}
                className={`inline-flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategoryInfo?.id === cat.id
                    ? 'bg-sahar text-white'
                    : cat.comingSoon
                      ? 'bg-clay/10 text-clay-dark border border-clay/20 hover:border-clay'
                      : 'bg-cream-warm text-charcoal border border-sand hover:border-sahar'
                }`}
              >
                {cat.imageUrl && (
                  <img
                    src={cat.imageUrl}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                {cat.name}
                {cat.comingSoon && <span className="mr-1 text-[10px] font-black">قريبًا</span>}
              </button>
            ))}
          </div>

          {/* Sort & Filters Panel */}
          {showFilters && (
            <div className="mt-2 p-3 bg-white border border-sand rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-charcoal">ترتيب:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="text-sm bg-cream-warm border border-sand rounded-lg px-2 py-1"
                >
                  <option value="newest">الأحدث</option>
                  <option value="price_low">الأرخص</option>
                  <option value="price_high">الأغلى</option>
                  <option value="popular">الأكثر طلباً</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      {error && <InlineError message={error} onRetry={() => void refresh()} />}
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <p className="text-sm text-charcoal-muted">
          {selectedCategoryComingSoon ? 'القسم قريبًا' : `${filteredProducts.length} منتج`}
          {selectedCategoryLabel && !selectedCategoryComingSoon && ` في ${selectedCategoryLabel}`}
          {searchQuery && ` عن "${searchQuery}"`}
        </p>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <LoadingGrid items={10} />
        </div>
      ) : selectedCategoryComingSoon ? (
        <EmptyState
          title={`${selectedCategoryLabel} قريبًا`}
          description="القسم ده قريبًا، تابعنا قريبًا"
          actionLabel="اطلب واتساب"
          onAction={handleWhatsAppOrder}
        />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="مش لاقي المنتج؟"
          description="ابعتلنا طلبك واتساب"
          actionLabel="اطلب المنتج واتساب"
          onAction={handleWhatsAppOrder}
        />
      ) : (
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 sm:px-6 md:grid-cols-3 lg:grid-cols-4 lg:px-8 xl:grid-cols-5">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

