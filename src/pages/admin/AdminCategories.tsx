import { useEffect, useState } from 'react';
import { Eye, EyeOff, ImagePlus, Plus, RefreshCcw, Save, Search, TimerReset, Trash2 } from 'lucide-react';
import type { Category } from '@/data/types';
import { createCategory, deleteCategory, listCategories, updateCategory } from '@/services/categoriesService';
import { uploadMarketImage } from '@/services/uploadService';

type CategoryForm = {
  id?: string;
  name: string;
  slug: string;
  icon: string;
  imageUrl: string;
  active: boolean;
  comingSoon: boolean;
  sortOrder: string;
};

const emptyForm: CategoryForm = {
  name: '',
  slug: '',
  icon: 'ShoppingBag',
  imageUrl: '',
  active: true,
  comingSoon: false,
  sortOrder: '0',
};

const iconOptions = [
  { label: 'سلة مشتريات', value: 'ShoppingBag' },
  { label: 'سلة منتجات', value: 'ShoppingBasket' },
  { label: 'خضار / ورقيات', value: 'Leaf' },
  { label: 'فاكهة', value: 'Apple' },
  { label: 'لحوم', value: 'Beef' },
  { label: 'أسماك', value: 'Fish' },
  { label: 'منظفات / لمعة', value: 'Sparkles' },
  { label: 'منزل', value: 'Home' },
  { label: 'أطفال', value: 'Baby' },
  { label: 'منتجات محلية', value: 'Heart' },
  { label: 'محل', value: 'Store' },
  { label: 'عروض', value: 'Tag' },
  { label: 'عام / صندوق', value: 'Package' },
];

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'soon' | 'hidden'>('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => setCategories(await listCategories());

  useEffect(() => {
    void refresh();
  }, []);

  const save = async () => {
    if (!form.name.trim()) {
      setError('اسم القسم مطلوب');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        icon: form.icon,
        imageUrl: form.imageUrl,
        active: form.active,
        comingSoon: form.comingSoon,
        sortOrder: Number(form.sortOrder || 0),
      };
      if (form.id) await updateCategory(form.id, payload);
      else await createCategory(payload);
      setForm(emptyForm);
      setNotice('تم حفظ القسم');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حفظ القسم');
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter((category) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || category.name.toLowerCase().includes(q) || (category.slug || '').toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'open' && category.active !== false && !category.comingSoon) ||
      (statusFilter === 'soon' && category.comingSoon) ||
      (statusFilter === 'hidden' && category.active === false);
    return matchesSearch && matchesStatus;
  });

  const stats = {
    all: categories.length,
    open: categories.filter((category) => category.active !== false && !category.comingSoon).length,
    soon: categories.filter((category) => category.comingSoon).length,
    hidden: categories.filter((category) => category.active === false).length,
  };

  const updateCategoryStatus = async (category: Category, changes: Partial<Pick<Category, 'active' | 'comingSoon'>>) => {
    setBusyId(category.id);
    setError('');
    try {
      await updateCategory(category.id, {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        imageUrl: category.imageUrl,
        active: changes.active ?? category.active ?? true,
        comingSoon: changes.comingSoon ?? category.comingSoon ?? false,
        sortOrder: category.sortOrder ?? 0,
      });
      setNotice('تم تحديث حالة القسم');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحديث القسم');
    } finally {
      setBusyId(null);
    }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setForm((prev) => ({ ...prev, imageUrl: URL.createObjectURL(file) }));
    try {
      const url = await uploadMarketImage(file, 'categories');
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="rounded-2xl border border-sand bg-white p-4 shadow-card">
        <h2 className="mb-4 text-lg font-black">{form.id ? 'تعديل قسم' : 'قسم جديد'}</h2>
        {notice && <p className="mb-3 rounded-xl bg-success/10 p-2 text-sm font-bold text-success">{notice}</p>}
        {error && <p className="mb-3 rounded-xl bg-error/10 p-2 text-sm font-bold text-error">{error}</p>}
        <div className="space-y-3">
          <Field label="اسم القسم" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <Field label="Slug" value={form.slug} onChange={(value) => setForm({ ...form, slug: value })} />
          <IconSelect value={form.icon} onChange={(value) => setForm({ ...form, icon: value })} />
          <Field label="ترتيب الظهور" type="number" value={form.sortOrder} onChange={(value) => setForm({ ...form, sortOrder: value })} />
          <img src={form.imageUrl || '/images/hero/hero-bg.jpg'} className="h-24 w-full rounded-xl object-cover" />
          <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-olive text-sm font-black text-olive-dark">
            <ImagePlus className="h-4 w-4" />
            {uploading ? 'جاري الرفع...' : 'رفع صورة'}
            <input type="file" accept="image/*" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
          </label>
          <label className="flex h-11 items-center justify-between rounded-xl bg-cream-warm px-3 text-sm font-black">
            ظاهر للعميل
            <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-clay/10 px-3 py-2 text-sm font-black text-clay-dark">
            <span>
              قفل القسم مؤقتًا
              <span className="mt-0.5 block text-xs font-bold text-charcoal-muted">العميل هيشوفه بكلمة قريبًا ومش هتظهر منتجاته</span>
            </span>
            <input type="checkbox" checked={form.comingSoon} onChange={(event) => setForm({ ...form, comingSoon: event.target.checked })} />
          </label>
          <button
            onClick={() => void save()}
            disabled={saving || uploading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-olive text-sm font-black text-white disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="كل الأقسام" value={stats.all} />
          <Stat label="مفتوح" value={stats.open} tone="success" />
          <Stat label="قريبًا" value={stats.soon} tone="warm" />
          <Stat label="مخفي" value={stats.hidden} tone="danger" />
        </div>

        <div className="rounded-2xl border border-sand bg-white p-3 shadow-card">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-olive" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم القسم أو slug"
              className="h-11 w-full rounded-xl border border-sand bg-cream pr-9 pl-3 text-sm font-bold outline-none focus:border-olive"
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { value: 'all', label: 'الكل' },
              { value: 'open', label: 'مفتوح' },
              { value: 'soon', label: 'قريبًا' },
              { value: 'hidden', label: 'مخفي' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setStatusFilter(item.value as typeof statusFilter)}
                className={`h-9 flex-shrink-0 rounded-full px-3 text-xs font-black ${
                  statusFilter === item.value ? 'bg-olive text-white' : 'border border-sand bg-white text-charcoal'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-sand bg-white p-8 text-center shadow-card">
            <p className="text-lg font-black text-charcoal">لا توجد أقسام</p>
            <p className="mt-1 text-sm font-bold text-charcoal-muted">أضف أول قسم عشان تقدر تضيف منتجات.</p>
            <button onClick={() => void refresh()} className="mx-auto mt-4 flex h-11 items-center gap-2 rounded-xl bg-cream-warm px-4 text-sm font-black">
              <RefreshCcw className="h-4 w-4" />
              تحديث
            </button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="rounded-2xl border border-sand bg-white p-8 text-center shadow-card">
            <p className="text-lg font-black text-charcoal">لا توجد نتائج</p>
            <p className="mt-1 text-sm font-bold text-charcoal-muted">غيّر البحث أو فلتر الحالة.</p>
          </div>
        ) : filteredCategories.map((category) => (
          <div key={category.id} className="rounded-2xl border border-sand bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-black">{category.name}</h3>
              <span className={`rounded-full px-2 py-1 text-xs font-black ${
                category.comingSoon ? 'bg-clay/10 text-clay-dark' : category.active === false ? 'bg-error/10 text-error' : 'bg-success/10 text-success'
              }`}>
                {category.comingSoon ? 'قريبًا' : category.active === false ? 'مخفي' : 'مفتوح'}
              </span>
            </div>
            <p className="text-xs font-bold text-charcoal-muted">{category.slug || 'بدون slug'} • ترتيب {category.sortOrder ?? 0}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => void updateCategoryStatus(category, { active: category.active === false })}
                disabled={busyId === category.id}
                className="flex h-10 items-center justify-center gap-1 rounded-xl bg-cream-warm text-xs font-black text-charcoal disabled:opacity-60"
              >
                {category.active === false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {category.active === false ? 'إظهار' : 'إخفاء'}
              </button>
              <button
                onClick={() => void updateCategoryStatus(category, { comingSoon: !category.comingSoon, active: true })}
                disabled={busyId === category.id}
                className="flex h-10 items-center justify-center gap-1 rounded-xl bg-clay/10 text-xs font-black text-clay-dark disabled:opacity-60"
              >
                <TimerReset className="h-4 w-4" />
                {category.comingSoon ? 'فتح القسم' : 'قريبًا'}
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setForm({ id: category.id, name: category.name, slug: category.slug || '', icon: category.icon, imageUrl: category.imageUrl || '', active: category.active ?? true, comingSoon: category.comingSoon ?? false, sortOrder: String(category.sortOrder ?? 0) })} className="h-10 flex-1 rounded-xl bg-cream-warm text-sm font-black">تعديل</button>
              <button onClick={() => { if (confirm('حذف القسم؟')) void deleteCategory(category.id).then(refresh); }} className="flex h-10 w-11 items-center justify-center rounded-xl bg-error/10 text-error">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        <button onClick={() => setForm(emptyForm)} className="flex h-16 items-center justify-center gap-2 rounded-2xl border border-dashed border-olive text-sm font-black text-olive-dark">
          <Plus className="h-4 w-4" />
          قسم جديد
        </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'plain' }: { label: string; value: number; tone?: 'plain' | 'success' | 'warm' | 'danger' }) {
  const toneClass =
    tone === 'success' ? 'bg-success/10 text-success' :
    tone === 'warm' ? 'bg-clay/10 text-clay-dark' :
    tone === 'danger' ? 'bg-error/10 text-error' :
    'bg-cream-warm text-charcoal';

  return (
    <div className="rounded-2xl border border-sand bg-white p-3 shadow-card">
      <p className={`w-fit rounded-full px-2 py-1 text-xs font-black ${toneClass}`}>{label}</p>
      <p className="mt-2 text-2xl font-black text-charcoal">{value}</p>
    </div>
  );
}

function IconSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const hasCustomIcon = value && !iconOptions.some((option) => option.value === value);

  return (
    <div>
      <label className="mb-1 block text-xs font-black">الأيقونة</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-sand bg-white px-3 text-sm font-bold outline-none focus:border-olive"
      >
        {hasCustomIcon && <option value={value}>أيقونة محفوظة: {value}</option>}
        {iconOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-black">{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-sand px-3 text-sm font-bold outline-none focus:border-olive" />
    </div>
  );
}
