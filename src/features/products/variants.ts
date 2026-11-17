import type { Product, ProductVariant } from '@/types/catalog';

export function findVariant(product: Product, size: string, colorId: string): ProductVariant | undefined {
  return product.variants.find((v) => v.size === size && v.colorId === colorId);
}

export function isVariantAvailable(product: Product, size: string, colorId: string): boolean {
  return findVariant(product, size, colorId)?.available ?? false;
}

/** A colour is selectable if at least one size is available in it. */
export function isColorAvailable(product: Product, colorId: string): boolean {
  return product.variants.some((v) => v.colorId === colorId && v.available);
}

/**
 * A size is selectable if it is available in the chosen colour, or — when no
 * colour is chosen yet — in at least one colour.
 */
export function isSizeAvailable(product: Product, size: string, colorId: string | null): boolean {
  if (colorId) return isVariantAvailable(product, size, colorId);
  return product.variants.some((v) => v.size === size && v.available);
}

export function hasAnyAvailableVariant(product: Product): boolean {
  return product.variants.some((v) => v.available);
}

/** Default selection: the first available colour, and the size when only one exists. */
export function initialSelection(product: Product): { colorId: string | null; size: string | null } {
  const colorId = product.colorIds.find((c) => isColorAvailable(product, c)) ?? null;
  const onlySize = product.sizes.length === 1 ? product.sizes[0] : null;
  const size = onlySize && colorId && isVariantAvailable(product, onlySize, colorId) ? onlySize : null;
  return { colorId, size };
}
