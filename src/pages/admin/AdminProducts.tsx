import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Edit3, Eye, EyeOff, ImagePlus, Plus, RefreshCcw, Save, Search, Trash2, X } from 'lucide-react';
import type { Category, Product, Shop } from '@/data/types';
import { createProduct, deleteProduct, listProducts, updateProduct, type ProductInput } from '@/services/productsService';
import { listCategories } from '@/services/categoriesService';
import { listShops } from '@/services/shopsService';
import { uploadMarketImage } from '@/services/uploadService';
import { isSupabaseConfigured } from '@/lib/supabase';

type ProductForm = {
  id?: string;
  name: string;
  description: string;
  categoryId: string;
  shopId: string;
  price: string;
  oldPrice: string;
  unit: string;
  imageUrl: string;
  available: boolean;
  stockQuantity: string;
  isOffer: boolean;
  isLocalProduct: boolean;
  isFeatured: boolean;
  keywords: string;
  tags: string;
  sortOrder: string;
};

const emptyForm: ProductForm = {
  name: '',
  description: '',
  categoryId: '',
  shopId: '',
  price: '',
  oldPrice: '',
  unit: 'قطعة',
  imageUrl: '',
  available: true,
  stockQuantity: '0',
  isOffer: false,
  isLocalProduct: false,
  isFeatured: false,
  keywords: '',
  tags: '',
  sortOrder: '0',
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      const [nextProducts, nextCategories, nextShops] = await Promise.all([
        listProducts(),
        listCategories(),
        listShops(),
      ]);
      setProducts(nextProducts);
      setCategories(nextCategories);
      setShops(nextShops);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) =>
      product.name.toLowerCase().includes(q) ||
      product.category.toLowerCase().includes(q) ||
      product.keywords.some((keyword) => keyword.toLowerCase().includes(q)),
    );
  }, [products, search]);

  const openNew = () => {
    setForm({ ...emptyForm, categoryId: categories[0]?.id || '' });
    setError('');
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setForm({
      id: typeof product.id === 'string' ? product.id : undefined,
      name: product.name,
      description: product.description || '',
      categoryId: product.categoryId || categories.find((category) => category.name === product.category)?.id || '',
      shopId: typeof product.shopId === 'string' ? product.shopId : '',
      price: String(product.price),
      oldPrice: product.oldPrice ? String(product.oldPrice) : '',
      unit: product.unit,
      imageUrl: product.imageUrl || product.image,
      available: product.available,
      stockQuantity: String(product.stockQuantity ?? 0),
      isOffer: product.isOffer,
      isLocalProduct: product.isLocalProduct,
      isFeatured: Boolean(product.isFeatured),
      keywords: product.keywords.join(', '),
      tags: product.tags.join(', '),
      sortOrder: String(product.sortOrder ?? 0),
    });
    setError('');
    setShowForm(true);
  };

  const validate = () => {
    const price = Number(form.price);
    if (!form.name.trim()) return 'اسم المنتج مطلوب';
    if (!form.categoryId) return 'القسم مطلوب';
    if (!form.price.trim()) return 'السعر مطلوب';
    if (Number.isNaN(price) || price < 0) return 'السعر لا يكون بالسالب';
    return '';
  };

  const save = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: ProductInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId,
      shopId: form.shopId || undefined,
      price: Number(form.price),
      oldPrice: form.oldPrice ? Number(form.oldPrice) : undefined,
      unit: form.unit || 'قطعة',
      imageUrl: form.imageUrl || undefined,
      available: form.available,
      stockQuantity: Number(form.stockQuantity || 0),
      isOffer: form.isOffer,
      isLocalProduct: form.isLocalProduct,
      isFeatured: form.isFeatured,
      keywords: splitList(form.keywords),
      tags: splitList(form.tags),
      sortOrder: Number(form.sortOrder || 0),
    };

    setSaving(true);
    try {
      if (form.id) {
        await updateProduct(form.id, payload);
        setNotice('تم تعديل المنتج وظهر للعميل');
      } else {
        await createProduct(payload);
        setNotice('تم إضافة المنتج وظهر للعميل');
      }
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حفظ المنتج');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product: Product) => {
    if (typeof product.id !== 'string') {
      setError('الحذف الحقيقي يحتاج منتج من قاعدة البيانات');
      return;
    }
    if (!confirm(`متأكد من حذف ${product.name}؟`)) return;
    try {
      await deleteProduct(product.id);
      setNotice('تم حذف المنتج');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حذف المنتج');
    }
  };

  const toggleAvailable = async (product: Product) => {
    if (typeof product.id !== 'string') return;
    await updateProduct(product.id, toInput(product, { available: !product.available }));
    await refresh();
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError('');
    const previewUrl = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, imageUrl: previewUrl }));
    try {
      const publicUrl = await uploadMarketImage(file, 'products');
      setForm((prev) => ({ ...prev, imageUrl: publicUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!isSupabaseConfigured && (
        <div className="rounded-xl bg-error/10 p-3 text-sm font-bold text-error">
          Supabase غير مفعّل. CRUD الحقيقي يحتاج متغيرات البيئة.
        </div>
      )}
      {notice && <div className="rounded-xl bg-success/10 p-3 text-sm font-bold text-success">{notice}</div>}
      {error && (
        <div className="rounded-xl bg-error/10 p-3 text-sm font-bold text-error">
          {error}
          <button onClick={() => void refresh()} className="mt-2 flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-xs font-black">
            <RefreshCcw className="h-4 w-4" />
            حاول تاني
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-olive" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث باسم المنتج أو القسم"
            className="h-12 w-full rounded-xl border border-sand bg-white pr-10 pl-3 text-sm font-bold outline-none focus:border-olive"
          />
        </div>
        <button onClick={openNew} className="flex h-12 items-center gap-2 rounded-xl bg-olive px-4 text-sm font-black text-white">
          <Plus className="h-5 w-5" />
          إضافة
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-2xl bg-sand/60" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-sand bg-white p-8 text-center shadow-card">
          <p className="text-lg font-black text-charcoal">لا توجد منتجات</p>
          <p className="mt-1 text-sm font-bold text-charcoal-muted">ابدأ بإضافة أول منتج من لوحة التحكم.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={openNew} className="flex h-11 items-center gap-2 rounded-xl bg-olive px-4 text-sm font-black text-white">
              <Plus className="h-4 w-4" />
              أضف منتج جديد
            </button>
            <button onClick={() => void refresh()} className="flex h-11 items-center gap-2 rounded-xl bg-cream-warm px-4 text-sm font-black text-charcoal">
              <RefreshCcw className="h-4 w-4" />
              تحديث
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredProducts.map((product) => (
            <div key={product.id} className="rounded-2xl border border-sand bg-white p-3 shadow-card">
              <div className="flex gap-3">
                <img src={product.image} alt={product.name} className="h-20 w-20 rounded-xl bg-cream-warm object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <h3 className="font-black text-charcoal line-clamp-1">{product.name}</h3>
                    {product.isOffer && <Badge text="عرض" />}
                    {product.isLocalProduct && <Badge text="بلدي" />}
                    {product.isFeatured && <Badge text="مميز" />}
                    {!product.available && <Badge text="غير متاح" danger />}
                  </div>
                  <p className="mt-1 text-sm font-bold text-olive-dark">{product.price} جنيه / {product.unit}</p>
                  <p className="text-xs text-charcoal-muted">{product.category || 'بدون قسم'} • كمية: {product.stockQuantity ?? 0}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => openEdit(product)} className="flex h-10 flex-1 items-center justify-center gap-1 rounded-xl bg-cream-warm text-sm font-bold">
                  <Edit3 className="h-4 w-4" />
                  تعديل
                </button>
                <button onClick={() => void toggleAvailable(product)} className="flex h-10 flex-1 items-center justify-center gap-1 rounded-xl bg-cream-warm text-sm font-bold">
                  {product.available ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {product.available ? 'إيقاف' : 'إتاحة'}
                </button>
                <button onClick={() => void remove(product)} className="flex h-10 w-12 items-center justify-center rounded-xl bg-error/10 text-error">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-end bg-charcoal/50 md:items-center md:justify-center">
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 md:max-w-2xl md:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-charcoal">{form.id ? 'تعديل منتج' : 'إضافة منتج'}</h2>
              <button onClick={() => setShowForm(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-cream-warm">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img src={form.imageUrl || '/images/products/rice.jpg'} className="h-24 w-24 rounded-2xl bg-cream-warm object-cover" />
                <label className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-olive text-sm font-black text-olive-dark">
                  <ImagePlus className="h-5 w-5" />
                  {uploading ? 'جاري رفع الصورة...' : 'رفع صورة'}
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => void handleUpload(event.target.files?.[0])} />
                </label>
              </div>

              <Field label="اسم المنتج" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
              <Textarea label="الوصف" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
              <div className="grid gap-3 md:grid-cols-2">
                <Select label="القسم" value={form.categoryId} onChange={(value) => setForm({ ...form, categoryId: value })}>
                  <option value="">اختار القسم</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </Select>
                <Select label="المحل" value={form.shopId} onChange={(value) => setForm({ ...form, shopId: value })}>
                  <option value="">بدون محل</option>
                  {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Field label="السعر" type="number" value={form.price} onChange={(value) => setForm({ ...form, price: value })} />
                <Field label="السعر القديم" type="number" value={form.oldPrice} onChange={(value) => setForm({ ...form, oldPrice: value })} />
                <Field label="الوحدة" value={form.unit} onChange={(value) => setForm({ ...form, unit: value })} />
                <Field label="الكمية" type="number" value={form.stockQuantity} onChange={(value) => setForm({ ...form, stockQuantity: value })} />
              </div>
              <Field label="كلمات البحث" value={form.keywords} onChange={(value) => setForm({ ...form, keywords: value })} placeholder="سكر، رز، زيت" />
              <Field label="Tags" value={form.tags} onChange={(value) => setForm({ ...form, tags: value })} placeholder="أساسي، عرض" />
              <Field label="ترتيب الظهور" type="number" value={form.sortOrder} onChange={(value) => setForm({ ...form, sortOrder: value })} />

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Toggle label="متاح" checked={form.available} onChange={(checked) => setForm({ ...form, available: checked })} />
                <Toggle label="عرض" checked={form.isOffer} onChange={(checked) => setForm({ ...form, isOffer: checked })} />
                <Toggle label="منتج بلدي" checked={form.isLocalProduct} onChange={(checked) => setForm({ ...form, isLocalProduct: checked })} />
                <Toggle label="منتج مميز" checked={form.isFeatured} onChange={(checked) => setForm({ ...form, isFeatured: checked })} />
              </div>

              <button
                onClick={() => void save()}
                disabled={saving || uploading}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-olive text-base font-black text-white disabled:opacity-60"
              >
                <Save className="h-5 w-5" />
                {saving ? 'جاري الحفظ...' : 'حفظ المنتج'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function splitList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function toInput(product: Product, overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: product.name,
    description: product.description,
    categoryId: product.categoryId || '',
    shopId: typeof product.shopId === 'string' ? product.shopId : undefined,
    price: product.price,
    oldPrice: product.oldPrice,
    unit: product.unit,
    imageUrl: product.imageUrl || product.image,
    available: product.available,
    stockQuantity: product.stockQuantity,
    isOffer: product.isOffer,
    isLocalProduct: product.isLocalProduct,
    isFeatured: product.isFeatured,
    keywords: product.keywords,
    tags: product.tags,
    sortOrder: product.sortOrder,
    ...overrides,
  };
}

function Badge({ text, danger = false }: { text: string; danger?: boolean }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${danger ? 'bg-error/10 text-error' : 'bg-clay/10 text-clay-dark'}`}>{text}</span>;
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-black text-charcoal">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-sand px-3 text-sm font-bold outline-none focus:border-olive" />
    </div>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-black text-charcoal">{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full resize-none rounded-xl border border-sand px-3 py-2 text-sm font-bold outline-none focus:border-olive" />
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-black text-charcoal">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-sand px-3 text-sm font-bold outline-none focus:border-olive">
        {children}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex h-12 items-center justify-center gap-2 rounded-xl bg-cream-warm text-sm font-black text-charcoal">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}
