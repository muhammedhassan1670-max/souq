import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Download, Percent, RefreshCcw, Search, X } from 'lucide-react';
import type { Product } from '@/data/types';
import { listProducts, updateProduct, type ProductInput } from '@/services/productsService';
import { recordProductPriceHistory } from '@/services/productPriceHistoryService';
import { getCairoDateKey } from '@/utils/dateTime';

type OfferDraft = {
  price: string;
  oldPrice: string;
};

export default function AdminOffers() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [drafts, setDrafts] = useState<Record<string, OfferDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const nextProducts = await listProducts();
      setProducts(nextProducts);
      setDrafts(Object.fromEntries(nextProducts.filter((product) => product.isOffer).map((product) => [
        String(product.id),
        { price: String(product.price), oldPrice: product.oldPrice ? String(product.oldPrice) : '' },
      ])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل العروض');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const offers = useMemo(() => products.filter((product) => product.isOffer), [products]);
  const candidates = useMemo(() => {
    const q = normalize(search);
    return products
      .filter((product) => !product.isOffer)
      .filter((product) => !q || normalize(product.name).includes(q) || normalize(product.category).includes(q))
      .slice(0, 40);
  }, [products, search]);

  const addOffer = async () => {
    const product = products.find((item) => String(item.id) === candidateId);
    if (!product || typeof product.id !== 'string') {
      setError('اختار منتج الأول');
      return;
    }
    await saveProduct(product, {
      isOffer: true,
      oldPrice: product.oldPrice || product.price,
    }, 'تم إضافة المنتج لعروض اليوم');
    setCandidateId('');
  };

  const saveOffer = async (product: Product) => {
    const draft = drafts[String(product.id)] || { price: String(product.price), oldPrice: product.oldPrice ? String(product.oldPrice) : '' };
    const price = Number(draft.price);
    const oldPrice = Number(draft.oldPrice);
    if (!draft.price.trim() || Number.isNaN(price) || price < 0) {
      setError('السعر الحالي غير صحيح');
      return;
    }
    if (!draft.oldPrice.trim() || Number.isNaN(oldPrice) || oldPrice <= price) {
      setError('السعر القديم لازم يكون أكبر من السعر الحالي في العرض');
      return;
    }
    await saveProduct(product, { price, oldPrice, isOffer: true }, 'تم تحديث العرض');
  };

  const removeOffer = async (product: Product) => {
    await saveProduct(product, { isOffer: false }, 'تم إزالة المنتج من العروض');
  };

  const endAllOffers = async () => {
    if (!offers.length || !confirm('إنهاء كل عروض اليوم؟')) return;
    setSavingId('all');
    try {
      await Promise.all(offers.map((product) => {
        if (typeof product.id !== 'string') throw new Error('بعض المنتجات ليست من قاعدة البيانات');
        return updateProduct(product.id, toInput(product, { isOffer: false }));
      }));
      setNotice(`تم إنهاء ${offers.length} عرض`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إنهاء العروض');
    } finally {
      setSavingId('');
    }
  };

  const exportOffers = () => {
    const headers = ['id', 'name', 'price', 'old_price', 'unit', 'available'];
    const rows = offers.map((product) => headers.map((header) => escapeCsv({
      id: product.id,
      name: product.name,
      price: product.price,
      old_price: product.oldPrice || '',
      unit: product.unit,
      available: product.available,
    }[header as 'id' | 'name' | 'price' | 'old_price' | 'unit' | 'available'])).join(','));
    const blob = new Blob(['\uFEFF' + headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `souq-offers-${getCairoDateKey()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveProduct = async (product: Product, changes: Partial<Product>, successMessage: string) => {
    if (typeof product.id !== 'string') {
      setError('التحديث الحقيقي يحتاج منتج من قاعدة البيانات');
      return;
    }
    setSavingId(String(product.id));
    setError('');
    try {
      await updateProduct(product.id, toInput(product, changes));
      if (changes.price !== undefined || changes.oldPrice !== undefined) {
        await recordProductPriceHistory({
          productId: product.id,
          oldPrice: product.price,
          newPrice: changes.price === undefined ? product.price : Number(changes.price),
          oldOldPrice: product.oldPrice,
          newOldPrice: changes.oldPrice === undefined ? product.oldPrice : Number(changes.oldPrice),
          changeSource: 'full_form',
        });
      }
      setNotice(successMessage);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حصل خطأ، حاول تاني');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="عروض اليوم" text="راجع عروض البلد النهارده بسرعة وعدّل السعر القديم والحالي من مكان واحد." onRefresh={() => void refresh()} />
      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
      {notice && <Notice tone="success" onClose={() => setNotice('')}>{notice}</Notice>}

      <section className="grid gap-3 lg:grid-cols-[1fr_260px]">
        <div className="rounded-2xl border border-sand bg-white p-4 shadow-card">
          <h2 className="mb-3 text-lg font-black text-charcoal">إضافة منتج للعرض</h2>
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-olive" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن منتج" className="h-11 w-full rounded-xl border border-sand pr-9 pl-3 text-sm font-bold outline-none focus:border-olive" />
            </div>
            <select value={candidateId} onChange={(event) => setCandidateId(event.target.value)} className="h-11 rounded-xl border border-sand px-3 text-sm font-bold outline-none">
              <option value="">اختار المنتج</option>
              {candidates.map((product) => <option key={product.id} value={String(product.id)}>{product.name} - {product.price} ج</option>)}
            </select>
            <button onClick={() => void addOffer()} disabled={!candidateId || Boolean(savingId)} className="h-11 rounded-xl bg-clay px-4 text-sm font-black text-white disabled:opacity-60">
              إضافة للعرض
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Summary label="عروض نشطة" value={offers.length} />
          <Summary label="عروض تحتاج مراجعة" value={offers.filter((product) => !product.oldPrice || product.oldPrice <= product.price).length} danger />
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <button onClick={() => void endAllOffers()} disabled={savingId === 'all' || offers.length === 0} className="flex h-11 items-center gap-2 rounded-xl bg-error/10 px-4 text-sm font-black text-error disabled:opacity-60">
          <X className="h-4 w-4" />
          إنهاء كل عروض اليوم
        </button>
        <button onClick={exportOffers} disabled={offers.length === 0} className="flex h-11 items-center gap-2 rounded-xl border border-sand bg-white px-4 text-sm font-black text-charcoal disabled:opacity-60">
          <Download className="h-4 w-4" />
          تصدير عروض اليوم
        </button>
      </section>

      {loading ? (
        <LoadingGrid />
      ) : offers.length === 0 ? (
        <EmptyState title="لا توجد عروض حاليًا" text="اختار منتج من الأعلى وأضفه لعروض اليوم." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {offers.map((product) => {
            const draft = drafts[String(product.id)] || { price: String(product.price), oldPrice: product.oldPrice ? String(product.oldPrice) : '' };
            const invalid = !draft.oldPrice || Number(draft.oldPrice) <= Number(draft.price);
            return (
              <article key={product.id} className="rounded-2xl border border-sand bg-white p-4 shadow-card">
                <div className="flex gap-3">
                  <img src={product.imageUrl || product.image} alt="" className="h-24 w-24 rounded-2xl bg-cream object-cover" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-lg font-black text-charcoal">{product.name}</h3>
                      <span className="rounded-full bg-clay px-3 py-1 text-xs font-black text-white">عرض</span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-charcoal-muted">{product.category || 'بدون قسم'} - {product.unit}</p>
                    {invalid && <p className="mt-2 rounded-xl bg-error/10 px-3 py-2 text-xs font-black text-error">العرض محتاج سعر قديم أكبر من السعر الحالي</p>}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label="السعر الحالي" value={draft.price} onChange={(value) => setDrafts((prev) => ({ ...prev, [String(product.id)]: { ...draft, price: value } }))} />
                  <Field label="السعر القديم" value={draft.oldPrice} onChange={(value) => setDrafts((prev) => ({ ...prev, [String(product.id)]: { ...draft, oldPrice: value } }))} />
                </div>
                <div className="mt-4 rounded-2xl bg-cream p-3">
                  <p className="mb-2 text-xs font-black text-charcoal-muted">Preview للعميل</p>
                  <div className="flex items-center justify-between rounded-xl bg-white p-3">
                    <div>
                      <p className="text-sm font-black text-charcoal">{product.name}</p>
                      <p className="text-xs font-bold text-charcoal-muted">{product.unit}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-charcoal-muted line-through">{draft.oldPrice || '-'} ج</p>
                      <p className="text-lg font-black text-clay-dark">{draft.price || '-'} ج</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button onClick={() => void saveOffer(product)} disabled={savingId === String(product.id)} className="h-11 rounded-xl bg-olive text-sm font-black text-white disabled:opacity-60">
                    {savingId === String(product.id) ? 'جاري الحفظ...' : 'حفظ العرض'}
                  </button>
                  <button onClick={() => void removeOffer(product)} disabled={savingId === String(product.id)} className="h-11 rounded-xl bg-cream-warm text-sm font-black text-charcoal disabled:opacity-60">
                    إزالة من العروض
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PageHeader({ title, text, onRefresh }: { title: string; text: string; onRefresh: () => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-black text-clay-dark"><Percent className="h-4 w-4" /> تشغيل يومي</p>
        <h1 className="text-2xl font-black text-charcoal">{title}</h1>
        <p className="mt-1 text-sm font-bold text-charcoal-muted">{text}</p>
      </div>
      <button onClick={onRefresh} className="flex h-11 items-center gap-2 rounded-xl border border-sand bg-white px-4 text-sm font-black text-charcoal">
        <RefreshCcw className="h-4 w-4" />
        تحديث
      </button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-black text-charcoal">{label}</label>
      <input type="number" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-sand px-3 text-sm font-black outline-none focus:border-olive" />
    </div>
  );
}

function Summary({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-2xl border border-sand bg-white p-4 shadow-card">
      <p className={`text-2xl font-black ${danger ? 'text-error' : 'text-olive-dark'}`}>{value}</p>
      <p className="text-sm font-bold text-charcoal-muted">{label}</p>
    </div>
  );
}

function Notice({ children, tone, onClose }: { children: ReactNode; tone: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl p-3 text-sm font-bold ${tone === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
      <span>{children}</span>
      <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70">×</button>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-80 animate-pulse rounded-2xl bg-sand/60" />)}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-white p-8 text-center shadow-card">
      <p className="text-lg font-black text-charcoal">{title}</p>
      <p className="mt-1 text-sm font-bold text-charcoal-muted">{text}</p>
    </div>
  );
}

function toInput(product: Product, overrides: Partial<ProductInput> | Partial<Product> = {}): ProductInput {
  return {
    name: String(overrides.name ?? product.name),
    description: String(overrides.description ?? product.description ?? ''),
    categoryId: String(overrides.categoryId ?? product.categoryId ?? ''),
    shopId: typeof (overrides.shopId ?? product.shopId) === 'string' ? String(overrides.shopId ?? product.shopId) : undefined,
    price: Number(overrides.price ?? product.price),
    oldPrice: overrides.oldPrice === undefined ? product.oldPrice : Number(overrides.oldPrice),
    unit: String(overrides.unit ?? product.unit ?? 'قطعة'),
    imageUrl: String(overrides.imageUrl ?? product.imageUrl ?? ''),
    available: Boolean(overrides.available ?? product.available),
    active: Boolean(overrides.active ?? product.active ?? true),
    stockQuantity: Number(overrides.stockQuantity ?? product.stockQuantity ?? 0),
    isOffer: Boolean(overrides.isOffer ?? product.isOffer),
    isLocalProduct: Boolean(overrides.isLocalProduct ?? product.isLocalProduct),
    isFeatured: Boolean(overrides.isFeatured ?? product.isFeatured),
    keywords: product.keywords,
    tags: product.tags,
    sortOrder: Number(overrides.sortOrder ?? product.sortOrder ?? 0),
  };
}

function normalize(value: string | undefined) {
  return String(value || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').trim();
}

function escapeCsv(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
