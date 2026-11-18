import { z } from 'zod';
import type { CategoryId, ContentLang, Gender, Product, ProductImage, ProductStatus, ProductText, ProductVariant } from '@/types/catalog';
import { CATEGORIES, COLORS, SIZE_ORDER } from '@/data/mock/taxonomy';
import { msg, t } from '@/i18n';
import { SLUG_PATTERN, slugify, uniqueSlug } from './slug';

/** Russian and English text as edited in the form (always present, may be empty). */
export type TranslationsInput = Record<ContentLang, ProductText>;

/** What the admin edits. Variants are derived from sizes × colours minus `unavailable`. */
export interface ProductInput {
  /** Uzbek name (required). */
  name: string;
  slug: string;
  /** Uzbek description. */
  description: string;
  /** Russian / English name and description. Empty = falls back to Uzbek. */
  translations: TranslationsInput;
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

export const emptyTranslations = (): TranslationsInput => ({
  ru: { name: '', description: '' },
  en: { name: '', description: '' },
});

export const DEFAULT_PRODUCT_INPUT: ProductInput = {
  name: '',
  slug: '',
  description: '',
  translations: emptyTranslations(),
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
    translations: {
      ru: { name: p.translations?.ru?.name ?? '', description: p.translations?.ru?.description ?? '' },
      en: { name: p.translations?.en?.name ?? '', description: p.translations?.en?.description ?? '' },
    },
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

/** Translations to store on a product: languages with neither name nor description are dropped. */
export function productTranslationsFromInput(tr: TranslationsInput): Product['translations'] {
  const out: NonNullable<Product['translations']> = {};
  for (const l of ['ru', 'en'] as const) {
    const name = tr[l].name.trim();
    const description = tr[l].description.trim();
    if (name || description) out[l] = { name, description };
  }
  return out;
}

/**
 * Duplicate: copies description, category, gender, delivery, sizes, colours,
 * availability, translations and flags; gives a new name/slug, no photos, and
 * saves as a draft so it is not published until the admin adds photos and checks the price.
 */
export function duplicateInput(p: Product, takenSlugs: Iterable<string>): ProductInput {
  const suffix = t('admin.productForm.copySuffix', { lng: 'uz' });
  const name = `${p.name} (${suffix})`;
  const base = inputFromProduct(p);
  const copyName = (n: string, lang: ContentLang) => (n ? `${n} (${t('admin.productForm.copySuffix', { lng: lang })})` : '');
  return {
    ...base,
    name,
    slug: uniqueSlug(slugify(name), takenSlugs),
    translations: {
      ru: { ...base.translations.ru, name: copyName(base.translations.ru.name, 'ru') },
      en: { ...base.translations.en, name: copyName(base.translations.en.name, 'en') },
    },
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
// Messages are message codes (msg) translated when displayed.

export const MIN_PRICE = 1_000;
export const MAX_PRICE = 1_000_000_000;

const categoryIds = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];
const colorIds = new Set(COLORS.map((c) => c.id));

/** Optional translated name: empty, or 2–120 characters. */
const translatedName = z
  .string()
  .trim()
  .max(120, msg('validation.nameMax'))
  .refine((v) => v === '' || v.length >= 2, msg('validation.nameMin'));
const translatedText = z.object({
  name: translatedName,
  description: z.string().trim().max(4000, msg('validation.descriptionMax')),
});

export const productInputSchema = z
  .object({
    name: z.string().trim().min(2, msg('validation.nameMin')).max(120, msg('validation.nameMax')),
    slug: z
      .string()
      .trim()
      .min(2, msg('validation.slugMin'))
      .max(80, msg('validation.slugMax'))
      .regex(SLUG_PATTERN, msg('validation.slugPattern')),
    description: z.string().trim().max(4000, msg('validation.descriptionMax')),
    translations: z.object({ ru: translatedText, en: translatedText }),
    price: z
      .number({ invalid_type_error: msg('validation.priceRequired') })
      .int(msg('validation.priceInt'))
      .min(MIN_PRICE, msg('validation.priceMin', { min: MIN_PRICE }))
      .max(MAX_PRICE, msg('validation.priceMax')),
    categoryId: z.enum(categoryIds, { errorMap: () => ({ message: msg('validation.category') }) }),
    gender: z.enum(['men', 'women', 'unisex'], { errorMap: () => ({ message: msg('validation.gender') }) }),
    sizes: z
      .array(z.string().trim().min(1).max(20))
      .min(1, msg('validation.sizesMin'))
      .refine((a) => new Set(a).size === a.length, msg('validation.sizesUnique')),
    colorIds: z
      .array(z.string())
      .min(1, msg('validation.colorsMin'))
      .refine((a) => a.every((c) => colorIds.has(c)), msg('validation.colorUnknown'))
      .refine((a) => new Set(a).size === a.length, msg('validation.colorsUnique')),
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
        minDays: z.number().int(msg('validation.integer')).min(1, msg('validation.daysMin')).max(120, msg('validation.daysMax')),
        maxDays: z.number().int(msg('validation.integer')).min(1, msg('validation.daysMin')).max(120, msg('validation.daysMax')),
      })
      .refine((d) => d.maxDays >= d.minDays, { message: msg('validation.daysOrder'), path: ['maxDays'] }),
    featured: z.boolean(),
    newArrival: z.boolean(),
    status: z.enum(['active', 'inactive', 'archived']),
  })
  .superRefine((v, ctx) => {
    if (v.status === 'active' && v.images.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['images'], message: msg('validation.imagesRequired') });
    }
  });

export type ProductField =
  | keyof ProductInput
  | 'deliveryEstimate.minDays'
  | 'deliveryEstimate.maxDays'
  | `translations.${ContentLang}.name`
  | `translations.${ContentLang}.description`;
/** Field → message code. Render with translateMsg(). */
export type ProductErrors = Partial<Record<ProductField, string>>;

export function validateProductInput(
  input: ProductInput,
  takenSlugs: Iterable<string> = [],
): { ok: true; data: ProductInput } | { ok: false; errors: ProductErrors } {
  const errors: ProductErrors = {};
  // Older stored drafts may not have translations yet.
  const normalized: ProductInput = { ...input, translations: input.translations ?? emptyTranslations() };
  const r = productInputSchema.safeParse(normalized);
  if (!r.success) {
    for (const issue of r.error.issues) {
      const [head, second, third] = issue.path.map(String);
      const key = (
        head === 'deliveryEstimate' && second
          ? `deliveryEstimate.${second}`
          : head === 'translations' && second && third
            ? `translations.${second}.${third}`
            : head
      ) as ProductField;
      if (!errors[key]) errors[key] = issue.message;
    }
  }
  if (!errors.slug && new Set(takenSlugs).has(normalized.slug.trim())) {
    errors.slug = msg('validation.slugTaken');
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  const data = (r.success ? r.data : normalized) as ProductInput;
  return { ok: true, data: { ...data, sizes: sortSizes(data.sizes) } };
}
