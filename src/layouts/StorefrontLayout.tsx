import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Menu, Search, ShoppingBag } from 'lucide-react';
import { brand } from '@/config/brand';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { cn } from '@/lib/cn';
import { Container } from '@/components/ui/primitives';
import { Drawer } from '@/components/ui/Drawer';
import { useCart } from '@/features/cart/CartContext';
import { InstagramIcon, TelegramIcon } from '@/components/storefront/SocialIcons';

// Labels are translation keys, translated at render time so they follow the language.
const NAV = [
  { to: '/men', labelKey: 'nav.men' },
  { to: '/women', labelKey: 'nav.women' },
  { to: '/new', labelKey: 'nav.newArrivals' },
  { to: '/about', labelKey: 'nav.about' },
  { to: '/contact', labelKey: 'nav.contact' },
] as const;

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Header() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { itemCount } = useCart();
  const { pathname } = useLocation();

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const iconBtn = 'relative inline-flex h-10 w-10 items-center justify-center hover:bg-mist transition-colors';

  return (
    <>
      <div className="bg-ink px-4 py-2 text-center text-[11px] tracking-[0.14em] text-paper/90 uppercase">
        {t('preorder.short')}
      </div>
      <header
        className={cn(
          'sticky top-0 z-40 border-b bg-paper/95 backdrop-blur transition-colors',
          scrolled ? 'border-line' : 'border-transparent',
        )}
      >
        <Container className="grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-20">
          <div className="flex items-center gap-1 lg:gap-8">
            <button type="button" className={cn(iconBtn, '-ml-2 lg:hidden')} aria-label={t('nav.openMenu')} onClick={() => setMenuOpen(true)}>
              <Menu size={20} strokeWidth={1.5} />
            </button>
            <nav className="hidden items-center gap-7 lg:flex" aria-label={t('nav.main')}>
              {NAV.slice(0, 3).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'text-[13px] tracking-[0.06em] transition-colors hover:text-ink',
                      isActive ? 'text-ink underline decoration-1 underline-offset-[6px]' : 'text-ink-soft',
                    )
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </nav>
          </div>

          <Link to="/" className="display text-xl tracking-[0.2em] uppercase sm:text-2xl" aria-label={`${brand.name} — ${t('nav.home')}`}>
            {brand.name}
          </Link>

          <div className="flex items-center justify-end gap-1 lg:gap-6">
            <nav className="hidden items-center gap-7 lg:flex" aria-label={t('nav.secondary')}>
              {NAV.slice(3).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn('text-[13px] tracking-[0.06em] hover:text-ink', isActive ? 'text-ink' : 'text-ink-soft')
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </nav>
            <LanguageSwitcher className="hidden sm:flex" />
            <div className="flex items-center">
              <Link to="/search" className={iconBtn} aria-label={t('nav.search')}>
                <Search size={19} strokeWidth={1.5} />
              </Link>
              <Link to="/cart" className={cn(iconBtn, '-mr-2')} aria-label={`${t('nav.cart')} (${itemCount})`}>
                <ShoppingBag size={19} strokeWidth={1.5} />
                {itemCount > 0 && (
                  <span className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-medium text-paper tabular-nums">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </Container>
      </header>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title={brand.name} closeLabel={t('nav.closeMenu')}>
        <nav className="flex flex-col px-5 py-4" aria-label={t('nav.main')}>
          {[{ to: '/', labelKey: 'nav.home' } as const, ...NAV].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn('display border-b border-line py-4 text-2xl', isActive ? 'text-ink' : 'text-ink-soft')
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 pt-2">
          <LanguageSwitcher variant="block" />
        </div>
        <div className="space-y-2 px-5 py-4 text-sm text-muted">
          <a href={brand.phoneHref} className="block text-ink">
            {brand.phone}
          </a>
          <p>{t('brand.workingHours')}</p>
        </div>
      </Drawer>
    </>
  );
}

function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const col = 'space-y-3 text-sm';
  const link = 'text-paper/70 hover:text-paper transition-colors';
  return (
    <footer className="mt-24 bg-ink text-paper">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:py-20">
        <div className="space-y-4">
          <p className="display text-2xl tracking-[0.2em] uppercase">{brand.name}</p>
          <p className="max-w-xs text-sm leading-relaxed text-paper/60">{t('brand.tagline')}</p>
          <p className="max-w-xs text-xs leading-relaxed text-paper/50">{t('footer.preorderNote')}</p>
        </div>
        <div className={col}>
          <p className="eyebrow text-paper/50">{t('footer.shop')}</p>
          <Link to="/men" className={cn(link, 'block')}>{t('nav.men')}</Link>
          <Link to="/women" className={cn(link, 'block')}>{t('nav.women')}</Link>
          <Link to="/new" className={cn(link, 'block')}>{t('nav.newArrivals')}</Link>
        </div>
        <div className={col}>
          <p className="eyebrow text-paper/50">{t('footer.info')}</p>
          <Link to="/about" className={cn(link, 'block')}>{t('nav.about')}</Link>
          <Link to="/contact" className={cn(link, 'block')}>{t('nav.contact')}</Link>
        </div>
        <div className={col}>
          <p className="eyebrow text-paper/50">{t('footer.contact')}</p>
          <a href={brand.phoneHref} className={cn(link, 'block')}>{brand.phone}</a>
          <a href={`mailto:${brand.email}`} className={cn(link, 'block')}>{brand.email}</a>
          <p className="text-paper/50">{t('brand.workingHours')}</p>
          <div className="flex gap-2 pt-2">
            <a href={brand.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="inline-flex h-10 w-10 items-center justify-center border border-paper/20 hover:border-paper">
              <InstagramIcon />
            </a>
            <a href={brand.social.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="inline-flex h-10 w-10 items-center justify-center border border-paper/20 hover:border-paper">
              <TelegramIcon />
            </a>
          </div>
        </div>
      </Container>
      <Container className="border-t border-paper/10 py-6 text-xs text-paper/40">
        © {year} {brand.name}. {t('footer.rights')}
      </Container>
    </footer>
  );
}

export function StorefrontLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
