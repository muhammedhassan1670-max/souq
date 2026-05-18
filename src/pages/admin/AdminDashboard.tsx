import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  Edit3,
  ImageOff,
  MessageCircle,
  Package,
  Percent,
  RefreshCcw,
  ShoppingCart,
  Store,
  Zap,
} from 'lucide-react';
import type { Product } from '@/data/types';
import { listProducts } from '@/services/productsService';
import { listOrders, updateOrderStatus, type OrderRecord, type OrderStatus } from '@/services/ordersService';
import { listCustomRequests, listSellerRequests, type CustomRequestRecord, type SellerRequestRecord } from '@/services/requestsService';
import { generateOrderStatusUpdateMessage, generateWhatsAppLink } from '@/utils/whatsapp';

const orderStatuses: OrderStatus[] = ['جديد', 'تم استلام الطلب', 'جاري التجهيز', 'خرج للتوصيل', 'تم التسليم', 'ملغي'];
const checklistItems = [
  'مراجعة الطلبات الجديدة',
  'تحديث أسعار المنتجات الأساسية',
  'مراجعة المنتجات غير المتوفرة',
  'مراجعة عروض اليوم',
  'التأكد من رقم واتساب والإعدادات',
];

type DashboardMetrics = {
  newOrdersToday: number;
  salesToday: number;
  preparingOrders: number;
  unavailableProducts: number;
  lowStockProducts: number;
  staleProducts: number;
  newSellerRequests: number;
  newCustomRequests: number;
  missingImage: number;
  missingPrice: number;
  offerMissingOldPrice: number;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [customRequests, setCustomRequests] = useState<CustomRequestRecord[]>([]);
  const [sellerRequests, setSellerRequests] = useState<SellerRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [doneTasks, setDoneTasks] = useState<Set<string>>(() => loadChecklist());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextProducts, nextOrders, nextCustomRequests, nextSellerRequests] = await Promise.all([
        listProducts(),
        listOrders(),
        listCustomRequests().catch(() => []),
        listSellerRequests().catch(() => []),
      ]);
      setProducts(nextProducts);
      setOrders(nextOrders);
      setCustomRequests(nextCustomRequests);
      setSellerRequests(nextSellerRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل لوحة التشغيل');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const metrics = useMemo(() => {
    const todayOrders = orders.filter((order) => isToday(order.createdAt));
    const activeStatuses = new Set<OrderStatus>(['تم استلام الطلب', 'جاري التجهيز', 'خرج للتوصيل']);
    return {
      newOrdersToday: todayOrders.filter((order) => order.status === 'جديد').length,
      salesToday: todayOrders.reduce((sum, order) => sum + order.total, 0),
      preparingOrders: orders.filter((order) => activeStatuses.has(order.status)).length,
      unavailableProducts: products.filter((product) => !product.available).length,
      lowStockProducts: products.filter(isLowStock).length,
      staleProducts: products.filter((product) => isOlderThan(product.updatedAt || product.createdAt, 30)).length,
      newSellerRequests: sellerRequests.filter((request) => request.status === 'جديد').length,
      newCustomRequests: customRequests.filter((request) => request.status === 'جديد').length,
      missingImage: products.filter((product) => !hasRealImage(product)).length,
      missingPrice: products.filter(hasMissingPrice).length,
      offerMissingOldPrice: products.filter((product) => product.isOffer && !product.oldPrice).length,
    };
  }, [customRequests, orders, products, sellerRequests]);

  const latestOrders = orders.slice(0, 6);
  const attentionProducts = products
    .filter((product) => !hasRealImage(product) || !product.available || isLowStock(product) || (product.isOffer && !product.oldPrice))
    .slice(0, 8);

  const changeOrderStatus = async (order: OrderRecord, status: OrderStatus) => {
    if (order.status === status) return;
    const whatsappWindow = window.open('', '_blank');
    try {
      await updateOrderStatus(order.id, status);
      const updatedOrder = { ...order, status };
      setOrders((prev) => prev.map((item) => (item.id === order.id ? updatedOrder : item)));
      const link = generateWhatsAppLink(generateOrderStatusUpdateMessage(updatedOrder), order.customerPhone);
      if (whatsappWindow) {
        whatsappWindow.location.href = link;
      } else {
        window.open(link, '_blank');
      }
      setNotice('تم تحديث حالة الطلب');
    } catch (err) {
      whatsappWindow?.close();
      setError(err instanceof Error ? err.message : 'حصل خطأ، حاول تاني');
    }
  };

  const toggleTask = (task: string) => {
    setDoneTasks((prev) => {
      const next = new Set(prev);
      if (next.has(task)) next.delete(task);
      else next.add(task);
      saveChecklist(next);
      return next;
    });
  };

  if (loading) return <DashboardLoading />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-clay-dark">لوحة التشغيل اليومية</p>
          <h1 className="text-2xl font-black text-charcoal md:text-3xl">صباح الخير، راجع السوق في دقيقة</h1>
          <p className="mt-1 text-sm font-bold text-charcoal-muted">طلبات اليوم، المنتجات الناقصة، وتنبيهات التشغيل في مكان واحد.</p>
        </div>
        <button onClick={() => void refresh()} className="flex h-11 items-center gap-2 rounded-xl border border-sand bg-white px-4 text-sm font-black text-charcoal shadow-card">
          <RefreshCcw className="h-4 w-4" />
          تحديث
        </button>
      </div>

      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
      {notice && <Notice tone="success" onClose={() => setNotice('')}>{notice}</Notice>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        <MetricCard label="طلبات جديدة اليوم" value={metrics.newOrdersToday} icon={<ShoppingCart />} tone="blue" onClick={() => navigate('/admin/orders?status=جديد')} />
        <MetricCard label="مبيعات اليوم" value={`${metrics.salesToday} ج`} icon={<ClipboardList />} tone="green" />
        <MetricCard label="قيد التجهيز" value={metrics.preparingOrders} icon={<Edit3 />} tone="orange" onClick={() => navigate('/admin/orders')} />
        <MetricCard label="غير متوفر" value={metrics.unavailableProducts} icon={<AlertTriangle />} tone="red" onClick={() => navigate('/admin/products?filter=unavailable')} />
        <MetricCard label="كمية قليلة" value={metrics.lowStockProducts} icon={<Package />} tone="orange" onClick={() => navigate('/admin/inventory')} />
        <MetricCard label="تحتاج سعر" value={metrics.staleProducts} icon={<Percent />} tone="olive" onClick={() => navigate('/admin/products?filter=stale')} />
        <MetricCard label="طلبات بائعين" value={metrics.newSellerRequests} icon={<Store />} tone="blue" onClick={() => navigate('/admin/requests?tab=sellers')} />
        <MetricCard label="اطلب أي حاجة" value={metrics.newCustomRequests} icon={<MessageCircle />} tone="green" onClick={() => navigate('/admin/requests?tab=custom')} />
      </section>

      <section className="rounded-2xl border border-sand bg-white p-4 shadow-card">
        <h2 className="mb-3 text-lg font-black text-charcoal">اختصارات سريعة</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <ActionLink to="/admin/products?add=quick" icon={<Zap />}>إضافة منتج سريع</ActionLink>
          <ActionLink to="/admin/products?mode=price-update" icon={<Edit3 />}>وضع تحديث الأسعار</ActionLink>
          <ActionLink to="/admin/offers" icon={<Percent />}>إضافة عرض اليوم</ActionLink>
          <ActionLink to="/admin/orders?status=جديد" icon={<ShoppingCart />}>مراجعة الطلبات الجديدة</ActionLink>
          <ActionLink to="/admin/inventory" icon={<Package />}>تحديث حالة المنتجات</ActionLink>
          <ActionLink to="/admin/products?export=csv" icon={<Download />}>تصدير المنتجات CSV</ActionLink>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <AlertsPanel metrics={metrics} onNavigate={(url) => navigate(url)} />
        <DailyChecklist doneTasks={doneTasks} onToggle={toggleTask} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <LatestOrders orders={latestOrders} onChangeStatus={(order, status) => void changeOrderStatus(order, status)} />
        <ProductsNeedAttention products={attentionProducts} onOpen={(url) => navigate(url)} />
      </div>
    </div>
  );
}

function AlertsPanel({
  metrics,
  onNavigate,
}: {
  metrics: DashboardMetrics;
  onNavigate: (url: string) => void;
}) {
  const alerts = [
    { label: `يوجد ${metrics.missingImage} منتج بدون صورة`, count: metrics.missingImage, url: '/admin/products?filter=no-image' },
    { label: `يوجد ${metrics.missingPrice} منتج سعره صفر أو ناقص`, count: metrics.missingPrice, url: '/admin/products?filter=missing-price' },
    { label: `يوجد ${metrics.offerMissingOldPrice} عرض بدون سعر قديم`, count: metrics.offerMissingOldPrice, url: '/admin/products?filter=offer-missing-old-price' },
    { label: `يوجد ${metrics.staleProducts} منتج لم يتم تحديثه منذ 30 يوم`, count: metrics.staleProducts, url: '/admin/products?filter=stale' },
    { label: `يوجد ${metrics.newOrdersToday} طلب جديد لم يتم مراجعته`, count: metrics.newOrdersToday, url: '/admin/orders?status=جديد' },
    { label: `يوجد ${metrics.lowStockProducts} منتج كميته قليلة`, count: metrics.lowStockProducts, url: '/admin/inventory' },
  ];

  return (
    <section className="rounded-2xl border border-sand bg-white p-4 shadow-card">
      <h2 className="mb-3 text-lg font-black text-charcoal">تنبيهات مهمة</h2>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <button
            key={alert.url}
            onClick={() => onNavigate(alert.url)}
            className="flex w-full items-center justify-between gap-3 rounded-xl bg-cream p-3 text-right transition hover:bg-cream-warm"
          >
            <span className="text-sm font-black text-charcoal">{alert.label}</span>
            <span className={`rounded-full px-2 py-1 text-xs font-black ${alert.count > 0 ? 'bg-clay/10 text-clay-dark' : 'bg-success/10 text-success'}`}>
              {alert.count > 0 ? 'راجع' : 'تمام'}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function LatestOrders({
  orders,
  onChangeStatus,
}: {
  orders: OrderRecord[];
  onChangeStatus: (order: OrderRecord, status: OrderStatus) => void;
}) {
  return (
    <section className="rounded-2xl border border-sand bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-charcoal">آخر الطلبات</h2>
        <Link to="/admin/orders" className="text-sm font-black text-olive-dark">عرض الكل</Link>
      </div>
      {orders.length === 0 ? (
        <EmptyBox title="لا توجد طلبات" text="أول طلب واتساب محفوظ سيظهر هنا." />
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-sand bg-cream p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-charcoal">{order.orderNumber}</p>
                  <p className="text-xs font-bold text-charcoal-muted">{order.customerName} - {order.customerPhone}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-black ${statusClass(order.status)}`}>{order.status}</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <select
                  value={order.status}
                  onChange={(event) => onChangeStatus(order, event.target.value as OrderStatus)}
                  className="h-10 rounded-xl border border-sand bg-white px-3 text-xs font-black text-charcoal outline-none"
                >
                  {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <a
                  href={generateWhatsAppLink(generateOrderStatusUpdateMessage(order), order.customerPhone)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-whatsapp px-3 text-xs font-black text-white"
                >
                  <MessageCircle className="h-4 w-4" />
                  واتساب
                </a>
                <span className="flex h-10 items-center justify-center rounded-xl bg-white px-3 text-xs font-black text-olive-dark">{order.total} ج</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ProductsNeedAttention({ products, onOpen }: { products: Product[]; onOpen: (url: string) => void }) {
  return (
    <section className="rounded-2xl border border-sand bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-charcoal">منتجات تحتاج مراجعة</h2>
        <button onClick={() => onOpen('/admin/products?filter=missing-data')} className="text-sm font-black text-olive-dark">فتح الفلتر</button>
      </div>
      {products.length === 0 ? (
        <EmptyBox title="كل المنتجات جيدة" text="لا توجد عناصر مهمة تحتاج مراجعة الآن." />
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => onOpen(`/admin/products?filter=${product.isOffer && !product.oldPrice ? 'offer-missing-old-price' : !hasRealImage(product) ? 'no-image' : !product.available ? 'unavailable' : 'low-stock'}`)}
              className="flex w-full items-center gap-3 rounded-xl bg-cream p-2 text-right transition hover:bg-cream-warm"
            >
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white">
                {hasRealImage(product) ? (
                  <img src={product.imageUrl || product.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageOff className="h-5 w-5 text-error" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-black text-charcoal">{product.name}</p>
                <p className="text-xs font-bold text-charcoal-muted">{attentionText(product)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function DailyChecklist({ doneTasks, onToggle }: { doneTasks: Set<string>; onToggle: (task: string) => void }) {
  return (
    <section className="rounded-2xl border border-sand bg-white p-4 shadow-card">
      <h2 className="mb-3 text-lg font-black text-charcoal">مهام النهارده</h2>
      <div className="space-y-2">
        {checklistItems.map((task) => {
          const done = doneTasks.has(task);
          return (
            <button
              key={task}
              onClick={() => onToggle(task)}
              className={`flex w-full items-center gap-3 rounded-xl p-3 text-right transition ${done ? 'bg-success/10 text-success' : 'bg-cream text-charcoal hover:bg-cream-warm'}`}
            >
              <CheckCircle2 className="h-5 w-5" />
              <span className={`text-sm font-black ${done ? 'line-through' : ''}`}>{task}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MetricCard({ label, value, icon, tone, onClick }: { label: string; value: number | string; icon: ReactNode; tone: 'blue' | 'green' | 'orange' | 'red' | 'olive'; onClick?: () => void }) {
  const content = (
    <>
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${metricToneClass(tone)}`}>{icon}</div>
      <p className="text-2xl font-black text-charcoal">{value}</p>
      <p className="mt-1 text-xs font-black text-charcoal-muted">{label}</p>
    </>
  );
  const className = "rounded-2xl border border-sand bg-white p-3 text-right shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated";
  if (onClick) return <button onClick={onClick} className={className}>{content}</button>;
  return <div className={className}>{content}</div>;
}

function ActionLink({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link to={to} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-cream-warm px-3 text-sm font-black text-charcoal transition hover:bg-sand/70">
      <span className="text-olive [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {children}
    </Link>
  );
}

function EmptyBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-cream p-5 text-center">
      <p className="text-sm font-black text-charcoal">{title}</p>
      <p className="mt-1 text-xs font-bold text-charcoal-muted">{text}</p>
    </div>
  );
}

function Notice({ children, tone, onClose }: { children: ReactNode; tone: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl p-3 text-sm font-bold ${
      tone === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
    }`}>
      <span>{children}</span>
      <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70">×</button>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-2xl bg-sand/60" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-sand/60" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl bg-sand/60" />
        <div className="h-72 animate-pulse rounded-2xl bg-sand/60" />
      </div>
    </div>
  );
}

function metricToneClass(tone: 'blue' | 'green' | 'orange' | 'red' | 'olive') {
  if (tone === 'blue') return 'bg-blue-50 text-blue-700';
  if (tone === 'green') return 'bg-success/10 text-success';
  if (tone === 'orange') return 'bg-clay/10 text-clay-dark';
  if (tone === 'red') return 'bg-error/10 text-error';
  return 'bg-olive/10 text-olive-dark';
}

function statusClass(status: OrderStatus) {
  if (status === 'جديد') return 'bg-blue-50 text-blue-700';
  if (status === 'جاري التجهيز' || status === 'تم استلام الطلب' || status === 'خرج للتوصيل') return 'bg-clay/10 text-clay-dark';
  if (status === 'تم التسليم') return 'bg-success/10 text-success';
  return 'bg-error/10 text-error';
}

function hasRealImage(product: Product) {
  return Boolean(product.imageUrl && product.imageUrl.trim());
}

function hasMissingPrice(product: Product) {
  const price = Number(product.price);
  return Number.isNaN(price) || price <= 0;
}

function isLowStock(product: Product) {
  const stock = Number(product.stockQuantity ?? 0);
  return product.available && stock > 0 && stock <= 3;
}

function attentionText(product: Product) {
  if (!hasRealImage(product)) return 'بدون صورة';
  if (!product.available) return 'غير متوفر';
  if (isLowStock(product)) return `كمية قليلة: ${product.stockQuantity}`;
  if (product.isOffer && !product.oldPrice) return 'عرض بدون سعر قديم';
  return 'يحتاج مراجعة';
}

function isToday(value?: string) {
  if (!value) return false;
  return new Date(value).toDateString() === new Date().toDateString();
}

function isOlderThan(value: string | undefined, days: number) {
  if (!value) return true;
  return Date.now() - new Date(value).getTime() > days * 24 * 60 * 60 * 1000;
}

function checklistKey() {
  return `souq-admin-checklist-${new Date().toISOString().slice(0, 10)}`;
}

function loadChecklist() {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(checklistKey()) || '[]'));
  } catch {
    return new Set<string>();
  }
}

function saveChecklist(doneTasks: Set<string>) {
  localStorage.setItem(checklistKey(), JSON.stringify([...doneTasks]));
}
