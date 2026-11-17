import type { Color, Product } from '@/types/catalog';
import type { Order, OrderItem } from '@/types/order';
import type { CheckoutData } from '@/validation/checkout';
import { MAX_LINE_QUANTITY, lineKey, type CartLine } from '@/features/cart/cart';
import { findVariant } from '@/features/products/variants';
import { multiply, sum } from '@/lib/money';

export type BuildOrderError =
  | { reason: 'empty' }
  | { reason: 'invalid_quantity'; key: string }
  | { reason: 'unavailable'; keys: string[] };

export interface BuildOrderContext {
  products: Product[];
  colors: Color[];
  now: string;
  newId: () => string;
  orderNumber: string;
  isDemo: boolean;
}

/**
 * Turns validated checkout data + cart references into an order.
 * Prices, names and availability come from the catalog — never from the
 * client — and are snapshotted into the order items.
 */
export function buildOrder(
  data: CheckoutData,
  lines: CartLine[],
  ctx: BuildOrderContext,
): { ok: true; order: Order } | { ok: false; error: BuildOrderError } {
  if (lines.length === 0) return { ok: false, error: { reason: 'empty' } };

  // Merge duplicate references defensively.
  const merged = new Map<string, CartLine>();
  for (const l of lines) {
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > MAX_LINE_QUANTITY) {
      return { ok: false, error: { reason: 'invalid_quantity', key: lineKey(l) } };
    }
    const key = lineKey(l);
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, quantity: prev.quantity + l.quantity } : { ...l });
  }

  const unavailable: string[] = [];
  const items: OrderItem[] = [];
  for (const [key, l] of merged) {
    const product = ctx.products.find((p) => p.id === l.productId && p.status === 'active');
    const variant = product && findVariant(product, l.size, l.colorId);
    const color = ctx.colors.find((c) => c.id === l.colorId);
    if (!product || !variant || !variant.available || !color) {
      unavailable.push(key);
      continue;
    }
    if (l.quantity > MAX_LINE_QUANTITY) return { ok: false, error: { reason: 'invalid_quantity', key } };
    const primary = [...product.images].sort((a, b) => a.position - b.position)[0];
    items.push({
      id: ctx.newId(),
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      productSlug: product.slug,
      categoryId: product.categoryId,
      size: variant.size,
      colorId: color.id,
      colorName: color.name,
      unitPrice: product.price,
      quantity: l.quantity,
      lineTotal: multiply(product.price, l.quantity),
      imageUrl: primary?.url ?? null,
    });
  }
  if (unavailable.length) return { ok: false, error: { reason: 'unavailable', keys: unavailable } };

  const order: Order = {
    id: ctx.newId(),
    orderNumber: ctx.orderNumber,
    customer: {
      fullName: data.fullName,
      phone: data.phone,
      city: data.city,
      address: data.address,
      comment: data.comment,
    },
    items,
    total: sum(items.map((i) => i.lineTotal)),
    status: 'new',
    amountReceived: null,
    deliveredAt: null,
    statusHistory: [{ id: ctx.newId(), from: null, to: 'new', at: ctx.now, note: null }],
    internalNotes: [],
    privacyConsentAt: ctx.now,
    createdAt: ctx.now,
    updatedAt: ctx.now,
    isDemo: ctx.isDemo,
  };
  return { ok: true, order };
}
