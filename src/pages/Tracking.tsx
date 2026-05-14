import { useState } from 'react';
import { ArrowRight, Search, Package, Truck, Home, XCircle, Clock } from 'lucide-react';
import type { OrderStatus } from '@/data/types';

const mockOrders: OrderStatus[] = [
  {
    id: 'SB-2025-001',
    status: 'out_for_delivery',
    items: [
      { name: 'أرز 1 كيلو', quantity: 2, price: 28 },
      { name: 'سكر 1 كيلو', quantity: 1, price: 22 },
    ],
    total: 78,
    date: '2025-06-10',
    estimatedDelivery: '2025-06-10',
  },
  {
    id: 'SB-2025-002',
    status: 'delivered',
    items: [
      { name: 'فراخ بلدي 1 كيلو', quantity: 1, price: 65 },
      { name: 'طماطم 1 كيلو', quantity: 2, price: 12 },
    ],
    total: 89,
    date: '2025-06-08',
    estimatedDelivery: '2025-06-08',
  },
  {
    id: 'SB-2025-003',
    status: 'preparing',
    items: [
      { name: 'مسحوق غسيل 1 كيلو', quantity: 1, price: 35 },
    ],
    total: 35,
    date: '2025-06-10',
    estimatedDelivery: '2025-06-11',
  },
];

const statusSteps = [
  { key: 'received', label: 'تم استلام الطلب', icon: Package, color: 'text-success' },
  { key: 'preparing', label: 'جاري التجهيز', icon: Clock, color: 'text-sahar' },
  { key: 'out_for_delivery', label: 'خرج للتوصيل', icon: Truck, color: 'text-sahar' },
  { key: 'delivered', label: 'تم التسليم', icon: Home, color: 'text-success' },
  { key: 'cancelled', label: 'تم الإلغاء', icon: XCircle, color: 'text-error' },
] as const;

const statusLabels: Record<string, { text: string; color: string }> = {
  received: { text: 'تم الاستلام', color: 'bg-success/15 text-success' },
  preparing: { text: 'جاري التجهيز', color: 'bg-sahar/15 text-sahar-dark' },
  out_for_delivery: { text: 'خرج للتوصيل', color: 'bg-sahar/15 text-sahar-dark' },
  delivered: { text: 'تم التسليم', color: 'bg-success/15 text-success' },
  cancelled: { text: 'ملغي', color: 'bg-error/15 text-error' },
};

export default function Tracking() {
  const [searchId, setSearchId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderStatus | null>(null);

  const handleSearch = () => {
    const order = mockOrders.find(o => o.id.toLowerCase().includes(searchId.toLowerCase()));
    setSelectedOrder(order || null);
  };

  const getStepIndex = (status: string) => {
    const cancelledIdx = statusSteps.findIndex(s => s.key === 'cancelled');
    if (status === 'cancelled') return cancelledIdx;
    return statusSteps.findIndex(s => s.key === status);
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-14 z-40 bg-cream/95 backdrop-blur border-b border-sand">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => window.history.back()} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-cream-warm">
            <ArrowRight className="w-5 h-5 text-charcoal" />
          </button>
          <h1 className="text-lg font-bold text-charcoal">تتبع الطلب</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        {/* Search */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-muted" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="رقم الطلب (مثال: SB-2025-001)"
              className="w-full h-11 pr-10 pl-4 bg-white border border-sand rounded-xl text-sm focus:border-sahar focus:ring-2 focus:ring-sahar/15 outline-none transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            className="h-11 px-4 bg-sahar text-white font-semibold rounded-xl hover:bg-sahar-dark transition-colors"
          >
            بحث
          </button>
        </div>

        {/* Recent Orders */}
        {!selectedOrder && (
          <div>
            <h3 className="font-bold text-charcoal mb-3">طلباتك الأخيرة</h3>
            <div className="space-y-3">
              {mockOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="w-full bg-white border border-sand rounded-xl p-4 text-right hover:shadow-card transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-charcoal">{order.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabels[order.status].color}`}>
                      {statusLabels[order.status].text}
                    </span>
                  </div>
                  <p className="text-xs text-charcoal-muted">
                    {order.items.length} منتج - {order.total} جنيه
                  </p>
                  <p className="text-xs text-charcoal-muted mt-1">{order.date}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Order Details */}
        {selectedOrder && (
          <div>
            <button
              onClick={() => setSelectedOrder(null)}
              className="text-sm text-sahar font-semibold mb-4"
            >
              رجوع للطلبات
            </button>

            <div className="bg-white border border-sand rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-charcoal">{selectedOrder.id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabels[selectedOrder.status].color}`}>
                  {statusLabels[selectedOrder.status].text}
                </span>
              </div>
              <div className="space-y-2">
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-charcoal">{item.name} × {item.quantity}</span>
                    <span className="font-medium">{item.price * item.quantity} ج</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-sand mt-3 pt-3 flex justify-between">
                <span className="font-bold text-charcoal">الإجمالي</span>
                <span className="font-bold text-sahar-dark">{selectedOrder.total} جنيه</span>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white border border-sand rounded-xl p-4">
              <h3 className="font-bold text-charcoal mb-4">حالة الطلب</h3>
              <div className="relative">
                {statusSteps.filter(s => s.key !== 'cancelled').map((step, index) => {
                  const Icon = step.icon;
                  const currentStep = getStepIndex(selectedOrder.status);
                  const isCompleted = index <= currentStep && selectedOrder.status !== 'cancelled';
                  const isCurrent = index === currentStep && selectedOrder.status !== 'cancelled';

                  return (
                    <div key={step.key} className="flex items-start gap-3 mb-4 last:mb-0">
                      <div className="relative flex flex-col items-center">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-success text-white' : 'bg-sand text-charcoal-muted'
                        } ${isCurrent ? 'ring-4 ring-success/20' : ''}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {index < statusSteps.filter(s => s.key !== 'cancelled').length - 1 && (
                          <div className={`w-0.5 h-6 mt-1 ${isCompleted ? 'bg-success' : 'bg-sand'}`} />
                        )}
                      </div>
                      <div className="pt-1.5">
                        <p className={`text-sm font-semibold ${isCompleted ? 'text-charcoal' : 'text-charcoal-muted'}`}>
                          {step.label}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-charcoal-muted mt-0.5">
                            تاريخ التسليم المتوقع: {selectedOrder.estimatedDelivery}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* No results */}
        {selectedOrder === null && searchId && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-sand mx-auto mb-3" />
            <p className="text-charcoal font-semibold">مش لاقي طلب برقم ده</p>
            <p className="text-sm text-charcoal-muted">جرب رقم تاني أو شوف الطلبات الأخيرة</p>
          </div>
        )}
      </div>
    </div>
  );
}

