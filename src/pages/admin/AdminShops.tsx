import { useEffect, useState } from 'react';
import { ImagePlus, Plus, RefreshCcw, Save, Trash2 } from 'lucide-react';
import type { Shop } from '@/data/types';
import { createShop, deleteShop, listShops, updateShop } from '@/services/shopsService';
import { uploadMarketImage } from '@/services/uploadService';

type ShopForm = {
  id?: string;
  name: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  category: string;
  address: string;
  imageUrl: string;
  rating: string;
  isOpen: boolean;
  active: boolean;
  deliveryAvailable: boolean;
};

const emptyForm: ShopForm = {
  name: '',
  ownerName: '',
  phone: '',
  whatsapp: '',
  category: '',
  address: '',
  imageUrl: '',
  rating: '5',
  isOpen: true,
  active: true,
  deliveryAvailable: true,
};

export default function AdminShops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [form, setForm] = useState<ShopForm>(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);

  const refresh = async () => setShops(await listShops());

  useEffect(() => {
    void refresh();
  }, []);

  const save = async () => {
    if (!form.name.trim()) {
      setError('اسم المحل مطلوب');
      return;
    }
    try {
      const payload = {
        name: form.name,
        ownerName: form.ownerName,
        phone: form.phone,
        whatsapp: form.whatsapp,
        category: form.category,
        address: form.address,
        imageUrl: form.imageUrl,
        rating: Number(form.rating || 5),
        isOpen: form.isOpen,
        active: form.active,
        deliveryAvailable: form.deliveryAvailable,
      };
      if (form.id) await updateShop(form.id, payload);
      else await createShop(payload);
      setForm(emptyForm);
      setNotice('تم حفظ المحل');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حفظ المحل');
    }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setForm((prev) => ({ ...prev, imageUrl: URL.createObjectURL(file) }));
    try {
      const url = await uploadMarketImage(file, 'shops');
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-[380px_1fr]">
      <div className="rounded-2xl border border-sand bg-white p-4 shadow-card">
        <h2 className="mb-4 text-lg font-black">{form.id ? 'تعديل محل' : 'محل جديد'}</h2>
        {notice && <p className="mb-3 rounded-xl bg-success/10 p-2 text-sm font-bold text-success">{notice}</p>}
        {error && <p className="mb-3 rounded-xl bg-error/10 p-2 text-sm font-bold text-error">{error}</p>}
        <div className="space-y-3">
          <Field label="اسم المحل" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <Field label="اسم المالك" value={form.ownerName} onChange={(value) => setForm({ ...form, ownerName: value })} />
          <Field label="الموبايل" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
          <Field label="واتساب" value={form.whatsapp} onChange={(value) => setForm({ ...form, whatsapp: value })} />
          <Field label="القسم" value={form.category} onChange={(value) => setForm({ ...form, category: value })} />
          <Field label="العنوان" value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
          <Field label="التقييم" type="number" value={form.rating} onChange={(value) => setForm({ ...form, rating: value })} />
          <img src={form.imageUrl || '/images/shops/shop1.jpg'} className="h-28 w-full rounded-xl object-cover" />
          <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-olive text-sm font-black text-olive-dark">
            <ImagePlus className="h-4 w-4" />
            {uploading ? 'جاري الرفع...' : 'رفع صورة'}
            <input type="file" accept="image/*" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <Toggle label="مفتوح" checked={form.isOpen} onChange={(checked) => setForm({ ...form, isOpen: checked })} />
            <Toggle label="نشط" checked={form.active} onChange={(checked) => setForm({ ...form, active: checked })} />
            <Toggle label="توصيل" checked={form.deliveryAvailable} onChange={(checked) => setForm({ ...form, deliveryAvailable: checked })} />
          </div>
          <button onClick={() => void save()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-olive text-sm font-black text-white">
            <Save className="h-4 w-4" />
            حفظ
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {shops.length === 0 ? (
          <div className="rounded-2xl border border-sand bg-white p-8 text-center shadow-card">
            <p className="text-lg font-black text-charcoal">لا توجد محلات</p>
            <p className="mt-1 text-sm font-bold text-charcoal-muted">أضف أول محل من لوحة التحكم.</p>
            <button onClick={() => void refresh()} className="mx-auto mt-4 flex h-11 items-center gap-2 rounded-xl bg-cream-warm px-4 text-sm font-black">
              <RefreshCcw className="h-4 w-4" />
              تحديث
            </button>
          </div>
        ) : shops.map((shop) => (
          <div key={shop.id} className="rounded-2xl border border-sand bg-white p-4 shadow-card">
            <img src={shop.image} className="mb-3 h-28 w-full rounded-xl object-cover" loading="lazy" />
            <h3 className="font-black">{shop.name}</h3>
            <p className="text-xs font-bold text-charcoal-muted">{shop.ownerName} • {shop.category}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setForm({
                id: typeof shop.id === 'string' ? shop.id : undefined,
                name: shop.name,
                ownerName: shop.ownerName,
                phone: shop.phone,
                whatsapp: shop.whatsapp || '',
                category: shop.category,
                address: shop.address || '',
                imageUrl: shop.imageUrl || shop.image,
                rating: String(shop.rating),
                isOpen: shop.isOpen,
                active: shop.active ?? true,
                deliveryAvailable: shop.deliveryAvailable,
              })} className="h-10 flex-1 rounded-xl bg-cream-warm text-sm font-black">تعديل</button>
              <button onClick={() => { if (typeof shop.id === 'string' && confirm('حذف المحل؟')) void deleteShop(shop.id).then(refresh); }} className="flex h-10 w-11 items-center justify-center rounded-xl bg-error/10 text-error">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        <button onClick={() => setForm(emptyForm)} className="flex h-16 items-center justify-center gap-2 rounded-2xl border border-dashed border-olive text-sm font-black text-olive-dark">
          <Plus className="h-4 w-4" />
          محل جديد
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex h-11 items-center justify-center gap-2 rounded-xl bg-cream-warm text-xs font-black">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}
