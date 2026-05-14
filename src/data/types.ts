export interface Product {
  id: string | number;
  name: string;
  description?: string;
  category: string;
  categoryId?: string;
  price: number;
  oldPrice?: number;
  unit: string;
  image: string;
  imageUrl?: string;
  available: boolean;
  active?: boolean;
  shopId?: string | number;
  stockQuantity?: number;
  tags: string[];
  keywords: string[];
  isOffer: boolean;
  isLocalProduct: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Shop {
  id: string | number;
  name: string;
  category: string;
  ownerName: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  rating: number;
  deliveryAvailable: boolean;
  isOpen: boolean;
  active?: boolean;
  productsCount: number;
  image: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderFormData {
  name: string;
  phone: string;
  village: string;
  street: string;
  addressDetails: string;
  deliveryNotes: string;
  preferredTime: string;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  icon: string;
  imageUrl?: string;
  color: string;
  active?: boolean;
  comingSoon?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionPackage {
  id: number;
  name: string;
  description: string;
  items: string[];
  frequency: string;
  price: number;
  image: string;
}

export interface OrderStatus {
  id: string;
  status: 'received' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  items: { name: string; quantity: number; price: number }[];
  total: number;
  date: string;
  estimatedDelivery: string;
}
