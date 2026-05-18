import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, RefreshCcw } from 'lucide-react';
import {
  listCustomRequests,
  listSellerRequests,
  updateCustomRequestStatus,
  updateSellerRequestStatus,
  type CustomRequestRecord,
  type RequestStatus,
  type SellerRequestRecord,
} from '@/services/requestsService';
import { generateWhatsAppLink } from '@/utils/whatsapp';

type RequestTab = 'custom' | 'sellers';

const statuses: RequestStatus[] = ['جديد', 'قيد المراجعة', 'تم التواصل', 'تم التنفيذ', 'ملغي'];

export default function AdminRequests() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<RequestTab>((searchParams.get('tab') as RequestTab) || 'custom');
  const [customRequests, setCustomRequests] = useState<CustomRequestRecord[]>([]);
  const [sellerRequests, setSellerRequests] = useState<SellerRequestRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (nextTab === 'custom' || nextTab === 'sellers') setTab(nextTab);
  }, [searchParams]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextCustomRequests, nextSellerRequests] = await Promise.all([
        listCustomRequests(),
        listSellerRequests(),
      ]);
      setCustomRequests(nextCustomRequests);
      setSellerRequests(nextSellerRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل الطلبات الخاصة');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visibleCustomRequests = useMemo(
    () => customRequests.filter((request) => !statusFilter || request.status === statusFilter),
    [customRequests, statusFilter],
  );
  const visibleSellerRequests = useMemo(
    () => sellerRequests.filter((request) => !statusFilter || request.status === statusFilter),
    [sellerRequests, statusFilter],
  );

  const changeCustomStatus = async (request: CustomRequestRecord, status: RequestStatus) => {
    setSavingId(request.id);
    try {
      await updateCustomRequestStatus(request.id, status);
      setCustomRequests((prev) => prev.map((item) => item.id === request.id ? { ...item, status } : item));
      setNotice('تم تحديث حالة الطلب');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حصل خطأ، حاول تاني');
    } finally {
      setSavingId('');
    }
  };

  const changeSellerStatus = async (request: SellerRequestRecord, status: RequestStatus) => {
    setSavingId(request.id);
    try {
      await updateSellerRequestStatus(request.id, status);
      setSellerRequests((prev) => prev.map((item) => item.id === request.id ? { ...item, status } : item));
      setNotice('تم تحديث حالة الطلب');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حصل خطأ، حاول تاني');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-clay-dark">مركز الطلبات</p>
          <h1 className="text-2xl font-black text-charcoal">طلبات العملاء والبائعين</h1>
          <p className="mt-1 text-sm font-bold text-charcoal-muted">تابع طلبات “اطلب أي حاجة” وطلبات انضمام المحلات من مكان واحد.</p>
        </div>
        <button onClick={() => void refresh()} className="flex h-11 items-center gap-2 rounded-xl bg-olive px-4 text-sm font-black text-white">
          <RefreshCcw className="h-4 w-4" />
          تحديث
        </button>
      </div>

      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
      {notice && <Notice tone="success" onClose={() => setNotice('')}>{notice}</Notice>}

      <section className="rounded-2xl border border-sand bg-white p-3 shadow-card">
        <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
          <div className="grid grid-cols-2 gap-2">
            <TabButton active={tab === 'custom'} onClick={() => setTab('custom')}>اطلب أي حاجة ({customRequests.length})</TabButton>
            <TabButton active={tab === 'sellers'} onClick={() => setTab('sellers')}>طلبات البائعين ({sellerRequests.length})</TabButton>
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-xl border border-sand bg-cream px-3 text-sm font-black outline-none">
            <option value="">كل الحالات</option>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-48 animate-pulse rounded-2xl bg-sand/60" />)}
        </div>
      ) : tab === 'custom' ? (
        <CustomRequestsList requests={visibleCustomRequests} savingId={savingId} onStatusChange={(request, status) => void changeCustomStatus(request, status)} />
      ) : (
        <SellerRequestsList requests={visibleSellerRequests} savingId={savingId} onStatusChange={(request, status) => void changeSellerStatus(request, status)} />
      )}
    </div>
  );
}

function CustomRequestsList({ requests, savingId, onStatusChange }: { requests: CustomRequestRecord[]; savingId: string; onStatusChange: (request: CustomRequestRecord, status: RequestStatus) => void }) {
  if (requests.length === 0) return <EmptyState title="لا توجد طلبات خاصة" text="طلبات “اطلب أي حاجة” ستظهر هنا." />;
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          title={request.customerName}
          phone={request.phone}
          address={request.address}
          body={request.requestText}
          status={request.status}
          saving={savingId === request.id}
          onStatusChange={(status) => onStatusChange(request, status)}
        />
      ))}
    </div>
  );
}

function SellerRequestsList({ requests, savingId, onStatusChange }: { requests: SellerRequestRecord[]; savingId: string; onStatusChange: (request: SellerRequestRecord, status: RequestStatus) => void }) {
  if (requests.length === 0) return <EmptyState title="لا توجد طلبات بائعين" text="طلبات انضمام المحلات ستظهر هنا." />;
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          title={request.shopName}
          phone={request.phone}
          address={request.address}
          body={`${request.ownerName} - ${request.category}${request.notes ? ` - ${request.notes}` : ''}`}
          status={request.status}
          saving={savingId === request.id}
          onStatusChange={(status) => onStatusChange(request, status)}
        />
      ))}
    </div>
  );
}

function RequestCard({
  title,
  phone,
  address,
  body,
  status,
  saving,
  onStatusChange,
}: {
  title: string;
  phone: string;
  address: string;
  body: string;
  status: RequestStatus;
  saving: boolean;
  onStatusChange: (status: RequestStatus) => void;
}) {
  return (
    <article className="rounded-2xl border border-sand bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-charcoal">{title}</h2>
          <p className="mt-1 text-sm font-bold text-charcoal-muted">{phone || 'لا يوجد رقم'} - {address || 'لا يوجد عنوان'}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-black ${statusClass(status)}`}>{status}</span>
      </div>
      <p className="mt-3 rounded-2xl bg-cream p-3 text-sm font-bold leading-6 text-charcoal">{body || 'لا توجد تفاصيل'}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <select value={status} disabled={saving} onChange={(event) => onStatusChange(event.target.value as RequestStatus)} className="h-11 rounded-xl border border-sand px-3 text-sm font-black outline-none disabled:opacity-60">
          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <a
          href={generateWhatsAppLink(`أهلاً، بنتواصل معاك بخصوص طلبك في سوق البلد: ${body}`, phone || undefined)}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 text-sm font-black text-white"
        >
          <MessageCircle className="h-4 w-4" />
          واتساب
        </a>
      </div>
    </article>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`h-11 rounded-xl text-sm font-black ${active ? 'bg-olive text-white' : 'bg-cream text-charcoal hover:bg-cream-warm'}`}>
      {children}
    </button>
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

function Notice({ children, tone, onClose }: { children: ReactNode; tone: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl p-3 text-sm font-bold ${tone === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
      <span>{children}</span>
      <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70">×</button>
    </div>
  );
}

function statusClass(status: RequestStatus) {
  if (status === 'جديد') return 'bg-blue-50 text-blue-700';
  if (status === 'قيد المراجعة' || status === 'تم التواصل') return 'bg-clay/10 text-clay-dark';
  if (status === 'تم التنفيذ') return 'bg-success/10 text-success';
  return 'bg-error/10 text-error';
}
