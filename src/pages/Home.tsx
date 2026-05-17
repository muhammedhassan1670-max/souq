import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Apple,
  Baby,
  Beef,
  ChevronLeft,
  Fish,
  Heart,
  Home as HomeIcon,
  Leaf,
  MessageCircle,
  Package,
  Phone,
  Search,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  Store,
  Tag,
} from 'lucide-react';
import { useMarketState } from '@/hooks/useMarketState';
import ProductCard from '@/components/ProductCard';
import { EmptyState, InlineError, LoadingGrid } from '@/components/DataState';
import { generateWhatsAppLink } from '@/utils/whatsapp';
import { getQuickSearchTerms, searchProducts } from '@/utils/productSearch';
import { createCategoryLookups, getActiveCategories, isProductCategoryVisible } from '@/utils/categoryUtils';

function normalizeIconKey(icon?: string) {
  return icon?.replace(/[\s_-]+/g, '').toLowerCase() || '';
}

function CategoryFallbackIcon({ icon }: { icon?: string }) {
  const className = 'h-6 w-6';

  switch (normalizeIconKey(icon)) {
    case 'apple':
      return <Apple className={className} />;
    case 'baby':
      return <Baby className={className} />;
    case 'beef':
      return <Beef className={className} />;
    case 'fish':
      return <Fish className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'home':
    case 'homeicon':
      return <HomeIcon className={className} />;
    case 'leaf':
      return <Leaf className={className} />;
    case 'shoppingbag':
      return <ShoppingBag className={className} />;
    case 'shoppingbasket':
      return <ShoppingBasket className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'store':
      return <Store className={className} />;
    case 'tag':
      return <Tag className={className} />;
    case 'package':
    default:
      return <Package className={className} />;
  }
}

function CategoryVisual({
  imageUrl,
  icon,
  label,
  toneClass,
}: {
  imageUrl?: string;
  icon?: string;
  label: string;
  toneClass: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageUrl && !imageFailed) {
    return (
      <span className="relative mx-auto mb-2.5 block aspect-square w-full max-w-[160px] overflow-hidden rounded-2xl border border-sand/80 bg-cream-warm">
        <img
          src={imageUrl}
          alt={label}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-charcoal/15 to-transparent" />
      </span>
    );
  }

  return (
    <span className={`mx-auto mb-2.5 flex aspect-square w-full max-w-[160px] items-center justify-center rounded-2xl border border-sand/80 ${toneClass}`}>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/75 shadow-xs">
        <CategoryFallbackIcon icon={icon} />
      </span>
    </span>
  );
}

const categoryToneClasses = [
  'bg-sahar/15 text-sahar-dark',
  'bg-success/15 text-success',
  'bg-error/15 text-error',
  'bg-olive/15 text-olive-dark',
  'bg-clay/15 text-clay-dark',
  'bg-blue-50 text-blue-700',
];

export default function Home() {
  const { products, categories, settings, isLoading, error, refresh } = useMarketState();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const categoryLookups = useMemo(() => createCategoryLookups(categories), [categories]);
  const homeCategories = useMemo(() => getActiveCategories(categories).slice(0, 8), [categories]);
  const customerProducts = useMemo(
    () => products.filter((product) => isProductCategoryVisible(product, categoryLookups)),
    [categoryLookups, products],
  );

  const offers = useMemo(
    () => customerProducts.filter((product) => product.isOffer && product.available).slice(0, 6),
    [customerProducts],
  );
  const quickSearchTerms = useMemo(() => getQuickSearchTerms(customerProducts, 5), [customerProducts]);

  const mostOrdered = useMemo(() => {
    const featured = customerProducts.filter((product) => product.available && product.isFeatured);
    const source = featured.length > 0 ? featured : customerProducts.filter((product) => product.available);
    return source.slice(0, 8);
  }, [customerProducts]);

  const localProducts = useMemo(
    () => customerProducts.filter((product) => product.available && product.isLocalProduct).slice(0, 4),
    [customerProducts],
  );

  const searchResults = useMemo(
    () => (searchTerm.trim() ? searchProducts(customerProducts, searchTerm).slice(0, 4) : []),
    [customerProducts, searchTerm],
  );

  const handleWhatsAppOrder = () => {
    window.open(
      generateWhatsAppLink(searchTerm ? `عاوز أطلب: ${searchTerm}` : 'أهلًا سوق البلد، عاوز أطلب واتساب'),
      '_blank',
    );
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate('/products', { state: { category: categoryId } });
  };

  return (
    <div className="pb-28 lg:pb-12">
      <section className="brand-soft-surface px-4 py-6 sm:px-6 lg:px-8 lg:py-12">
        <div className={`mx-auto grid max-w-7xl gap-8 rounded-3xl border border-sand bg-white/90 p-4 shadow-card sm:p-6 lg:items-center lg:p-8 ${
          searchTerm.trim() ? 'lg:grid-cols-1' : 'lg:grid-cols-[0.95fr_1.05fr]'
        }`}>
          <div className="min-w-0 text-center lg:text-right">
            <span className="inline-flex rounded-full bg-clay/10 px-3 py-1 text-sm font-black text-clay-dark">
              وفر مشوارك
            </span>
            <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-black leading-tight text-charcoal lg:mx-0 lg:text-6xl">
              كل طلبات بيتك لحد بابك
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base font-semibold leading-8 text-charcoal-muted lg:mx-0 lg:text-xl">
              {settings.heroSubtitle || 'اطلب احتياجات البيت من سوق البلد ووفر وقتك ومشوارك.'}
            </p>

            {!settings.ordersOpen && (
              <div className="mt-4 rounded-2xl bg-error/10 p-3 text-center text-sm font-black text-error">
                استقبال الطلبات متوقف حاليًا، برجاء المحاولة لاحقًا
              </div>
            )}

            <div className="mt-4 overflow-hidden rounded-2xl border border-sand bg-cream-warm shadow-card lg:hidden">
              <img
                src="/images/brand/hero-banner.jpg"
                alt="سوق البلد - كل طلبات بيتك لحد بابك"
                className="aspect-[16/9] w-full object-contain object-center"
                fetchPriority="high"
              />
            </div>

            <form
              className="mt-6"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <label htmlFor="home-search" className="sr-only">
                بحث
              </label>
              <div className="relative">
                <Search className="absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 text-olive" />
                <input
                  id="home-search"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="بتدور على إيه؟ سكر، زيت، رز، طماطم..."
                  className="h-[60px] w-full rounded-2xl border-2 border-olive/25 bg-cream pr-12 pl-4 text-base font-semibold text-charcoal outline-none transition focus:border-olive focus:ring-4 focus:ring-olive/10 lg:h-16 lg:text-lg"
                />
              </div>
            </form>

            <div className="mt-3 flex justify-center gap-2 overflow-x-auto pb-1 no-scrollbar lg:justify-start">
              {quickSearchTerms.map((term) => (
                <button
                  key={term}
                  onClick={() => setSearchTerm(term)}
                  className="h-10 flex-shrink-0 rounded-full border border-sand bg-white px-4 text-sm font-bold text-charcoal transition hover:border-olive hover:text-olive-dark"
                >
                  {term}
                </button>
              ))}
            </div>

            {searchTerm.trim() && (
              <div className="mt-4 rounded-2xl border border-sand bg-cream p-3">
                {searchResults.length > 0 ? (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-extrabold text-charcoal">نتائج سريعة</p>
                      <button
                        onClick={() => navigate('/products', { state: { query: searchTerm } })}
                        className="text-xs font-extrabold text-olive-dark"
                      >
                        عرض المزيد
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {searchResults.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-base font-extrabold text-charcoal">مش لاقي المنتج؟ ابعتلنا طلبك واتساب</p>
                    <button
                      onClick={handleWhatsAppOrder}
                      className="mx-auto mt-3 flex h-12 items-center justify-center gap-2 rounded-xl bg-whatsapp px-5 text-sm font-extrabold text-white shadow-button"
                    >
                      <MessageCircle className="h-5 w-5" />
                      اطلب واتساب
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mx-auto mt-5 grid grid-cols-2 gap-3 sm:max-w-lg lg:mx-0">
              <button
                onClick={handleWhatsAppOrder}
                className="h-14 rounded-xl bg-clay text-base font-extrabold text-white shadow-button transition hover:bg-clay-dark"
              >
                اطلب واتساب
              </button>
              <button
                onClick={() => navigate('/products')}
                className="h-14 rounded-xl bg-olive text-base font-extrabold text-white shadow-button transition hover:bg-olive-dark"
              >
                تصفح المنتجات
              </button>
            </div>
          </div>

          <aside className={`hidden min-w-0 lg:block ${searchTerm.trim() ? 'lg:hidden' : ''}`}>
            <div className="brand-image-frame relative aspect-[16/9] overflow-hidden rounded-3xl border border-sand bg-cream-warm">
              <img
                src="/images/brand/hero-banner.jpg"
                alt="سوق البلد - كل طلبات بيتك لحد بابك"
                className="h-full w-full object-contain object-center"
                fetchPriority="high"
              />
              <div className="absolute right-4 top-4 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-xs font-black text-olive-dark shadow-card backdrop-blur">
                من قلب البلد لحد باب بيتك
              </div>
            </div>
          </aside>
        </div>
      </section>

      {error && <InlineError message={error} onRetry={() => void refresh()} />}

      <SectionShell
        title="الأقسام المهمة"
        subtitle="اختار اللي محتاجه بسرعة"
        actionLabel="عرض كل الأقسام"
        onAction={() => navigate('/products')}
      >
        {homeCategories.length === 0 ? (
          <EmptyState title="لم يتم إضافة أقسام بعد" description="أضف أول قسم من لوحة الأدمن ليظهر هنا." />
        ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {homeCategories.map((category, index) => {
            const comingSoon = category.comingSoon;
            const toneClass = categoryToneClasses[index % categoryToneClasses.length];
            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`group relative flex min-h-[246px] flex-col items-stretch rounded-2xl border p-2.5 text-center shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated ${
                  comingSoon ? 'border-clay/25 bg-clay/5 hover:border-clay/70' : 'border-sand bg-white hover:border-olive/60'
                }`}
              >
                {comingSoon && (
                  <span className="absolute left-3 top-3 z-10 rounded-full bg-clay px-2.5 py-1 text-[10px] font-black text-white shadow-card">
                    قريبًا
                  </span>
                )}
                <CategoryVisual imageUrl={category.imageUrl} icon={category.icon} label={category.name} toneClass={toneClass} />
                <span className="mt-auto flex min-h-[52px] items-center justify-center rounded-xl bg-cream/80 px-2 py-2 text-sm font-black leading-5 text-charcoal transition group-hover:bg-olive/10 group-hover:text-olive-dark">
                  <span className="line-clamp-2">{category.name}</span>
                </span>
              </button>
            );
          })}
        </div>
        )}
      </SectionShell>

      <SectionShell
        title="الأكثر طلبًا في البلد"
        subtitle="منتجات بتحتاجها كل بيت يوميًا"
        actionLabel="عرض المزيد"
        onAction={() => navigate('/products')}
      >
        {isLoading ? (
          <LoadingGrid items={8} />
        ) : mostOrdered.length === 0 ? (
          <EmptyState title="لا توجد منتجات" actionLabel="اطلب المنتج واتساب" onAction={handleWhatsAppOrder} />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {mostOrdered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </SectionShell>

      {offers.length > 0 && (
        <SectionShell
          title="عروض البلد النهارده"
          subtitle="أسعار أوفر على حاجات البيت"
          actionLabel="الحق العرض"
          onAction={() => navigate('/offers')}
          surface="warm"
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {offers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </SectionShell>
      )}

      {localProducts.length > 0 && (
        <SectionShell
          title="من خير بلدنا"
          subtitle="منتجات بلدي طازة وقريبة منك"
          actionLabel="شوف البلدي"
          onAction={() => navigate('/local-products')}
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {localProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </SectionShell>
      )}

      <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-olive/20 bg-olive p-5 text-white shadow-card sm:p-6 lg:flex lg:items-center lg:justify-between lg:gap-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-black">مش لاقي طلبك؟</h3>
              <p className="mt-1 text-sm font-semibold leading-7 text-white/85">
                اكتبلنا اللي محتاجه واحنا نجيبهولك من أقرب محل.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:mt-0 lg:w-[360px]">
            <button
              onClick={handleWhatsAppOrder}
              className="h-12 rounded-xl bg-clay text-sm font-black text-white shadow-button"
            >
              اطلب واتساب
            </button>
            <a
              href={`tel:${settings.phoneNumber}`}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-olive-dark"
            >
              <Phone className="h-4 w-4" />
              اطلب بالتليفون
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionShell({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
  surface = 'plain',
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
  surface?: 'plain' | 'warm';
}) {
  return (
    <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className={surface === 'warm' ? 'rounded-3xl border border-clay/20 bg-clay/5 p-4 sm:p-5' : ''}>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-charcoal lg:text-2xl">{title}</h2>
            <p className="mt-1 text-sm font-semibold text-charcoal-muted">{subtitle}</p>
          </div>
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="flex h-10 flex-shrink-0 items-center gap-1 rounded-full border border-sand bg-white px-3 text-sm font-black text-olive-dark shadow-card transition hover:border-olive"
            >
              {actionLabel}
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

