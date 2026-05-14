import { Package, ShoppingCart, Store, Tag } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMarketState } from '@/hooks/useMarketState';

export default function AdminDashboard() {
  const { products, shops, orders, isLoading, error } = useMarketState();

  if (isLoading) return <AdminLoading />;

  return (
    <div className="space-y-4">
      {error && <div className="rounded-xl bg-error/10 p-3 text-sm font-bold text-error">{error}</div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat title="كل المنتجات" value={products.length} icon={<Package />} />
        <Stat title="العروض" value={products.filter((product) => product.isOffer).length} icon={<Tag />} />
        <Stat title="المحلات" value={shops.length} icon={<Store />} />
        <Stat title="الطلبات" value={orders.length} icon={<ShoppingCart />} />
      </div>
      <div className="rounded-2xl border border-sand bg-white p-4">
        <h2 className="text-lg font-black text-charcoal">تشغيل حقيقي</h2>
        <p className="mt-2 text-sm leading-6 text-charcoal-muted">
          المنتجات والطلبات والإعدادات الآن تقرأ من Supabase عند تفعيل متغيرات البيئة. أي تعديل من لوحة الأدمن ينعكس على صفحات العملاء عبر Realtime.
        </p>
      </div>
    </div>
  );
}

function Stat({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-sand bg-white p-4 shadow-card">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-olive/10 text-olive">
        {icon}
      </div>
      <p className="text-2xl font-black text-charcoal">{value}</p>
      <p className="text-sm font-bold text-charcoal-muted">{title}</p>
    </div>
  );
}

function AdminLoading() {
  return <div className="rounded-2xl border border-sand bg-white p-5 text-sm font-bold text-charcoal">جاري تحميل البيانات...</div>;
}
