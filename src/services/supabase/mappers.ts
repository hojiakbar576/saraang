import type { Category, CategoryId, Color, Gender, NameTranslations, Product, ProductStatus, ProductTranslations } from '@/types/catalog';
import type { Order, OrderStatus } from '@/types/order';

// ——— Row shapes returned by our select() calls ———

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  category_id: CategoryId;
  gender: Gender;
  sizes: string[];
  color_ids: string[];
  delivery_min_days: number;
  delivery_max_days: number;
  featured: boolean;
  new_arrival: boolean;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  product_variants: { id: string; size: string; color_id: string; available: boolean }[] | null;
  product_images: { id: string; url: string; storage_path: string | null; alt: string; position: number }[] | null;
  product_translations?: { locale: string; name: string; description: string }[] | null;
}

export const PRODUCT_SELECT =
  'id, slug, name, description, price, category_id, gender, sizes, color_ids, delivery_min_days, delivery_max_days, featured, new_arrival, status, created_at, updated_at, product_variants(id, size, color_id, available), product_images(id, url, storage_path, alt, position), product_translations(locale, name, description)';

function translationsFromRows(rows: ProductRow['product_translations']): ProductTranslations {
  const out: ProductTranslations = {};
  for (const row of rows ?? []) {
    if (row.locale === 'ru' || row.locale === 'en') out[row.locale] = { name: row.name ?? '', description: row.description ?? '' };
  }
  return out;
}

// ——— Taxonomy ———

export interface TaxonomyRow {
  id: string;
  name: string;
  name_ru: string | null;
  name_en: string | null;
}
export const CATEGORY_SELECT = 'id, name, name_ru, name_en, genders';
export const COLOR_SELECT = 'id, name, name_ru, name_en, hex';

function nameTranslations(r: TaxonomyRow): NameTranslations {
  const out: NameTranslations = {};
  if (r.name_ru) out.ru = r.name_ru;
  if (r.name_en) out.en = r.name_en;
  return out;
}

export function categoryFromRow(r: TaxonomyRow & { genders: Gender[] }): Category {
  return { id: r.id as CategoryId, name: r.name, genders: r.genders, translations: nameTranslations(r) };
}

export function colorFromRow(r: TaxonomyRow & { hex: string }): Color {
  return { id: r.id, name: r.name, hex: r.hex, translations: nameTranslations(r) };
}

export function productFromRow(r: ProductRow): Product {
  const order = (size: string, color: string) => r.color_ids.indexOf(color) * 1000 + r.sizes.indexOf(size);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    translations: translationsFromRows(r.product_translations),
    price: Number(r.price),
    categoryId: r.category_id,
    gender: r.gender,
    sizes: r.sizes,
    colorIds: r.color_ids,
    variants: (r.product_variants ?? [])
      .map((v) => ({ id: v.id, size: v.size, colorId: v.color_id, available: v.available }))
      .sort((a, b) => order(a.size, a.colorId) - order(b.size, b.colorId)),
    images: (r.product_images ?? [])
      .map((i) => ({ id: i.id, url: i.url, alt: i.alt, position: i.position, storagePath: i.storage_path }))
      .sort((a, b) => a.position - b.position),
    deliveryEstimate: { minDays: r.delivery_min_days, maxDays: r.delivery_max_days },
    featured: r.featured,
    newArrival: r.new_arrival,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  city: string | null;
  address: string | null;
  customer_comment: string | null;
  total: number;
  status: OrderStatus;
  amount_received: number | null;
  delivered_at: string | null;
  privacy_consent_at: string;
  created_at: string;
  updated_at: string;
  order_items: {
    id: string;
    product_id: string;
    variant_id: string | null;
    product_name: string;
    product_slug: string;
    category_id: CategoryId | null;
    size: string;
    color_id: string;
    color_name: string;
    unit_price: number;
    quantity: number;
    line_total: number;
    image_url: string | null;
  }[] | null;
  order_status_history: { id: string; from_status: OrderStatus | null; to_status: OrderStatus; note: string | null; changed_at: string }[] | null;
  order_notes: { id: string; text: string; created_at: string }[] | null;
}

export const ORDER_SELECT =
  'id, order_number, customer_name, customer_phone, city, address, customer_comment, total, status, amount_received, delivered_at, privacy_consent_at, created_at, updated_at, order_items(id, product_id, variant_id, product_name, product_slug, category_id, size, color_id, color_name, unit_price, quantity, line_total, image_url), order_status_history(id, from_status, to_status, note, changed_at), order_notes(id, text, created_at)';

export function orderFromRow(r: OrderRow): Order {
  return {
    id: r.id,
    orderNumber: r.order_number,
    customer: {
      fullName: r.customer_name,
      phone: r.customer_phone,
      city: r.city,
      address: r.address,
      comment: r.customer_comment,
    },
    items: (r.order_items ?? []).map((i) => ({
      id: i.id,
      productId: i.product_id,
      variantId: i.variant_id ?? '',
      productName: i.product_name,
      productSlug: i.product_slug,
      categoryId: i.category_id ?? undefined,
      size: i.size,
      colorId: i.color_id,
      colorName: i.color_name,
      unitPrice: Number(i.unit_price),
      quantity: i.quantity,
      lineTotal: Number(i.line_total),
      imageUrl: i.image_url,
    })),
    total: Number(r.total),
    status: r.status,
    amountReceived: r.amount_received == null ? null : Number(r.amount_received),
    deliveredAt: r.delivered_at,
    statusHistory: (r.order_status_history ?? [])
      .map((h) => ({ id: h.id, from: h.from_status, to: h.to_status, at: h.changed_at, note: h.note }))
      .sort((a, b) => a.at.localeCompare(b.at)),
    internalNotes: (r.order_notes ?? [])
      .map((n) => ({ id: n.id, text: n.text, at: n.created_at }))
      .sort((a, b) => a.at.localeCompare(b.at)),
    privacyConsentAt: r.privacy_consent_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    isDemo: false,
  };
}
