import type { UZS } from '@/lib/money';

export type Gender = 'men' | 'women' | 'unisex';

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
}

export interface Color {
  id: string;
  name: string;
  hex: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  /** 0 = primary image. */
  position: number;
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
  name: string;
  description: string;
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
