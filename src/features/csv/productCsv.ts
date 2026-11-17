import type { Category, Color, Gender, Product, ProductStatus } from '@/types/catalog';
import { restoreFormula, toCsv } from './csv';
import { slugify, uniqueSlug } from '@/features/products/admin/slug';
import { baseFilename, validateImageFile, IMAGE_ERROR_TEXT } from '@/features/products/admin/images';
import { DEFAULT_PRODUCT_INPUT, validateProductInput, variantKey, type ProductInput } from '@/features/products/admin/productInput';

export const CSV_COLUMNS = [
  'name',
  'slug',
  'description',
  'price',
  'category',
  'gender',
  'sizes',
  'colors',
  'unavailable',
  'delivery_min_days',
  'delivery_max_days',
  'featured',
  'new_arrival',
  'status',
  'images',
] as const;

export const REQUIRED_COLUMNS = ['name', 'price', 'category', 'gender', 'sizes', 'colors'] as const;

type Column = (typeof CSV_COLUMNS)[number];

export type ImageRef = { kind: 'url'; url: string } | { kind: 'file'; file: File };

export interface CsvRowResult {
  /** Line number in the spreadsheet (header = 1). */
  rowNumber: number;
  name: string;
  input: ProductInput | null;
  imageRefs: ImageRef[];
  errors: string[];
  warnings: string[];
}

export interface CsvParseResult {
  fileErrors: string[];
  fileWarnings: string[];
  rows: CsvRowResult[];
}

export interface CsvContext {
  categories: Category[];
  colors: Color[];
  takenSlugs: Iterable<string>;
  /** Image files the admin selected alongside the CSV. */
  imageFiles: File[];
}

const LIST_SEP = /\s*\|\s*/;
const list = (v: string) => (v.trim() ? v.split(LIST_SEP).map((s) => s.trim()).filter(Boolean) : []);
const norm = (v: string) => v.trim().toLowerCase().replace(/[ʻʼ'‘’`]/g, '');

const TRUE = new Set(['1', 'true', 'yes', 'ha', 'x', '+']);
const FALSE = new Set(['0', 'false', 'no', 'yoq', 'yo‘q', '-', '']);

function parseBool(v: string, field: string, errors: string[]): boolean {
  const n = norm(v);
  if (TRUE.has(n)) return true;
  if (FALSE.has(n)) return false;
  errors.push(`"${field}" ustuni: "${v}" — "ha" yoki "yoʻq" (yes/no) kiriting.`);
  return false;
}

function parsePrice(v: string, errors: string[]): number {
  const s = v.trim().replace(/\s*(so[ʻ'‘’`]?m|sum|uzs)$/i, '');
  if (!/^\d{1,3}([ ,.\u00A0\u202F]\d{3})*$|^\d+$/.test(s)) {
    errors.push(`Narx notoʻgʻri: "${v}". Butun son kiriting, masalan 349000.`);
    return 0;
  }
  return Number(s.replace(/\D/g, ''));
}

function parseInt0(v: string, field: string, fallback: number, errors: string[]): number {
  if (!v.trim()) return fallback;
  const n = Number(v.trim());
  if (!Number.isInteger(n)) {
    errors.push(`"${field}" butun son boʻlsin: "${v}".`);
    return fallback;
  }
  return n;
}

const GENDERS: Record<string, Gender> = {
  men: 'men', male: 'men', erkak: 'men', erkaklar: 'men',
  women: 'women', female: 'women', ayol: 'women', ayollar: 'women',
  unisex: 'unisex', uniseks: 'unisex',
};
const STATUSES: Record<string, ProductStatus> = {
  active: 'active', faol: 'active', sotuvda: 'active',
  inactive: 'inactive', draft: 'inactive', qoralama: 'inactive', nofaol: 'inactive',
  archived: 'archived', arxiv: 'archived',
};

export function parseProductCsv(rows: string[][], ctx: CsvContext): CsvParseResult {
  const fileErrors: string[] = [];
  const fileWarnings: string[] = [];
  if (rows.length === 0) return { fileErrors: ['Fayl boʻsh.'], fileWarnings, rows: [] };

  const header = rows[0].map((h) => norm(h).replace(/\s+/g, '_'));
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) fileErrors.push(`Majburiy ustunlar yoʻq: ${missing.join(', ')}. Shablonni yuklab oling.`);
  const unknown = header.filter((h) => h && !(CSV_COLUMNS as readonly string[]).includes(h));
  if (unknown.length) fileWarnings.push(`Nomaʼlum ustunlar eʼtiborsiz qoldirildi: ${unknown.join(', ')}.`);
  if (rows.length === 1) fileErrors.push('Faylda mahsulot qatorlari yoʻq.');
  if (fileErrors.length) return { fileErrors, fileWarnings, rows: [] };

  const idx = (c: Column) => header.indexOf(c);
  const cell = (r: string[], c: Column) => (idx(c) === -1 ? '' : restoreFormula((r[idx(c)] ?? '').trim()));

  const categoryLookup = new Map<string, Category>();
  for (const c of ctx.categories) {
    categoryLookup.set(norm(c.id), c);
    categoryLookup.set(norm(c.name), c);
  }
  const colorLookup = new Map<string, Color>();
  for (const c of ctx.colors) {
    colorLookup.set(norm(c.id), c);
    colorLookup.set(norm(c.name), c);
  }
  const fileLookup = new Map<string, File>();
  for (const f of ctx.imageFiles) {
    fileLookup.set(f.name.toLowerCase(), f);
    fileLookup.set(baseFilename(f.name).toLowerCase(), f);
  }

  const taken = new Set(ctx.takenSlugs);
  const results: CsvRowResult[] = [];

  rows.slice(1).forEach((r, i) => {
    const rowNumber = i + 2;
    const errors: string[] = [];
    const warnings: string[] = [];
    const name = cell(r, 'name');

    const category = categoryLookup.get(norm(cell(r, 'category')));
    if (!category) errors.push(`Turkum topilmadi: "${cell(r, 'category')}". Mavjud: ${ctx.categories.map((c) => c.id).join(', ')}.`);

    const gender = GENDERS[norm(cell(r, 'gender'))];
    if (!gender) errors.push(`Jins notoʻgʻri: "${cell(r, 'gender')}". men / women / unisex kiriting.`);

    const sizes = list(cell(r, 'sizes'));
    const colorIds: string[] = [];
    for (const raw of list(cell(r, 'colors'))) {
      const c = colorLookup.get(norm(raw));
      if (c) colorIds.push(c.id);
      else errors.push(`Rang topilmadi: "${raw}".`);
    }

    const unavailable: string[] = [];
    for (const pair of list(cell(r, 'unavailable'))) {
      const [size, colorRaw] = pair.split(':').map((s) => s.trim());
      const color = colorRaw ? colorLookup.get(norm(colorRaw)) : undefined;
      if (!size || !color || !sizes.includes(size) || !colorIds.includes(color.id)) {
        errors.push(`"unavailable" qiymati notoʻgʻri: "${pair}". Format: OʻLCHAM:rang, masalan M:black.`);
      } else unavailable.push(variantKey(size, color.id));
    }

    const imageRefs: ImageRef[] = [];
    for (const ref of list(cell(r, 'images'))) {
      if (/^https:\/\//i.test(ref)) {
        try {
          imageRefs.push({ kind: 'url', url: new URL(ref).toString() });
        } catch {
          errors.push(`Rasm havolasi notoʻgʻri: "${ref}".`);
        }
      } else if (/^[a-z]+:/i.test(ref)) {
        errors.push(`Faqat https:// havolalar qabul qilinadi: "${ref}".`);
      } else {
        const file = fileLookup.get(ref.toLowerCase()) ?? fileLookup.get(baseFilename(ref).toLowerCase());
        if (!file) errors.push(`Rasm fayli tanlanmagan: "${ref}". CSV bilan birga shu faylni ham tanlang.`);
        else {
          const imgErr = validateImageFile(file);
          if (imgErr) errors.push(`${file.name}: ${IMAGE_ERROR_TEXT[imgErr]}`);
          else imageRefs.push({ kind: 'file', file });
        }
      }
    }

    const statusRaw = cell(r, 'status');
    let status: ProductStatus;
    if (statusRaw) {
      status = STATUSES[norm(statusRaw)];
      if (!status) {
        errors.push(`Holat notoʻgʻri: "${statusRaw}". active / inactive / archived kiriting.`);
        status = 'inactive';
      }
    } else {
      status = imageRefs.length ? 'active' : 'inactive';
      if (!imageRefs.length) warnings.push('Rasm yoʻq — qoralama (nofaol) sifatida saqlanadi.');
    }

    const slugRaw = cell(r, 'slug');
    const slug = slugRaw ? slugRaw.toLowerCase() : uniqueSlug(slugify(name), taken);

    const input: ProductInput = {
      ...DEFAULT_PRODUCT_INPUT,
      name,
      slug,
      description: cell(r, 'description'),
      price: parsePrice(cell(r, 'price'), errors),
      categoryId: category?.id ?? DEFAULT_PRODUCT_INPUT.categoryId,
      gender: gender ?? 'men',
      sizes,
      colorIds,
      unavailable,
      // Placeholder entries so validation can check "active needs a photo";
      // real images are attached after upload on confirm.
      images: imageRefs.map((_, k) => ({ id: `pending-${k}`, url: 'pending', alt: name, position: k })),
      deliveryEstimate: {
        minDays: parseInt0(cell(r, 'delivery_min_days'), 'delivery_min_days', 14, errors),
        maxDays: parseInt0(cell(r, 'delivery_max_days'), 'delivery_max_days', 21, errors),
      },
      featured: parseBool(cell(r, 'featured'), 'featured', errors),
      newArrival: idx('new_arrival') === -1 || !cell(r, 'new_arrival') ? true : parseBool(cell(r, 'new_arrival'), 'new_arrival', errors),
      status,
    };

    const v = validateProductInput(input, taken);
    if (!v.ok) {
      for (const [field, msg] of Object.entries(v.errors)) {
        // Avoid duplicating messages already reported above for the same field.
        if (field === 'colorIds' && colorIds.length === 0 && errors.some((e) => e.startsWith('Rang'))) continue;
        errors.push(`${field}: ${msg}`);
      }
    }

    if (!errors.length) taken.add(slug);
    results.push({ rowNumber, name, input: errors.length ? null : (v.ok ? v.data : null), imageRefs, errors, warnings });
  });

  return { fileErrors, fileWarnings, rows: results };
}

// ——— Export & template ———

export function productsToCsv(products: Product[]): { csv: string; skippedImages: number } {
  let skippedImages = 0;
  const rows = products.map((p) => {
    const urls = [...p.images]
      .sort((a, b) => a.position - b.position)
      .map((i) => i.url)
      .filter((u) => {
        const ok = /^https?:\/\//i.test(u);
        if (!ok) skippedImages++;
        return ok;
      });
    return [
      p.name,
      p.slug,
      p.description,
      p.price,
      p.categoryId,
      p.gender,
      p.sizes.join('|'),
      p.colorIds.join('|'),
      p.variants.filter((v) => !v.available).map((v) => `${v.size}:${v.colorId}`).join('|'),
      p.deliveryEstimate.minDays,
      p.deliveryEstimate.maxDays,
      p.featured ? 'yes' : 'no',
      p.newArrival ? 'yes' : 'no',
      p.status,
      urls.join('|'),
    ];
  });
  return { csv: toCsv([[...CSV_COLUMNS], ...rows]), skippedImages };
}

export function csvTemplate(): string {
  return toCsv([
    [...CSV_COLUMNS],
    [
      'Paxta futbolka',
      '',
      'Zich paxtadan tikilgan keng bichimli futbolka.',
      '189000',
      'tshirts',
      'men',
      'S|M|L|XL',
      'white|black',
      'XL:black',
      '14',
      '21',
      'yes',
      'yes',
      'active',
      'paxta-futbolka-1.jpg|paxta-futbolka-2.jpg',
    ],
    [
      'Midi koʻylak',
      'midi-koylak-yozgi',
      'Zigʻir aralash matodan midi koʻylak.',
      '529 000',
      'dresses',
      'women',
      'XS|S|M|L',
      'cream|olive',
      '',
      '18',
      '25',
      'no',
      'yes',
      'inactive',
      'https://example.com/rasm.jpg',
    ],
  ]);
}
