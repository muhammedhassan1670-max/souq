import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, Printer, RefreshCcw, Search } from 'lucide-react';
import { listOrders, updateOrderStatus, type OrderRecord, type OrderStatus } from '@/services/ordersService';
import { generateOrderStatusUpdateMessage, generateWhatsAppLink } from '@/utils/whatsapp';

const statuses: OrderStatus[] = ['جديد', 'تم استلام الطلب', 'جاري التجهيز', 'خرج للتوصيل', 'تم التسليم', 'ملغي'];

export default function AdminOrders() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const nextStatus = searchParams.get('status');
    if (nextStatus && statuses.includes(nextStatus as OrderStatus)) setStatus(nextStatus);
  }, [searchParams]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await listOrders({ search, status }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totalSales = useMemo(() => orders.reduce((sum, order) => sum + order.total, 0), [orders]);

  const changeStatus = async (order: OrderRecord, nextStatus: OrderStatus) => {
    if (order.status === nextStatus) return;
    const whatsappWindow = window.open('', '_blank');
    try {
      await updateOrderStatus(order.id, nextStatus);
      await refresh();
      const updatedOrder = { ...order, status: nextStatus };
      const link = generateWhatsAppLink(generateOrderStatusUpdateMessage(updatedOrder), order.customerPhone);
      if (whatsappWindow) {
        whatsappWindow.location.href = link;
      } else {
        window.open(link, '_blank');
      }
    } catch (err) {
      whatsappWindow?.close();
      setError(err instanceof Error ? err.message : 'تعذر تحديث حالة الطلب');
    }
  };

  const printOrder = (order: OrderRecord) => {
    const content = [
      `طلب ${order.orderNumber}`,
      `العميل: ${order.customerName}`,
      `الموبايل: ${order.customerPhone}`,
      `العنوان: ${order.address}`,
      '',
      ...order.items.map((item) => `${item.productName} × ${item.quantity} = ${item.totalPrice} جنيه`),
      '',
      `الإجمالي: ${order.total} جنيه`,
      `الحالة: ${order.status}`,
    ].join('\n');
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<pre dir="rtl" style="font-family: sans-serif; font-size: 18px; line-height: 1.8">${content}</pre>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-error/10 p-3 text-sm font-bold text-error">
          {error}
          <button onClick={() => void refresh()} className="mt-2 flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-xs font-black">
            <RefreshCcw className="h-4 w-4" />
            حاول تاني
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-sand bg-white p-4 shadow-card">
          <p className="text-2xl font-black text-charcoal">{orders.length}</p>
          <p className="text-sm font-bold text-charcoal-muted">طلبات</p>
        </div>
        <div className="rounded-2xl border border-sand bg-white p-4 shadow-card">
          <p className="text-2xl font-black text-olive-dark">{totalSales} ج</p>
          <p className="text-sm font-bold text-charcoal-muted">إجمالي الطلبات</p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_220px_120px]">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-olive" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث برقم الموبايل أو رقم الطلب"
            className="h-12 w-full rounded-xl border border-sand bg-white pr-10 pl-3 text-sm font-bold outline-none focus:border-olive"
          />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-12 rounded-xl border border-sand bg-white px-3 text-sm font-bold outline-none">
          <option value="">كل الحالات</option>
          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button onClick={() => void refresh()} className="h-12 rounded-xl bg-olive text-sm font-black text-white">بحث</button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-2xl bg-sand/60" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-sand bg-white p-8 text-center shadow-card">
          <p className="text-lg font-black text-charcoal">لا توجد طلبات</p>
          <p className="mt-1 text-sm font-bold text-charcoal-muted">جرّب تنفيذ طلب من صفحة العميل ثم ارجع هنا.</p>
          <button onClick={() => void refresh()} className="mx-auto mt-4 flex h-11 items-center gap-2 rounded-xl bg-olive px-4 text-sm font-black text-white">
            <RefreshCcw className="h-4 w-4" />
            تحديث الطلبات
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-sand bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-charcoal">{order.orderNumber}</h3>
                  <p className="text-sm font-bold text-charcoal">{order.customerName} • {order.customerPhone}</p>
                  <p className="text-xs font-semibold text-charcoal-muted">{order.address}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(order.status)}`}>{order.status}</span>
              </div>
              <div className="mt-3 rounded-xl bg-cream p-3">
                {order.items.length > 0 ? order.items.map((item) => (
                  <div key={item.id || item.productName} className="flex justify-between text-sm font-bold">
                    <span>{item.productName} × {item.quantity}</span>
                    <span>{item.totalPrice} ج</span>
                  </div>
                )) : <p className="text-sm text-charcoal-muted">لا توجد تفاصيل منتجات في هذا الطلب المحلي.</p>}
                <div className="mt-2 border-t border-sand pt-2 text-left text-lg font-black text-olive-dark">{order.total} جنيه</div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
                <select
                  value={order.status}
                  onChange={(event) => void changeStatus(order, event.target.value as OrderStatus)}
                  className="h-11 rounded-xl border border-sand px-3 text-sm font-bold"
                >
                  {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <a
                  href={generateWhatsAppLink(generateOrderStatusUpdateMessage(order), order.customerPhone)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 text-sm font-black text-white"
                >
                  <MessageCircle className="h-4 w-4" />
                  إرسال تحديث
                </a>
                <button onClick={() => printOrder(order)} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-charcoal px-4 text-sm font-black text-white">
                  <Printer className="h-4 w-4" />
                  طباعة
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function statusClass(status: OrderStatus) {
  if (status === 'جديد') return 'bg-blue-50 text-blue-700';
  if (status === 'تم استلام الطلب' || status === 'جاري التجهيز' || status === 'خرج للتوصيل') return 'bg-clay/10 text-clay-dark';
  if (status === 'تم التسليم') return 'bg-success/10 text-success';
  return 'bg-error/10 text-error';
}
