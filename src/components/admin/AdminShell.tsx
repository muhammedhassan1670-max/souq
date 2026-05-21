import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, LogOut, Package, Percent, Settings, ShoppingCart, Store, Tags, Warehouse } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { signOutAdmin } from '@/services/authService';

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  match?: 'price-update' | 'products';
};

const navGroups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'التشغيل اليومي',
    items: [
      { to: '/admin', label: 'الرئيسية', icon: LayoutDashboard, end: true },
      { to: '/admin/orders', label: 'الطلبات', icon: ShoppingCart },
      { to: '/admin/products?mode=price-update', label: 'تحديث الأسعار', icon: Percent, match: 'price-update' },
      { to: '/admin/offers', label: 'العروض', icon: Percent },
      { to: '/admin/inventory', label: 'المخزون', icon: Warehouse },
    ],
  },
  {
    title: 'إدارة السوق',
    items: [
      { to: '/admin/products', label: 'المنتجات', icon: Package, match: 'products' },
      { to: '/admin/categories', label: 'الأقسام', icon: Tags },
      { to: '/admin/shops', label: 'المحلات', icon: Store },
    ],
  },
  {
    title: 'الخدمات والنظام',
    items: [
      { to: '/admin/requests', label: 'الطلبات الخاصة', icon: ClipboardList },
      { to: '/admin/settings', label: 'الإعدادات', icon: Settings },
    ],
  },
];

const flatNavItems = navGroups.flatMap((group) => group.items);

export default function AdminShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = async () => {
    await signOutAdmin();
    navigate('/admin/login', { replace: true });
  };

  const activeItem = flatNavItems.find((item) => isNavActive(item, location.pathname, location.search)) || flatNavItems[0];

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden h-screen border-l border-sand bg-olive-dark text-white lg:sticky lg:top-0 lg:flex lg:flex-col">
        <div className="border-b border-white/10 p-5">
          <BrandLogo
            size="md"
            showTagline
            imageClassName="bg-cream"
            textClassName="text-white"
            taglineClassName="text-white/70"
          />
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto p-4">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-2 text-xs font-black text-white/45">{group.title}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <AdminNavLink key={item.to} item={item} active={isNavActive(item, location.pathname, location.search)} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <button
            onClick={logout}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-black text-white transition hover:bg-white/15"
          >
            <LogOut className="h-4 w-4" />
            خروج
          </button>
        </div>
      </aside>

      <div className="min-w-0 pb-8">
        <header className="sticky top-0 z-50 border-b border-sand bg-white/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <BrandLogo size="sm" imageClassName="bg-cream" />
            <button
              onClick={logout}
              className="flex h-10 items-center gap-2 rounded-xl bg-olive-dark px-3 text-sm font-bold text-white"
            >
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2 no-scrollbar">
            {flatNavItems.map((item) => (
              <AdminNavLink
                key={item.to}
                item={item}
                active={isNavActive(item, location.pathname, location.search)}
                compact
              />
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-5 hidden items-end justify-between gap-4 lg:flex">
            <div>
              <p className="text-sm font-black text-clay-dark">لوحة إدارة سوق البلد</p>
              <h1 className="mt-1 text-2xl font-black text-charcoal">{activeItem.label}</h1>
            </div>
            <div className="rounded-xl border border-sand bg-white px-4 py-2 text-xs font-black text-charcoal-muted shadow-card">
              إدارة يومية سريعة ومركزة
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AdminNavLink({ item, active, compact = false }: { item: NavItem; active: boolean; compact?: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={`flex items-center gap-2 rounded-xl text-sm font-black transition ${
        compact ? 'h-10 flex-shrink-0 px-3' : 'h-11 px-3'
      } ${
        active
          ? compact ? 'bg-olive-dark text-white' : 'bg-white text-olive-dark shadow-sm'
          : compact ? 'bg-cream text-charcoal-muted hover:bg-cream-warm' : 'text-white/75 hover:bg-white/10'
      }`}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  );
}

function isNavActive(item: NavItem, pathname: string, search: string) {
  const params = new URLSearchParams(search);
  const [targetPath] = item.to.split('?');
  if (item.end) return pathname === item.to;
  if (item.match === 'price-update') return pathname === targetPath && params.get('mode') === 'price-update';
  if (item.match === 'products') return pathname === targetPath && params.get('mode') !== 'price-update';
  return pathname === targetPath;
}
