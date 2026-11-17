import { describe, expect, it } from 'vitest';
import { MOCK_PRODUCTS } from '@/data/mock/products';
import { CATEGORIES, COLORS } from '@/data/mock/taxonomy';
import { slugify, uniqueSlug } from '@/features/products/admin/slug';
import {
  DEFAULT_PRODUCT_INPUT,
  duplicateInput,
  inputFromProduct,
  validateProductInput,
  variantKey,
  type ProductInput,
} from '@/features/products/admin/productInput';
import { validateImageFile } from '@/features/products/admin/images';
import { detectDelimiter, parseCsv, toCsv } from '@/features/csv/csv';
import { csvTemplate, parseProductCsv, productsToCsv } from '@/features/csv/productCsv';
import { createProductStore } from '@/services/catalog/mock/localProductStore';
import { createMockAdminProductRepository } from '@/services/catalog/mock/mockAdminProductRepository';
import { memoryStore } from '@/lib/kvStore';

const img = { id: 'i1', url: 'https://cdn.example/a.jpg', alt: 'a', position: 0 };
const valid = (patch: Partial<ProductInput> = {}): ProductInput => ({
  ...DEFAULT_PRODUCT_INPUT,
  name: 'Paxta futbolka',
  slug: 'paxta-futbolka',
  price: 189_000,
  colorIds: ['white', 'black'],
  images: [img],
  ...patch,
});

describe('slug', () => {
  it('handles Uzbek apostrophes, Cyrillic and punctuation', () => {
    expect(slugify('Zigʻir koʻylak (nusxa)')).toBe('zigir-koylak-nusxa');
    expect(slugify("O'g'il bolalar")).toBe('ogil-bolalar');
    expect(slugify('Куртка зимняя')).toBe('kurtka-zimnyaya');
    expect(slugify('  --  ')).toBe('');
  });
  it('finds a free slug', () => {
    expect(uniqueSlug('futbolka', ['futbolka', 'futbolka-2'])).toBe('futbolka-3');
    expect(uniqueSlug('', [])).toBe('mahsulot');
    expect(uniqueSlug('o', [])).toBe('mahsulot-o');
  });
});

describe('product validation', () => {
  it('accepts a valid product and sorts sizes', () => {
    const r = validateProductInput(valid({ sizes: ['XL', 'S', 'M'] }));
    expect(r.ok && r.data.sizes).toEqual(['S', 'M', 'XL']);
  });

  it('reports clear errors', () => {
    const r = validateProductInput(valid({ name: 'x', slug: 'Bad Slug', price: 12.5, sizes: [], colorIds: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['colorIds', 'name', 'price', 'sizes', 'slug']);
  });

  it('requires a photo to publish but allows drafts without photos', () => {
    expect(validateProductInput(valid({ images: [] })).ok).toBe(false);
    expect(validateProductInput(valid({ images: [], status: 'inactive' })).ok).toBe(true);
  });

  it('rejects taken slugs and inverted delivery ranges', () => {
    const r = validateProductInput(valid({ deliveryEstimate: { minDays: 20, maxDays: 10 } }), ['paxta-futbolka']);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.slug).toBeDefined();
      expect(r.errors['deliveryEstimate.maxDays']).toBeDefined();
    }
  });

  it('only accepts image types and sizes we support', () => {
    expect(validateImageFile({ type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(validateImageFile({ type: 'image/gif', size: 1000 })).toBe('type');
    expect(validateImageFile({ type: 'image/png', size: 11 * 1024 * 1024 })).toBe('size');
  });
});

describe('duplicate product', () => {
  const source = MOCK_PRODUCTS.find((p) => p.slug === 'oversize-paxta-futbolka')!;
  const dup = duplicateInput(source, MOCK_PRODUCTS.map((p) => p.slug));

  it('copies merchandising fields but not identity or photos', () => {
    expect(dup.description).toBe(source.description);
    expect(dup.categoryId).toBe(source.categoryId);
    expect(dup.gender).toBe(source.gender);
    expect(dup.sizes).toEqual(source.sizes);
    expect(dup.colorIds).toEqual(source.colorIds);
    expect(dup.deliveryEstimate).toEqual(source.deliveryEstimate);
    expect(dup.unavailable).toEqual(inputFromProduct(source).unavailable);
    expect(dup.featured).toBe(source.featured);
    expect(dup.images).toEqual([]);
    expect(dup.status).toBe('inactive');
    expect(dup.slug).not.toBe(source.slug);
    expect(MOCK_PRODUCTS.map((p) => p.slug)).not.toContain(dup.slug);
  });

  it('saves as a new product with a new id', async () => {
    const repo = createMockAdminProductRepository(createProductStore(memoryStore()), () => false);
    const r = await repo.createProduct(dup);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.product.id).not.toBe(source.id);
      expect((await repo.getProduct(source.id))?.name).toBe(source.name);
    }
  });
});

describe('admin product repository', () => {
  const make = (referenced = new Set<string>()) =>
    createMockAdminProductRepository(createProductStore(memoryStore()), (id) => referenced.has(id));

  it('creates, updates and derives variants from availability', async () => {
    const repo = make();
    const created = await repo.createProduct(valid({ unavailable: [variantKey('M', 'black')] }));
    if (!created.ok) throw new Error('create failed');
    const p = created.product;
    expect(p.variants).toHaveLength(8);
    expect(p.variants.find((v) => v.size === 'M' && v.colorId === 'black')?.available).toBe(false);

    const updated = await repo.updateProduct(p.id, { ...inputFromProduct(p), price: 199_000, colorIds: ['white'] });
    if (!updated.ok) throw new Error('update failed');
    expect(updated.product.price).toBe(199_000);
    expect(updated.product.variants).toHaveLength(4);
    expect(updated.product.createdAt).toBe(p.createdAt);
  });

  it('refuses to delete products that appear in orders', async () => {
    const id = MOCK_PRODUCTS[0].id;
    const repo = make(new Set([id]));
    expect(await repo.deleteProduct(id)).toEqual({ ok: false, reason: 'has_orders' });
    await repo.setStatus(id, 'archived');
    expect((await repo.getProduct(id))?.status).toBe('archived');
    expect(await repo.deleteProduct(MOCK_PRODUCTS[1].id)).toEqual({ ok: true });
    expect(await repo.getProduct(MOCK_PRODUCTS[1].id)).toBeNull();
  });

  it('rejects a duplicate slug on create', async () => {
    const repo = make();
    const r = await repo.createProduct(valid({ slug: MOCK_PRODUCTS[0].slug }));
    expect(r.ok).toBe(false);
  });
});

describe('CSV', () => {
  it('parses quotes, escaped quotes, embedded newlines, CRLF and BOM', () => {
    const text = '\uFEFFa,b,c\r\n"x, y","he said ""hi""","line1\nline2"\r\n\r\n1,2,3';
    expect(parseCsv(text)).toEqual([
      ['a', 'b', 'c'],
      ['x, y', 'he said "hi"', 'line1\nline2'],
      ['1', '2', '3'],
    ]);
  });

  it('detects semicolon CSVs from Excel', () => {
    expect(detectDelimiter('name;price;category\nA;1;B')).toBe(';');
    expect(parseCsv('name;price\n"a;b";5')).toEqual([['name', 'price'], ['a;b', '5']]);
  });

  it('neutralises spreadsheet formulas on export and restores them on import', () => {
    const csv = toCsv([['=HYPERLINK("x")', 'ok']]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});

describe('product CSV import', () => {
  const ctx = (files: File[] = []) => ({ categories: CATEGORIES, colors: COLORS, takenSlugs: MOCK_PRODUCTS.map((p) => p.slug), imageFiles: files });
  const header = 'name,price,category,gender,sizes,colors,unavailable,status,images';

  it('accepts the downloadable template once its image files are provided', () => {
    const files = [new File(['x'], 'paxta-futbolka-1.jpg', { type: 'image/jpeg' }), new File(['x'], 'PAXTA-FUTBOLKA-2.JPG', { type: 'image/jpeg' })];
    const r = parseProductCsv(parseCsv(csvTemplate()), ctx(files));
    expect(r.fileErrors).toEqual([]);
    expect(r.rows).toHaveLength(2);
    expect(r.rows.every((row) => row.input)).toBe(true);
    expect(r.rows[0].input?.price).toBe(189_000);
    expect(r.rows[0].input?.unavailable).toEqual([variantKey('XL', 'black')]);
    expect(r.rows[1].input?.price).toBe(529_000);
    expect(r.rows[1].imageRefs[0]).toEqual({ kind: 'url', url: 'https://example.com/rasm.jpg' });
  });

  it('reports every invalid row with understandable errors instead of skipping silently', () => {
    const csv = [
      header,
      'Yaxshi,189000,tshirts,men,S|M,white,,inactive,',
      'Yomon narx,abc,tshirts,men,S,white,,inactive,',
      'Nomaʼlum,100000,shoes,kids,S,purple,,inactive,',
      'Rasmsiz faol,150000,tshirts,men,S,white,,active,',
      'Yoʻq fayl,150000,tshirts,men,S,white,,active,missing.jpg',
      'Http,150000,tshirts,men,S,white,,active,http://insecure.example/a.jpg',
    ].join('\n');
    const r = parseProductCsv(parseCsv(csv), ctx());
    expect(r.rows.map((x) => !!x.input)).toEqual([true, false, false, false, false, false]);
    expect(r.rows[1].errors.join(' ')).toMatch(/Narx/);
    expect(r.rows[2].errors.join(' ')).toMatch(/Turkum topilmadi/);
    expect(r.rows[2].errors.join(' ')).toMatch(/Jins/);
    expect(r.rows[2].errors.join(' ')).toMatch(/Rang topilmadi/);
    expect(r.rows[3].errors.join(' ')).toMatch(/rasm/i);
    expect(r.rows[4].errors.join(' ')).toMatch(/missing\.jpg/);
    expect(r.rows[5].errors.join(' ')).toMatch(/https/);
    expect(r.rows[1].rowNumber).toBe(3);
  });

  it('rejects missing required columns and duplicate slugs within the file', () => {
    expect(parseProductCsv(parseCsv('name,price\nA,1'), ctx()).fileErrors[0]).toMatch(/category/);
    const csv = [header + ',slug', 'Alfa,100000,tshirts,men,S,white,,inactive,,dup', 'Beta,100000,tshirts,men,S,white,,inactive,,dup'].join('\n');
    const r = parseProductCsv(parseCsv(csv), ctx());
    expect(r.rows[0].input).not.toBeNull();
    expect(r.rows[1].input).toBeNull();
  });

  it('defaults to a draft when no photo is given and warns about it', () => {
    const r = parseProductCsv(parseCsv(`${header}\nAlfa,100000,tshirts,erkak,S,Oq,,,`), ctx());
    expect(r.rows[0].input?.status).toBe('inactive');
    expect(r.rows[0].input?.gender).toBe('men');
    expect(r.rows[0].warnings.length).toBe(1);
  });

  it('round-trips an export back through the importer', () => {
    const sample = MOCK_PRODUCTS.slice(0, 3).map((p) => ({ ...p, status: 'inactive' as const, slug: `${p.slug}-copy` }));
    const { csv, skippedImages } = productsToCsv(sample);
    expect(skippedImages).toBe(9); // demo data-URL images are not exportable
    const r = parseProductCsv(parseCsv(csv), ctx());
    expect(r.rows.every((x) => x.input)).toBe(true);
    expect(r.rows.map((x) => x.input!.price)).toEqual(sample.map((p) => p.price));
    expect(r.rows[0].input!.unavailable.sort()).toEqual(inputFromProduct(sample[0]).unavailable.sort());
  });
});
