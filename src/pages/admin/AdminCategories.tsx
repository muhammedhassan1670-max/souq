import { useEffect, useState } from 'react';
import { ImagePlus, Plus, RefreshCcw, Save, Trash2 } from 'lucide-react';
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

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);

  const refresh = async () => setCategories(await listCategories());

  useEffect(() => {
    void refresh();
  }, []);

  const save = async () => {
    if (!form.name.trim()) {
      setError('اسم القسم مطلوب');
      return;
    }
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
    <div className="grid gap-4 md:grid-cols-[360px_1fr]">
      <div className="rounded-2xl border border-sand bg-white p-4 shadow-card">
        <h2 className="mb-4 text-lg font-black">{form.id ? 'تعديل قسم' : 'قسم جديد'}</h2>
        {notice && <p className="mb-3 rounded-xl bg-success/10 p-2 text-sm font-bold text-success">{notice}</p>}
        {error && <p className="mb-3 rounded-xl bg-error/10 p-2 text-sm font-bold text-error">{error}</p>}
        <div className="space-y-3">
          <Field label="اسم القسم" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <Field label="Slug" value={form.slug} onChange={(value) => setForm({ ...form, slug: value })} />
          <Field label="Icon" value={form.icon} onChange={(value) => setForm({ ...form, icon: value })} />
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
          <button onClick={() => void save()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-olive text-sm font-black text-white">
            <Save className="h-4 w-4" />
            حفظ
          </button>
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
        ) : categories.map((category) => (
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
