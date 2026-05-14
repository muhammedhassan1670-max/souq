import { products as seedProducts } from '@/data/products';
import { shops as seedShops } from '@/data/shops';
import { categories as seedCategories } from '@/data/categories';
import type { Product, Shop, Category } from '@/data/types';

export type MarketSettings = {
  siteName: string;
  whatsappNumber: string;
  phoneNumber: string;
  deliveryFee: number;
  freeDeliveryMinimum: number;
  ordersOpen: boolean;
  heroTitle: string;
  heroSubtitle: string;
  workingHours: string;
  deliveryAreas: string;
};

export type SavedOrder = {
  id: string;
  customer: string;
  phone: string;
  address: string;
  total: number;
  status: 'جديد' | 'تم استلام الطلب' | 'جاري التجهيز' | 'خرج للتوصيل' | 'تم التسليم' | 'ملغي';
  createdAt: string;
  itemsCount: number;
};

export type MarketState = {
  products: Product[];
  shops: Shop[];
  categories: Category[];
  orders: SavedOrder[];
  settings: MarketSettings;
};

const STORAGE_KEY = 'souq-elbalad-market-state-v2';

export const defaultSettings: MarketSettings = {
  siteName: 'سوق البلد',
  whatsappNumber: '201000000000',
  phoneNumber: '01000000000',
  deliveryFee: 10,
  freeDeliveryMinimum: 500,
  ordersOpen: true,
  heroTitle: 'كل طلبات بيتك لحد بابك',
  heroSubtitle: 'من سوق البلد لحد باب البيت. منتجات يومية، أسعار واضحة، وتوصيل سريع.',
  workingHours: 'يوميًا من 9 صباحًا حتى 11 مساءً',
  deliveryAreas: 'داخل القرية والمناطق القريبة',
};

export function getInitialMarketState(): MarketState {
  return {
    products: seedProducts,
    shops: seedShops,
    categories: seedCategories,
    orders: [],
    settings: defaultSettings,
  };
}

export function loadMarketState(): MarketState {
  if (typeof window === 'undefined') return getInitialMarketState();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = getInitialMarketState();
    saveMarketState(initial);
    return initial;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<MarketState>;
    return {
      products: Array.isArray(parsed.products) ? parsed.products : seedProducts,
      shops: Array.isArray(parsed.shops) ? parsed.shops : seedShops,
      categories: Array.isArray(parsed.categories) ? parsed.categories : seedCategories,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      settings: { ...defaultSettings, ...(parsed.settings || {}) },
    };
  } catch {
    const initial = getInitialMarketState();
    saveMarketState(initial);
    return initial;
  }
}

export function saveMarketState(state: MarketState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event('market-data-change'));
}

export function updateMarketState(mutator: (state: MarketState) => MarketState) {
  const next = mutator(loadMarketState());
  saveMarketState(next);
  return next;
}

export function resetMarketState() {
  const initial = getInitialMarketState();
  saveMarketState(initial);
  return initial;
}

export function nextProductId(products: Product[]) {
  return products.length ? Math.max(...products.map((p) => Number(p.id) || 0)) + 1 : 1;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
