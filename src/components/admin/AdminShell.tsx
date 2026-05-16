import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, LogOut, Package, Percent, Settings, ShoppingCart, Store, Tags, Warehouse } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { signOutAdmin } from '@/services/authService';

const navItems = [
  { to: '/admin', label: 'الرئيسية', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'الطلبات', icon: ShoppingCart },
  { to: '/admin/products', label: 'المنتجات', icon: Package },
  { to: '/admin/products?mode=price-update', label: 'تحديث الأسعار', icon: Percent },
  { to: '/admin/offers', label: 'العروض', icon: Percent },
  { to: '/admin/inventory', label: 'المخزون', icon: Warehouse },
  { to: '/admin/categories', label: 'الأقسام', icon: Tags },
  { to: '/admin/shops', label: 'المحلات', icon: Store },
  { to: '/admin/requests', label: 'الطلبات الخاصة', icon: ClipboardList },
  { to: '/admin/settings', label: 'الإعدادات', icon: Settings },
];

export default function AdminShell() {
  const navigate = useNavigate();

  const logout = async () => {
    await signOutAdmin();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-cream pb-8">
      <header className="sticky top-0 z-50 border-b border-olive-dark/20 bg-olive-dark text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <BrandLogo
            size="md"
            showTagline
            imageClassName="bg-cream"
            textClassName="text-white"
            taglineClassName="text-white/70"
          />
          <button
            onClick={logout}
            className="flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-bold transition hover:bg-white/15"
          >
            <LogOut className="h-4 w-4" />
            خروج
          </button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 no-scrollbar sm:px-6 lg:px-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex h-10 flex-shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-bold ${
                    isActive ? 'bg-white text-olive-dark' : 'text-white/75 hover:bg-white/10'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
