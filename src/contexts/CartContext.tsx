import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Product, CartItem } from '@/data/types';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: Product['id']) => void;
  increaseQuantity: (productId: Product['id']) => void;
  decreaseQuantity: (productId: Product['id']) => void;
  updateQuantity: (productId: Product['id'], quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  getDeliveryFee: () => number;
  getDiscount: () => number;
  getFinalTotal: () => number;
  getLoyaltyPoints: () => number;
  isInCart: (productId: Product['id']) => boolean;
  getCartItem: (productId: Product['id']) => CartItem | undefined;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'souq_elbalad_cart';

const loadCartFromStorage = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore parse errors
  }
  return [];
};

const saveCartToStorage = (items: CartItem[]) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(loadCartFromStorage);

  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    if (!product.available) return;
    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((productId: Product['id']) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const increaseQuantity = useCallback((productId: Product['id']) => {
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }, []);

  const decreaseQuantity = useCallback((productId: Product['id']) => {
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  }, []);

  const updateQuantity = useCallback((productId: Product['id'], quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.product.id !== productId));
    } else {
      setItems(prev =>
        prev.map(item =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getCartTotal = useCallback(() => {
    return items.reduce((total, item) => {
      const price = item.product.oldPrice && item.product.oldPrice > item.product.price
        ? item.product.price
        : item.product.price;
      return total + price * item.quantity;
    }, 0);
  }, [items]);

  const getCartCount = useCallback(() => {
    return items.reduce((count, item) => count + item.quantity, 0);
  }, [items]);

  const getDeliveryFee = useCallback(() => {
    const total = getCartTotal();
    let settings: { deliveryFee?: number; freeDeliveryMinimum?: number } = {};
    try {
      const rawSettings = localStorage.getItem('souq-elbalad-settings-cache');
      settings = rawSettings ? JSON.parse(rawSettings) : {};
    } catch {
      settings = {};
    }
    const freeDeliveryMinimum = settings.freeDeliveryMinimum ?? 500;
    const deliveryFee = settings.deliveryFee ?? 20;
    if (total >= freeDeliveryMinimum) return 0;
    return items.length > 0 ? deliveryFee : 0;
  }, [items, getCartTotal]);

  const getDiscount = useCallback(() => {
    // Calculate discount from old prices
    return items.reduce((discount, item) => {
      if (item.product.oldPrice && item.product.oldPrice > item.product.price) {
        return discount + (item.product.oldPrice - item.product.price) * item.quantity;
      }
      return discount;
    }, 0);
  }, [items]);

  const getFinalTotal = useCallback(() => {
    return getCartTotal() + getDeliveryFee();
  }, [getCartTotal, getDeliveryFee]);

  const getLoyaltyPoints = useCallback(() => {
    const total = getCartTotal();
    // Every 100 EGP = 1 point, first order bonus = 5 points
    const basePoints = Math.floor(total / 100);
    const firstOrderBonus = items.length > 0 ? 5 : 0;
    return basePoints + firstOrderBonus;
  }, [getCartTotal, items]);

  const isInCart = useCallback((productId: Product['id']) => {
    return items.some(item => item.product.id === productId);
  }, [items]);

  const getCartItem = useCallback((productId: Product['id']) => {
    return items.find(item => item.product.id === productId);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        getDeliveryFee,
        getDiscount,
        getFinalTotal,
        getLoyaltyPoints,
        isInCart,
        getCartItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
