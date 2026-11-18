import type { CategoryId, Gender, Product } from '@/types/catalog';
import { allProductNames } from '@/i18n/content';

export type SortKey = 'newest' | 'price-asc' | 'price-desc';

export interface ProductFilters {
  query: string;
  categoryIds: CategoryId[];
  genders: Gender[];
  sizes: string[];
  colorIds: string[];
  minPrice: number | null;
  maxPrice: number | null;
  sort: SortKey;
}

export const EMPTY_FILTERS: ProductFilters = {
  query: '',
  categoryIds: [],
  genders: [],
  sizes: [],
  colorIds: [],
  minPrice: null,
  maxPrice: null,
  sort: 'newest',
};

/** Which products belong to a collection page before user filters are applied. */
export type CollectionScope = 'men' | 'women' | 'new' | 'all';

export function inScope(product: Product, scope: CollectionScope): boolean {
  if (scope === 'all') return true;
  if (scope === 'new') return product.newArrival;
  return product.gender === scope || product.gender === 'unisex';
}

const APOSTROPHES = /[ʻʼ'‘’`]/g;

function normalize(s: string): string {
  return s.toLocaleLowerCase('uz').replace(APOSTROPHES, '').trim();
}

export function applyFilters(products: Product[], f: ProductFilters): Product[] {
  const q = normalize(f.query);
  const result = products.filter((p) => {
    if (q && !normalize(`${allProductNames(p).join(' ')} ${p.description} ${Object.values(p.translations ?? {}).map((x) => x?.description ?? '').join(' ')}`).includes(q)) return false;
    if (f.categoryIds.length && !f.categoryIds.includes(p.categoryId)) return false;
    if (f.genders.length && !f.genders.includes(p.gender)) return false;
    // Size/colour filters match only combinations that are actually available.
    if (f.sizes.length || f.colorIds.length) {
      const match = p.variants.some(
        (v) =>
          v.available &&
          (!f.sizes.length || f.sizes.includes(v.size)) &&
          (!f.colorIds.length || f.colorIds.includes(v.colorId)),
      );
      if (!match) return false;
    }
    if (f.minPrice != null && p.price < f.minPrice) return false;
    if (f.maxPrice != null && p.price > f.maxPrice) return false;
    return true;
  });
  return sortProducts(result, f.sort);
}

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const copy = [...products];
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
    case 'price-desc':
      return copy.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
    case 'newest':
    default:
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export function countActiveFilters(f: ProductFilters): number {
  return (
    f.categoryIds.length +
    f.genders.length +
    f.sizes.length +
    f.colorIds.length +
    (f.minPrice != null ? 1 : 0) +
    (f.maxPrice != null ? 1 : 0)
  );
}

// ——— URL (search params) serialisation, so filters survive refresh and can be shared ———

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);
const num = (v: string | null) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
};

export function filtersFromParams(params: URLSearchParams): ProductFilters {
  const sort = params.get('sort');
  return {
    query: params.get('q') ?? '',
    categoryIds: list(params.get('cat')) as CategoryId[],
    genders: list(params.get('gender')) as Gender[],
    sizes: list(params.get('size')),
    colorIds: list(params.get('color')),
    minPrice: num(params.get('min')),
    maxPrice: num(params.get('max')),
    sort: sort === 'price-asc' || sort === 'price-desc' ? sort : 'newest',
  };
}

export function filtersToParams(f: ProductFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.query) p.set('q', f.query);
  if (f.categoryIds.length) p.set('cat', f.categoryIds.join(','));
  if (f.genders.length) p.set('gender', f.genders.join(','));
  if (f.sizes.length) p.set('size', f.sizes.join(','));
  if (f.colorIds.length) p.set('color', f.colorIds.join(','));
  if (f.minPrice != null) p.set('min', String(f.minPrice));
  if (f.maxPrice != null) p.set('max', String(f.maxPrice));
  if (f.sort !== 'newest') p.set('sort', f.sort);
  return p;
}
