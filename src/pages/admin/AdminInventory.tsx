import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '@/data/types';
import { listProducts, updateProduct, type ProductInput } from '@/services/productsService';
import { Download, Package, RefreshCcw } from 'lucide-react';
import { getCairoDateKey } from '@/utils/dateTime';

type InventoryView = 'all' | 'unavailable' | 'low' | 'zero' | 'no-quantity';

export default function AdminInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [view, setView] = useState<InventoryView>('all');
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
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
      setQuantityDrafts(Object.fromEntries(nextProducts.map((product) => [String(product.id), String(product.stockQuantity ?? 0)])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل المخزون');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const stats = useMemo(() => ({
    unavailable: products.filter((product) => !product.available).length,
    low: products.filter(isLowStock).length,
    zero: products.filter((product) => Number(product.stockQuantity ?? 0) === 0).length,
    noQuantity: products.filter((product) => product.available && Number(product.stockQuantity ?? 0) === 0).length,
  }), [products]);

  const visibleProducts = useMemo(() => products.filter((product) => {
    if (view === 'unavailable') return !product.available;
    if (view === 'low') return isLowStock(product);
    if (view === 'zero') return Number(product.stockQuantity ?? 0) === 0;
    if (view === 'no-quantity') return product.available && Number(product.stockQuantity ?? 0) === 0;
    return !product.available || isLowStock(product) || Number(product.stockQuantity ?? 0) === 0;
  }), [products, view]);

  const updateInventory = async (product: Product, changes: Partial<Product>) => {
    if (typeof product.id !== 'string') {
      setError('التحديث الحقيقي يحتاج منتج من قاعدة البيانات');
      return;
    }
    setSavingId(String(product.id));
    setError('');
    try {
      await updateProduct(product.id, toInput(product, changes));
      setProducts((prev) => prev.map((item) => String(item.id) === String(product.id) ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item));
      setNotice('تم تحديث المخزون');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحديث المخزون');
    } finally {
      setSavingId('');
    }
  };

  const saveQuantity = async (product: Product) => {
    const value = Number(quantityDrafts[String(product.id)] || 0);
    if (Number.isNaN(value) || value < 0) {
      setError('الكمية لا تكون بالسالب');
      return;
    }
    await updateInventory(product, { stockQuantity: value, available: value > 0 ? true : product.available });
  };

  const exportMissing = () => {
    const headers = ['id', 'name', 'category', 'stock_quantity', 'available'];
    const rows = visibleProducts.map((product) => [
      product.id,
      product.name,
      product.category,
      product.stockQuantity ?? 0,
      product.available,
    ].map(escapeCsv).join(','));
    const blob = new Blob(['\uFEFF' + headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `souq-inventory-${getCairoDateKey()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-clay-dark"><Package className="h-4 w-4" /> المخزون والتوفر</p>
          <h1 className="text-2xl font-black text-charcoal">راجع المنتجات الناقصة بسرعة</h1>
          <p className="mt-1 text-sm font-bold text-charcoal-muted">غير الحالة أو الكمية بدون فتح نموذج المنتج الكامل.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportMissing} className="flex h-11 items-center gap-2 rounded-xl border border-sand bg-white px-4 text-sm font-black text-charcoal">
            <Download className="h-4 w-4" />
            تصدير المنتجات الناقصة
          </button>
          <button onClick={() => void refresh()} className="flex h-11 items-center gap-2 rounded-xl bg-olive px-4 text-sm font-black text-white">
            <RefreshCcw className="h-4 w-4" />
            تحديث
          </button>
        </div>
      </div>

      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
      {notice && <Notice tone="success" onClose={() => setNotice('')}>{notice}</Notice>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <FilterCard active={view === 'unavailable'} label="غير متوفر" value={stats.unavailable} onClick={() => setView('unavailable')} />
        <FilterCard active={view === 'low'} label="كمية قليلة" value={stats.low} onClick={() => setView('low')} />
        <FilterCard active={view === 'zero'} label="كمية صفر" value={stats.zero} onClick={() => setView('zero')} />
        <FilterCard active={view === 'no-quantity'} label="متاح بدون كمية" value={stats.noQuantity} onClick={() => setView('no-quantity')} />
      </section>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl bg-sand/60" />)}
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="rounded-2xl border border-sand bg-white p-8 text-center shadow-card">
          <p className="text-lg font-black text-charcoal">لا توجد منتجات تحتاج مراجعة</p>
          <p className="mt-1 text-sm font-bold text-charcoal-muted">المخزون ظاهر بشكل جيد حاليًا.</p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {visibleProducts.map((product) => {
            const productId = String(product.id);
            const stock = Number(product.stockQuantity ?? 0);
            return (
              <article key={productId} className="rounded-2xl border border-sand bg-white p-4 shadow-card">
                <div className="flex gap-3">
                  <img src={product.imageUrl || product.image} alt="" loading="lazy" className="h-20 w-20 rounded-2xl bg-cream object-cover" />
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-lg font-black text-charcoal">{product.name}</h3>
                    <p className="mt-1 text-sm font-bold text-charcoal-muted">{product.category || 'بدون قسم'} - {product.unit}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {!product.available && <Badge text="خلصان" danger />}
                      {isLowStock(product) && <Badge text="كمية قليلة" />}
                      {stock === 0 && <Badge text="كمية صفر" danger />}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                  <input
                    type="number"
                    value={quantityDrafts[productId] ?? '0'}
                    onChange={(event) => setQuantityDrafts((prev) => ({ ...prev, [productId]: event.target.value }))}
                    className="h-11 rounded-xl border border-sand px-3 text-sm font-black outline-none focus:border-olive"
                  />
                  <button onClick={() => void saveQuantity(product)} disabled={savingId === productId} className="h-11 rounded-xl bg-olive px-4 text-sm font-black text-white disabled:opacity-60">
                    حفظ الكمية
                  </button>
                  <button onClick={() => void updateInventory(product, { available: true })} disabled={savingId === productId} className="h-11 rounded-xl bg-success/10 px-4 text-sm font-black text-success disabled:opacity-60">
                    جعل متاح
                  </button>
                  <button onClick={() => void updateInventory(product, { available: false, stockQuantity: 0 })} disabled={savingId === productId} className="h-11 rounded-xl bg-error/10 px-4 text-sm font-black text-error disabled:opacity-60">
                    جعل خلصان
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

function FilterCard({ label, value, active, onClick }: { label: string; value: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-2xl border p-4 text-right shadow-card transition ${active ? 'border-olive bg-olive text-white' : 'border-sand bg-white text-charcoal hover:bg-cream'}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className={`text-sm font-bold ${active ? 'text-white/80' : 'text-charcoal-muted'}`}>{label}</p>
    </button>
  );
}

function Badge({ text, danger = false }: { text: string; danger?: boolean }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-black ${danger ? 'bg-error/10 text-error' : 'bg-clay/10 text-clay-dark'}`}>{text}</span>;
}

function Notice({ children, tone, onClose }: { children: ReactNode; tone: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl p-3 text-sm font-bold ${tone === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
      <span>{children}</span>
      <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70">×</button>
    </div>
  );
}

function isLowStock(product: Product) {
  const stock = Number(product.stockQuantity ?? 0);
  return product.available && stock > 0 && stock <= 3;
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

function escapeCsv(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
