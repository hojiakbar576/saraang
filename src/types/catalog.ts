import type { UZS } from '@/lib/money';

export type Gender = 'men' | 'women' | 'unisex';

/**
 * Languages that hold translations of the Uzbek source text. Uzbek itself
 * lives in the main fields (`name`, `description`) and is always present.
 */
export type ContentLang = 'ru' | 'en';
export const CONTENT_LANGS: readonly ContentLang[] = ['ru', 'en'];

export interface ProductText {
  name: string;
  description: string;
}
export type ProductTranslations = Partial<Record<ContentLang, ProductText>>;
/** Translated display names of a category or colour. */
export type NameTranslations = Partial<Record<ContentLang, string>>;

export type CategoryId =
  | 'tshirts'
  | 'shirts'
  | 'knitwear'
  | 'outerwear'
  | 'trousers'
  | 'dresses'
  | 'skirts'
  | 'accessories';

export interface Category {
  id: CategoryId;
  name: string;
  /** Which collections this category appears in. */
  genders: Gender[];
  translations?: NameTranslations;
}

export interface Color {
  id: string;
  name: string;
  hex: string;
  translations?: NameTranslations;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  /** 0 = primary image. */
  position: number;
  /** Provider-specific path used to delete the file (null for external URLs / demo images). */
  storagePath?: string | null;
}

/** One sellable size × colour combination. */
export interface ProductVariant {
  id: string;
  size: string;
  colorId: string;
  available: boolean;
}

export type ProductStatus = 'active' | 'inactive' | 'archived';

export interface DeliveryEstimate {
  minDays: number;
  maxDays: number;
}

export interface Product {
  id: string;
  slug: string;
  /** Uzbek name (source text, required). */
  name: string;
  /** Uzbek description. */
  description: string;
  /** Russian / English text; a missing or empty field falls back to Uzbek. */
  translations?: ProductTranslations;
  price: UZS;
  categoryId: CategoryId;
  gender: Gender;
  /** Ordered list of sizes offered. */
  sizes: string[];
  /** Ordered list of colour ids offered. */
  colorIds: string[];
  variants: ProductVariant[];
  images: ProductImage[];
  deliveryEstimate: DeliveryEstimate;
  featured: boolean;
  newArrival: boolean;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}
