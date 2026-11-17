import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { BarChart3, ExternalLink, FlaskConical, LayoutDashboard, LogOut, Menu, Package, Settings, ShoppingCart } from 'lucide-react';
import { brand } from '@/config/brand';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { Drawer } from '@/components/ui/Drawer';
import { useAdminAuth } from '@/features/admin/AdminAuthContext';

const NAV = [
  { to: '/admin', label: t.admin.nav.dashboard, icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: t.admin.nav.products, icon: Package },
  { to: '/admin/orders', label: t.admin.nav.orders, icon: ShoppingCart },
  { to: '/admin/analytics', label: t.admin.nav.analytics, icon: BarChart3 },
  { to: '/admin/settings', label: t.admin.nav.settings, icon: Settings },
];

function SidebarContent({ onLogout }: { onLogout: () => void }) {
  const { session } = useAdminAuth();
  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label={t.admin.panel}>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex h-10 items-center gap-3 px-3 text-[13px] tracking-wide transition-colors',
                isActive ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-mist hover:text-ink',
              )
            }
          >
            <Icon size={17} strokeWidth={1.5} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-line px-3 py-4">
        <Link to="/" target="_blank" className="flex h-10 items-center gap-3 px-3 text-[13px] text-ink-soft hover:bg-mist hover:text-ink">
          <ExternalLink size={17} strokeWidth={1.5} />
          {t.admin.viewStore}
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex h-10 w-full items-center gap-3 px-3 text-left text-[13px] text-ink-soft hover:bg-mist hover:text-ink"
        >
          <LogOut size={17} strokeWidth={1.5} />
          {t.admin.logout}
        </button>
        {session && (
          <p className="truncate px-3 pt-2 text-[11px] text-muted" title={session.email}>
            {t.admin.signedInAs} {session.email}
          </p>
        )}
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <Link to="/admin" className="flex flex-col leading-none">
      <span className="display text-lg tracking-[0.18em] uppercase">{brand.name}</span>
      <span className="mt-1 text-[10px] tracking-[0.2em] text-muted uppercase">{t.admin.panel}</span>
    </Link>
  );
}

export function AdminLayout() {
  const { session, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const logout = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-dvh bg-mist/50 text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-paper lg:flex">
        <div className="flex h-16 items-center border-b border-line px-6">
          <BrandMark />
        </div>
        <SidebarContent onLogout={logout} />
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-paper px-4 lg:hidden">
          <button type="button" onClick={() => setMenuOpen(true)} aria-label={t.nav.openMenu} className="-ml-2 p-2 hover:bg-mist">
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <BrandMark />
          <span className="w-9" />
        </header>

        {session?.isMock && (
          <div role="note" className="flex items-center gap-2 border-b border-dashed border-clay/50 bg-sand/50 px-4 py-2 text-xs text-ink-soft lg:px-8">
            <FlaskConical size={14} className="shrink-0 text-clay" />
            {t.admin.mockBanner}
          </div>
        )}

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title={t.admin.panel} closeLabel={t.nav.closeMenu}>
        <SidebarContent onLogout={logout} />
      </Drawer>
    </div>
  );
}
