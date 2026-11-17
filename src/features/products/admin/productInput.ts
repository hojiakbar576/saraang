import { z } from 'zod';
import type { CategoryId, Gender, Product, ProductImage, ProductStatus, ProductVariant } from '@/types/catalog';
import { CATEGORIES, COLORS, SIZE_ORDER } from '@/data/mock/taxonomy';
import { SLUG_PATTERN, slugify, uniqueSlug } from './slug';

/** What the admin edits. Variants are derived from sizes × colours minus `unavailable`. */
export interface ProductInput {
  name: string;
  slug: string;
  description: string;
  price: number;
  categoryId: CategoryId;
  gender: Gender;
  sizes: string[];
  colorIds: string[];
  /** Keys "size::colorId" that are NOT available. */
  unavailable: string[];
  images: ProductImage[];
  deliveryEstimate: { minDays: number; maxDays: number };
  featured: boolean;
  newArrival: boolean;
  status: ProductStatus;
}

export const variantKey = (size: string, colorId: string) => `${size}::${colorId}`;

export const DEFAULT_PRODUCT_INPUT: ProductInput = {
  name: '',
  slug: '',
  description: '',
  price: 0,
  categoryId: 'tshirts',
  gender: 'men',
  sizes: ['S', 'M', 'L', 'XL'],
  colorIds: [],
  unavailable: [],
  images: [],
  deliveryEstimate: { minDays: 14, maxDays: 21 },
  featured: false,
  newArrival: true,
  status: 'active',
};

export function inputFromProduct(p: Product): ProductInput {
  return {
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    categoryId: p.categoryId,
    gender: p.gender,
    sizes: [...p.sizes],
    colorIds: [...p.colorIds],
    unavailable: p.variants.filter((v) => !v.available).map((v) => variantKey(v.size, v.colorId)),
    images: [...p.images].sort((a, b) => a.position - b.position),
    deliveryEstimate: { ...p.deliveryEstimate },
    featured: p.featured,
    newArrival: p.newArrival,
    status: p.status,
  };
}

/**
 * Duplicate: copies description, category, gender, delivery, sizes, colours,
 * availability and flags; gives a new name/slug, no photos, and saves as a
 * draft so it is not published until the admin adds photos and checks the price.
 */
export function duplicateInput(p: Product, takenSlugs: Iterable<string>): ProductInput {
  const name = `${p.name} (nusxa)`;
  return {
    ...inputFromProduct(p),
    name,
    slug: uniqueSlug(slugify(name), takenSlugs),
    images: [],
    status: 'inactive',
  };
}

export function buildVariants(productId: string, input: Pick<ProductInput, 'sizes' | 'colorIds' | 'unavailable'>): ProductVariant[] {
  const off = new Set(input.unavailable);
  return input.colorIds.flatMap((colorId) =>
    input.sizes.map((size) => ({
      id: `${productId}_${colorId}_${size}`,
      size,
      colorId,
      available: !off.has(variantKey(size, colorId)),
    })),
  );
}

export function sortSizes(sizes: string[]): string[] {
  const rank = (s: string) => {
    const i = (SIZE_ORDER as readonly string[]).indexOf(s);
    return i === -1 ? 100 : i;
  };
  return [...sizes].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, undefined, { numeric: true }));
}

// ——— Validation ———

export const MIN_PRICE = 1_000;
export const MAX_PRICE = 1_000_000_000;

const categoryIds = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];
const colorIds = new Set(COLORS.map((c) => c.id));

export const productInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Nom kamida 2 ta belgi boʻlsin.').max(120, 'Nom juda uzun (120 belgigacha).'),
    slug: z
      .string()
      .trim()
      .min(2, 'Slug kamida 2 ta belgi boʻlsin.')
      .max(80, 'Slug juda uzun.')
      .regex(SLUG_PATTERN, 'Faqat kichik lotin harflari, raqamlar va chiziqcha (-).'),
    description: z.string().trim().max(4000, 'Tavsif juda uzun (4000 belgigacha).'),
    price: z
      .number({ invalid_type_error: 'Narxni kiriting.' })
      .int('Narx butun son boʻlsin.')
      .min(MIN_PRICE, `Narx kamida ${MIN_PRICE.toLocaleString('ru-RU')} soʻm boʻlsin.`)
      .max(MAX_PRICE, 'Narx juda katta.'),
    categoryId: z.enum(categoryIds, { errorMap: () => ({ message: 'Turkumni tanlang.' }) }),
    gender: z.enum(['men', 'women', 'unisex'], { errorMap: () => ({ message: 'Jinsni tanlang.' }) }),
    sizes: z
      .array(z.string().trim().min(1).max(20))
      .min(1, 'Kamida bitta oʻlcham tanlang.')
      .refine((a) => new Set(a).size === a.length, 'Oʻlchamlar takrorlanmasin.'),
    colorIds: z
      .array(z.string())
      .min(1, 'Kamida bitta rang tanlang.')
      .refine((a) => a.every((c) => colorIds.has(c)), 'Nomaʼlum rang.')
      .refine((a) => new Set(a).size === a.length, 'Ranglar takrorlanmasin.'),
    unavailable: z.array(z.string()),
    images: z.array(
      z.object({
        id: z.string(),
        url: z.string().min(1),
        alt: z.string(),
        position: z.number().int(),
        storagePath: z.string().nullable().optional(),
      }),
    ),
    deliveryEstimate: z
      .object({
        minDays: z.number().int('Butun son kiriting.').min(1, 'Kamida 1 kun.').max(120, '120 kundan oshmasin.'),
        maxDays: z.number().int('Butun son kiriting.').min(1, 'Kamida 1 kun.').max(120, '120 kundan oshmasin.'),
      })
      .refine((d) => d.maxDays >= d.minDays, { message: 'Eng koʻp muddat eng kam muddatdan kichik boʻlmasin.', path: ['maxDays'] }),
    featured: z.boolean(),
    newArrival: z.boolean(),
    status: z.enum(['active', 'inactive', 'archived']),
  })
  .superRefine((v, ctx) => {
    if (v.status === 'active' && v.images.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['images'], message: 'Sotuvga chiqarish uchun kamida bitta rasm qoʻshing (yoki qoralama sifatida saqlang).' });
    }
  });

export type ProductField = keyof ProductInput | 'deliveryEstimate.minDays' | 'deliveryEstimate.maxDays';
export type ProductErrors = Partial<Record<ProductField, string>>;

export function validateProductInput(
  input: ProductInput,
  takenSlugs: Iterable<string> = [],
): { ok: true; data: ProductInput } | { ok: false; errors: ProductErrors } {
  const errors: ProductErrors = {};
  const r = productInputSchema.safeParse(input);
  if (!r.success) {
    for (const issue of r.error.issues) {
      const key = (issue.path.length > 1 && issue.path[0] === 'deliveryEstimate'
        ? `deliveryEstimate.${String(issue.path[1])}`
        : String(issue.path[0])) as ProductField;
      if (!errors[key]) errors[key] = issue.message;
    }
  }
  if (!errors.slug && new Set(takenSlugs).has(input.slug.trim())) {
    errors.slug = 'Bu slug boshqa mahsulotda ishlatilgan.';
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  const data = r.success ? r.data : input;
  return { ok: true, data: { ...data, sizes: sortSizes(data.sizes) } as ProductInput };
}
