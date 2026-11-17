import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { brand } from '@/config/brand';
import { t } from '@/i18n';
import { Container, SectionHeading } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/Button';
import { ProductGrid } from '@/components/storefront/ProductCard';
import { PreorderSteps } from '@/components/storefront/PreorderSteps';
import { useActiveProducts } from '@/hooks/useCatalog';
import { sortProducts } from '@/features/products/filters';
import { demoGarmentImage } from '@/data/mock/demoImages';
import { usePageTitle } from '@/hooks/usePageTitle';

// DEMO imagery for the hero and category tiles — replaced by real photography later.
const HERO_IMAGE = demoGarmentImage('coat', '#cdb994', 'front');
const MEN_IMAGE = demoGarmentImage('shirt', '#29324a', 'alt');
const WOMEN_IMAGE = demoGarmentImage('dress', '#ebe2d0', 'alt');

function ViewAll({ to }: { to: string }) {
  return (
    <Link to={to} className="group inline-flex shrink-0 items-center gap-2 text-[13px] tracking-[0.04em] text-ink-soft hover:text-ink">
      {t.common.viewAll}
      <ArrowRight size={15} strokeWidth={1.5} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function HomePage() {
  usePageTitle();
  const { data: products, loading } = useActiveProducts();
  const featured = products?.filter((p) => p.featured).slice(0, 4);
  const newest = products && sortProducts(products.filter((p) => p.newArrival), 'newest').slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line">
        <div className="grid lg:min-h-[78vh] lg:grid-cols-2">
          <div className="order-2 flex flex-col justify-center px-4 py-12 sm:px-10 lg:order-1 lg:px-16 xl:px-24">
            <p className="eyebrow mb-5">{t.home.heroEyebrow}</p>
            <h1 className="display max-w-xl text-[44px] leading-[1.02] sm:text-6xl xl:text-7xl">{t.home.heroTitle}</h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">{t.home.heroText}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink to="/men" size="lg">{t.home.heroCtaMen}</ButtonLink>
              <ButtonLink to="/women" size="lg" variant="secondary">{t.home.heroCtaWomen}</ButtonLink>
            </div>
          </div>
          <div className="relative order-1 aspect-[6/5] bg-mist sm:aspect-[16/11] lg:order-2 lg:aspect-auto">
            <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Featured */}
      <Container className="pt-16 sm:pt-24">
        <SectionHeading eyebrow={brand.name} title={t.home.featured} action={<ViewAll to="/search" />} />
        <ProductGrid products={featured} loading={loading} skeletonCount={4} />
      </Container>

      {/* Categories */}
      <Container className="pt-16 sm:pt-24">
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-5">
          {[
            { to: '/men', img: MEN_IMAGE, title: t.home.menTitle, text: t.home.menText },
            { to: '/women', img: WOMEN_IMAGE, title: t.home.womenTitle, text: t.home.womenText },
          ].map((c) => (
            <Link key={c.to} to={c.to} className="group relative block aspect-[4/5] overflow-hidden bg-mist sm:aspect-[5/6]">
              <img
                src={c.img}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[var(--ease-soft)] group-hover:scale-[1.03]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/55 to-transparent p-6 pt-24 text-paper sm:p-8 sm:pt-32">
                <h2 className="display text-3xl sm:text-4xl">{c.title}</h2>
                <p className="mt-1 text-sm text-paper/80">{c.text}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-[13px] tracking-[0.06em] underline-offset-4 group-hover:underline">
                  {t.common.shopNow} <ArrowRight size={15} strokeWidth={1.5} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Container>

      {/* New arrivals */}
      <Container className="pt-16 sm:pt-24">
        <SectionHeading eyebrow={t.home.heroEyebrow} title={t.home.newArrivals} action={<ViewAll to="/new" />} />
        <ProductGrid products={newest} loading={loading} skeletonCount={4} />
      </Container>

      {/* Brand intro */}
      <section className="mt-16 bg-sand/60 sm:mt-24">
        <Container className="grid gap-8 py-16 sm:py-24 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <div>
            <p className="eyebrow mb-4">{t.home.brandEyebrow}</p>
            <h2 className="display text-4xl sm:text-5xl">{t.home.brandTitle}</h2>
          </div>
          <div>
            <p className="max-w-xl text-[15px] leading-relaxed text-ink-soft sm:text-base">{t.home.brandText}</p>
            <ButtonLink to="/about" variant="link" className="mt-6">
              {t.nav.about}
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Pre-order explanation */}
      <Container className="pt-16 sm:pt-24">
        <SectionHeading eyebrow={t.preorder.short} title={t.preorder.title} />
        <div className="border border-line">
          <PreorderSteps />
        </div>
      </Container>
    </>
  );
}
