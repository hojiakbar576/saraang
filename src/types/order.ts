import type { UZS } from '@/lib/money';
import type { CategoryId } from '@/types/catalog';

export const ORDER_STATUSES = [
  'new',
  'contacted',
  'confirmed',
  'ordered_from_china',
  'in_transit',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderCustomer {
  fullName: string;
  /** Normalised E.164, e.g. +998901234567 */
  phone: string;
  city: string | null;
  address: string | null;
  comment: string | null;
}

/**
 * Snapshot of what was ordered. Copied at order time so later edits to the
 * product (name, price, images) never change historical orders.
 */
export interface OrderItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  /** Category at order time (for analytics). Optional for orders created before it was recorded. */
  categoryId?: CategoryId;
  size: string;
  colorId: string;
  colorName: string;
  unitPrice: UZS;
  quantity: number;
  lineTotal: UZS;
  imageUrl: string | null;
}

export interface OrderStatusChange {
  id: string;
  from: OrderStatus | null;
  to: OrderStatus;
  at: string;
  note: string | null;
}

export interface OrderNote {
  id: string;
  text: string;
  at: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: OrderCustomer;
  items: OrderItem[];
  total: UZS;
  status: OrderStatus;
  /** Set only when the order is delivered; the figure used for revenue. */
  amountReceived: UZS | null;
  deliveredAt: string | null;
  statusHistory: OrderStatusChange[];
  internalNotes: OrderNote[];
  privacyConsentAt: string;
  createdAt: string;
  updatedAt: string;
  /** true for orders created by the Phase 1 local mock — never real business data. */
  isDemo: boolean;
}
