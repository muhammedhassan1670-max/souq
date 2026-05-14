import { useEffect, useState } from 'react';
import { ImagePlus, RefreshCcw, Save } from 'lucide-react';
import { getSettings, saveSettings, type AppSettings } from '@/services/settingsService';
import { uploadMarketImage } from '@/services/uploadService';

export default function AdminSettings() {
  const [form, setForm] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    setLoading(true);
    setError('');
    getSettings()
      .then(setForm)
      .catch((err) => setError(err instanceof Error ? err.message : 'تعذر تحميل الإعدادات'))
      .finally(() => setLoading(false));
  };

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await saveSettings(form);
      setNotice('تم حفظ الإعدادات');
      window.dispatchEvent(new Event('market-data-change'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    update('logoUrl', URL.createObjectURL(file));
    try {
      const url = await uploadMarketImage(file, 'settings');
      update('logoUrl', url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="rounded-2xl border border-sand bg-white p-5 text-sm font-bold">
        {loading ? 'جاري تحميل الإعدادات...' : 'تعذر تحميل الإعدادات'}
        {!loading && (
          <button onClick={loadSettings} className="mt-3 flex h-10 items-center gap-2 rounded-xl bg-olive px-4 text-sm font-black text-white">
            <RefreshCcw className="h-4 w-4" />
            حاول تاني
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notice && <div className="rounded-xl bg-success/10 p-3 text-sm font-bold text-success">{notice}</div>}
      {error && (
        <div className="rounded-xl bg-error/10 p-3 text-sm font-bold text-error">
          {error}
          <button onClick={loadSettings} className="mt-2 flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-xs font-black">
            <RefreshCcw className="h-4 w-4" />
            حاول تاني
          </button>
        </div>
      )}
      <div className="rounded-2xl border border-sand bg-white p-4 shadow-card">
        <div className="mb-4 flex items-center gap-3">
          <img src={form.logoUrl || '/images/brand/logo-mark.png'} className="h-20 w-20 rounded-2xl bg-cream-warm object-contain" />
          <label className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-olive text-sm font-black text-olive-dark">
            <ImagePlus className="h-5 w-5" />
            {uploading ? 'جاري الرفع...' : 'رفع اللوجو'}
            <input type="file" accept="image/*" className="hidden" onChange={(event) => void uploadLogo(event.target.files?.[0])} />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="اسم الموقع" value={form.siteName} onChange={(value) => update('siteName', value)} />
          <Field label="رقم الواتساب" value={form.whatsappNumber} onChange={(value) => update('whatsappNumber', value)} />
          <Field label="رقم الاتصال" value={form.phoneNumber} onChange={(value) => update('phoneNumber', value)} />
          <Field label="رسوم التوصيل" type="number" value={String(form.deliveryFee)} onChange={(value) => update('deliveryFee', Number(value))} />
          <Field label="حد التوصيل المجاني" type="number" value={String(form.freeDeliveryMinimum)} onChange={(value) => update('freeDeliveryMinimum', Number(value))} />
          <Field label="مواعيد العمل" value={form.workingHours} onChange={(value) => update('workingHours', value)} />
          <Field label="مناطق التوصيل" value={form.deliveryAreas} onChange={(value) => update('deliveryAreas', value)} />
          <Field label="نص الإعلان العلوي" value={form.topAnnouncement || ''} onChange={(value) => update('topAnnouncement', value)} />
        </div>
        <div className="mt-4">
          <Field label="نص الـ Hero" value={form.heroSubtitle} onChange={(value) => update('heroSubtitle', value)} />
        </div>
        <label className="mt-4 flex h-12 items-center justify-between rounded-xl bg-cream-warm px-4 text-sm font-black text-charcoal">
          <span>استقبال الطلبات مفتوح</span>
          <input type="checkbox" checked={form.ordersOpen} onChange={(event) => update('ordersOpen', event.target.checked)} />
        </label>
        <button
          onClick={() => void save()}
          disabled={saving}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-olive text-base font-black text-white disabled:opacity-60"
        >
          <Save className="h-5 w-5" />
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-black text-charcoal">{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-sand px-3 text-sm font-bold outline-none focus:border-olive" />
    </div>
  );
}
