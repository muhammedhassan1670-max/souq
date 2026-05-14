import { useCallback, useEffect, useState } from 'react';
import { getInitialMarketState, type MarketState, type SavedOrder } from '@/services/marketStore';
import { listProducts, subscribeToProducts } from '@/services/productsService';
import { listCategories, subscribeToCategories } from '@/services/categoriesService';
import { listShops, subscribeToShops } from '@/services/shopsService';
import { getSettings, subscribeToSettings } from '@/services/settingsService';
import { listOrders, subscribeToOrders } from '@/services/ordersService';

type MarketStateWithMeta = MarketState & {
  isLoading: boolean;
  error?: string;
  refresh: () => Promise<void>;
};

export function useMarketState() {
  const [marketState, setMarketState] = useState<MarketStateWithMeta>(() => ({
    ...getInitialMarketState(),
    isLoading: true,
    refresh: async () => undefined,
  }));

  const refresh = useCallback(async () => {
    try {
      const [products, shops, categories, settings, orders] = await Promise.all([
        listProducts(),
        listShops({ activeOnly: false }),
        listCategories({ activeOnly: false }),
        getSettings(),
        listOrders(),
      ]);

      setMarketState({
        products,
        shops,
        categories,
        settings,
        orders: orders.map<SavedOrder>((order) => ({
          id: order.orderNumber,
          customer: order.customerName,
          phone: order.customerPhone,
          address: order.address,
          total: order.total,
          status: order.status,
          createdAt: order.createdAt,
          itemsCount: order.items.length,
        })),
        isLoading: false,
        refresh,
      });
    } catch (error) {
      setMarketState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'تعذر تحميل البيانات',
        refresh,
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();

    const unsubs = [
      subscribeToProducts(refresh),
      subscribeToCategories(refresh),
      subscribeToShops(refresh),
      subscribeToSettings(refresh),
      subscribeToOrders(refresh),
    ];

    window.addEventListener('market-data-change', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
      window.removeEventListener('market-data-change', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  return marketState;
}
