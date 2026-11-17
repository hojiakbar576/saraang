import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { SearchX, SlidersHorizontal, Search, X } from 'lucide-react';
import { t } from '@/i18n';
import { Container, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { ProductGrid } from '@/components/storefront/ProductCard';
import { FilterPanel, type FilterOptions } from '@/components/storefront/FilterPanel';
import { useActiveProducts, useTaxonomy } from '@/hooks/useCatalog';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  applyFilters,
  countActiveFilters,
  EMPTY_FILTERS,
  filtersFromParams,
  filtersToParams,
  inScope,
  type CollectionScope,
  type ProductFilters,
  type SortKey,
} from '@/features/products/filters';
import { SIZE_ORDER } from '@/data/mock/taxonomy';
import type { Gender } from '@/types/catalog';

const COPY: Record<CollectionScope, { title: string; intro: string }> = {
  men: { title: t.collection.menTitle, intro: t.collection.menIntro },
  women: { title: t.collection.womenTitle, intro: t.collection.womenIntro },
  new: { title: t.collection.newTitle, intro: t.collection.newIntro },
  all: { title: t.collection.allTitle, intro: t.collection.allIntro },
};

const sizeRank = (s: string) => {
  const i = (SIZE_ORDER as readonly string[]).indexOf(s);
  return i === -1 ? 999 : i;
};

export function CollectionPage({ scope }: { scope: CollectionScope }) {
  const copy = COPY[scope];
  usePageTitle(copy.title);
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const { data: products, loading } = useActiveProducts();
  const { data: tax } = useTaxonomy();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [queryInput, setQueryInput] = useState(filters.query);

  const update = (next: ProductFilters) => setParams(filtersToParams(next), { replace: true, preventScrollReset: true });

  // Debounce the search box into the URL.
  useEffect(() => {
    if (queryInput === filters.query) return;
    const id = setTimeout(() => update({ ...filters, query: queryInput.trim() }), 250);
    return () => clearTimeout(id);
  }, [queryInput]);

  const scoped = useMemo(() => products?.filter((p) => inScope(p, scope)), [products, scope]);
  const results = useMemo(() => scoped && applyFilters(scoped, filters), [scoped, filters]);

  // Only offer filter values that exist in this collection.
  const options: FilterOptions = useMemo(() => {
    if (!scoped || !tax) return { categories: [], genders: [], sizes: [], colors: [] };
    const cats = new Set(scoped.map((p) => p.categoryId));
    const genders = new Set<Gender>(scoped.map((p) => p.gender));
    const sizes = new Set(scoped.flatMap((p) => p.sizes));
    const colors = new Set(scoped.flatMap((p) => p.colorIds));
    return {
      categories: tax.categories.filter((c) => cats.has(c.id)),
      genders: scope === 'new' || scope === 'all' ? (['men', 'women', 'unisex'] as Gender[]).filter((g) => genders.has(g)) : [],
      sizes: [...sizes].sort((a, b) => sizeRank(a) - sizeRank(b)),
      colors: tax.colors.filter((c) => colors.has(c.id)),
    };
  }, [scoped, tax, scope]);

  const activeCount = countActiveFilters(filters);
  const clearAll = () => {
    setQueryInput('');
    update({ ...EMPTY_FILTERS, sort: filters.sort });
  };

  return (
    <Container className="pt-10 sm:pt-14">
      <header className="mb-8 sm:mb-10">
        <h1 className="display text-5xl sm:text-6xl">{copy.title}</h1>
        <p className="mt-3 text-sm text-muted sm:text-[15px]">{copy.intro}</p>
      </header>

      {/* Toolbar */}
      <div className="sticky top-16 z-30 -mx-4 mb-6 flex flex-wrap items-center gap-2 border-y border-line bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0 lg:top-20">
        <label className="relative flex min-w-0 flex-1 basis-full items-center sm:basis-auto sm:max-w-sm">
          <Search size={16} strokeWidth={1.5} className="pointer-events-none absolute left-3 text-muted" />
          <span className="sr-only">{t.nav.search}</span>
          <input
            type="search"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder={t.collection.searchPlaceholder}
            className="h-10 w-full border border-line bg-paper pr-9 pl-9 text-sm placeholder:text-muted/70 focus:border-ink focus:outline-none"
          />
          {queryInput && (
            <button type="button" aria-label={t.collection.clearAll} onClick={() => setQueryInput('')} className="absolute right-2 p-1 text-muted hover:text-ink">
              <X size={14} />
            </button>
          )}
        </label>
        <Button variant="secondary" size="sm" className="h-10 lg:hidden" onClick={() => setDrawerOpen(true)}>
          <SlidersHorizontal size={15} strokeWidth={1.5} />
          {t.collection.filters}
          {activeCount > 0 && <span className="tabular-nums">({activeCount})</span>}
        </Button>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-muted tabular-nums sm:inline">{results && t.collection.results(results.length)}</span>
          <label className="flex items-center">
            <span className="sr-only">{t.collection.sort}</span>
            <select
              value={filters.sort}
              onChange={(e) => update({ ...filters, sort: e.target.value as SortKey })}
              className="h-10 cursor-pointer border border-line bg-paper px-3 text-xs tracking-wide focus:border-ink focus:outline-none"
            >
              <option value="newest">{t.collection.sortNewest}</option>
              <option value="price-asc">{t.collection.sortPriceAsc}</option>
              <option value="price-desc">{t.collection.sortPriceDesc}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
        <aside className="hidden lg:block" aria-label={t.collection.filters}>
          <div className="sticky top-40">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-medium">{t.collection.filters}</p>
              {activeCount > 0 && (
                <button type="button" onClick={clearAll} className="text-xs text-muted underline underline-offset-4 hover:text-ink">
                  {t.collection.clearAll}
                </button>
              )}
            </div>
            <FilterPanel filters={filters} options={options} onChange={update} />
          </div>
        </aside>

        <section aria-live="polite">
          <p className="mb-4 text-xs text-muted tabular-nums sm:hidden">{results && t.collection.results(results.length)}</p>
          {results && results.length === 0 ? (
            <EmptyState
              icon={<SearchX size={28} strokeWidth={1.25} />}
              title={t.collection.emptyTitle}
              text={t.collection.emptyText}
              action={
                (activeCount > 0 || filters.query) && (
                  <Button variant="secondary" onClick={clearAll}>
                    {t.collection.clearAll}
                  </Button>
                )
              }
            />
          ) : (
            <ProductGrid products={results} loading={loading} className="lg:grid-cols-3" />
          )}
        </section>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        side="right"
        title={t.collection.filters}
        closeLabel={t.nav.closeMenu}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={clearAll} disabled={activeCount === 0}>
              {t.collection.clearAll}
            </Button>
            <Button className="flex-[2]" onClick={() => setDrawerOpen(false)}>
              {t.collection.showResults(results?.length ?? 0)}
            </Button>
          </div>
        }
      >
        <div className="p-5">
          <FilterPanel filters={filters} options={options} onChange={update} />
        </div>
      </Drawer>
    </Container>
  );
}
