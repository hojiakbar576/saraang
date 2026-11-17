import { describe, expect, it } from 'vitest';
import { MOCK_PRODUCTS } from '@/data/mock/products';
import { COLORS } from '@/data/mock/taxonomy';
import {
  applyFilters,
  EMPTY_FILTERS,
  filtersFromParams,
  filtersToParams,
  inScope,
  type ProductFilters,
} from '@/features/products/filters';
import {
  initialSelection,
  isColorAvailable,
  isSizeAvailable,
  isVariantAvailable,
} from '@/features/products/variants';
import { formatUZS, multiply, sum } from '@/lib/money';

const bySlug = (slug: string) => {
  const p = MOCK_PRODUCTS.find((x) => x.slug === slug);
  if (!p) throw new Error(slug);
  return p;
};

describe('mock catalog integrity', () => {
  it('has unique ids and slugs', () => {
    expect(new Set(MOCK_PRODUCTS.map((p) => p.id)).size).toBe(MOCK_PRODUCTS.length);
    expect(new Set(MOCK_PRODUCTS.map((p) => p.slug)).size).toBe(MOCK_PRODUCTS.length);
  });

  it('uses integer UZS prices and known colours', () => {
    const colorIds = new Set(COLORS.map((c) => c.id));
    for (const p of MOCK_PRODUCTS) {
      expect(Number.isSafeInteger(p.price) && p.price > 0).toBe(true);
      p.colorIds.forEach((c) => expect(colorIds.has(c)).toBe(true));
      expect(p.variants).toHaveLength(p.sizes.length * p.colorIds.length);
      expect(p.images.length).toBeGreaterThan(0);
    }
  });
});

describe('variant availability', () => {
  const merino = bySlug('merino-sviter'); // navy entirely unavailable
  const tee = bySlug('oversize-paxta-futbolka'); // S/black and XXL/grey unavailable

  it('disables a colour with no available sizes', () => {
    expect(isColorAvailable(merino, 'navy')).toBe(false);
    expect(isColorAvailable(merino, 'charcoal')).toBe(true);
  });

  it('disables a size only for the colour in which it is unavailable', () => {
    expect(isVariantAvailable(tee, 'S', 'black')).toBe(false);
    expect(isSizeAvailable(tee, 'S', 'black')).toBe(false);
    expect(isSizeAvailable(tee, 'S', 'white')).toBe(true);
    expect(isSizeAvailable(tee, 'S', null)).toBe(true);
  });

  it('treats unknown combinations as unavailable', () => {
    expect(isVariantAvailable(tee, 'XS', 'white')).toBe(false);
    expect(isVariantAvailable(tee, 'M', 'purple')).toBe(false);
  });

  it('preselects the first available colour and a single size', () => {
    expect(initialSelection(merino)).toEqual({ colorId: 'charcoal', size: null });
    expect(initialSelection(bySlug('kanvas-sumka'))).toEqual({ colorId: 'cream', size: 'Bitta oʻlcham' });
  });
});

describe('collection filters', () => {
  const f = (patch: Partial<ProductFilters>): ProductFilters => ({ ...EMPTY_FILTERS, ...patch });

  it('scopes men/women collections and includes unisex items in both', () => {
    const men = MOCK_PRODUCTS.filter((p) => inScope(p, 'men'));
    const women = MOCK_PRODUCTS.filter((p) => inScope(p, 'women'));
    expect(men.every((p) => p.gender !== 'women')).toBe(true);
    expect(women.every((p) => p.gender !== 'men')).toBe(true);
    expect(men.some((p) => p.slug === 'kanvas-sumka')).toBe(true);
    expect(women.some((p) => p.slug === 'kanvas-sumka')).toBe(true);
  });

  it('filters by size and colour using available variants only', () => {
    const navy = applyFilters(MOCK_PRODUCTS, f({ colorIds: ['navy'] }));
    expect(navy.map((p) => p.slug)).not.toContain('merino-sviter');
    expect(navy.map((p) => p.slug)).toContain('chino-shim');
  });

  it('filters by price range inclusively', () => {
    const r = applyFilters(MOCK_PRODUCTS, f({ minPrice: 1_000_000 }));
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.price >= 1_000_000)).toBe(true);
  });

  it('search ignores case and Uzbek apostrophe variants', () => {
    const r1 = applyFilters(MOCK_PRODUCTS, f({ query: "ZIG'IR" }));
    const r2 = applyFilters(MOCK_PRODUCTS, f({ query: 'zigʻir' }));
    expect(r1.length).toBeGreaterThan(0);
    expect(r1.map((p) => p.id)).toEqual(r2.map((p) => p.id));
  });

  it('sorts by price and newest', () => {
    const asc = applyFilters(MOCK_PRODUCTS, f({ sort: 'price-asc' })).map((p) => p.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const newest = applyFilters(MOCK_PRODUCTS, f({})).map((p) => p.createdAt);
    expect(newest).toEqual([...newest].sort().reverse());
  });

  it('round-trips through URL params and ignores invalid values', () => {
    const filters = f({ query: 'shim', sizes: ['M', 'L'], colorIds: ['black'], minPrice: 300000, sort: 'price-desc' });
    expect(filtersFromParams(filtersToParams(filters))).toEqual(filters);
    expect(filtersFromParams(new URLSearchParams('min=-5&max=abc&sort=bogus'))).toEqual(EMPTY_FILTERS);
  });
});

describe('money', () => {
  it('formats UZS with grouped thousands', () => {
    expect(formatUZS(1_290_000)).toBe('1 290 000 soʻm');
    expect(formatUZS(0, false)).toBe('0');
  });

  it('rejects non-integer and negative amounts', () => {
    expect(() => multiply(100.5, 2)).toThrow();
    expect(() => sum([100, -1])).toThrow();
    expect(sum([189_000, multiply(349_000, 2)])).toBe(887_000);
  });
});
