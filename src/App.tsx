import { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import CartDrawer from '@/components/CartDrawer';
import AddToCartToast from '@/components/AddToCartToast';
import StickyCartSummary from '@/components/StickyCartSummary';
import WhatsAppFAB from '@/components/WhatsAppFAB';
import Footer from '@/components/Footer';
import { CartProvider } from '@/contexts/CartContext';
import Home from '@/pages/Home';
import Products from '@/pages/Products';
import Offers from '@/pages/Offers';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import OrderAnything from '@/pages/OrderAnything';
import Shops from '@/pages/Shops';
import LocalProducts from '@/pages/LocalProducts';
import Subscriptions from '@/pages/Subscriptions';
import StreetOrder from '@/pages/StreetOrder';
import Tracking from '@/pages/Tracking';
import LoyaltyPoints from '@/pages/LoyaltyPoints';
import JoinSeller from '@/pages/JoinSeller';
import Contact from '@/pages/Contact';
import ProtectedAdminRoute from '@/components/admin/ProtectedAdminRoute';
import AdminShell from '@/components/admin/AdminShell';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminProducts from '@/pages/admin/AdminProducts';
import AdminCategories from '@/pages/admin/AdminCategories';
import AdminShops from '@/pages/admin/AdminShops';
import AdminOrders from '@/pages/admin/AdminOrders';
import AdminSettings from '@/pages/admin/AdminSettings';
import { getSettings } from '@/services/settingsService';

function AppLayout() {
  const [cartOpen, setCartOpen] = useState(false);
  const location = useLocation();

  // Hide layout on admin page
  const isAdmin = location.pathname.startsWith('/admin');
  const showFooter = !isAdmin && location.pathname !== '/checkout';

  useEffect(() => {
    void getSettings().catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen w-full bg-cream relative">
      {!isAdmin && (
        <Header
          onCartClick={() => setCartOpen(true)}
        />
      )}

      <main className="w-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-anything" element={<OrderAnything />} />
          <Route path="/shops" element={<Shops />} />
          <Route path="/local-products" element={<LocalProducts />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/street-order" element={<StreetOrder />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/loyalty" element={<LoyaltyPoints />} />
          <Route path="/join-seller" element={<JoinSeller />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<ProtectedAdminRoute />}>
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="shops" element={<AdminShops />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>
        </Routes>
      </main>

      {showFooter && <Footer />}
      {!isAdmin && <BottomNav />}
      {!isAdmin && <StickyCartSummary />}
      {!isAdmin && <WhatsAppFAB />}
      {!isAdmin && <AddToCartToast />}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <CartProvider>
      <AppLayout />
    </CartProvider>
  );
}
