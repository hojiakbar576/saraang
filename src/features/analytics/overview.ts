import type { Order, OrderStatus } from '@/types/order';
import { sum } from '@/lib/money';

/** Statuses that are neither delivered nor cancelled. */
export const PENDING_STATUSES: readonly OrderStatus[] = [
  'new',
  'contacted',
  'confirmed',
  'ordered_from_china',
  'in_transit',
];

export interface Overview {
  /** Sum of amountReceived for delivered orders only (integer UZS). */
  deliveredRevenue: number;
  totalOrders: number;
  deliveredOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  /** Rounded to whole so'm; null when nothing has been delivered. */
  averageDeliveredOrderValue: number | null;
  /** Delivered orders that are missing a received amount (data problem to surface). */
  deliveredWithoutAmount: number;
  byStatus: Record<OrderStatus, number>;
}

/**
 * Business rule: revenue = money actually received for delivered orders.
 * Cancelled and not-yet-delivered orders never count as revenue.
 */
export function computeOverview(orders: Order[]): Overview {
  const byStatus = {
    new: 0,
    contacted: 0,
    confirmed: 0,
    ordered_from_china: 0,
    in_transit: 0,
    delivered: 0,
    cancelled: 0,
  } satisfies Record<OrderStatus, number>;
  for (const o of orders) byStatus[o.status] += 1;

  const delivered = orders.filter((o) => o.status === 'delivered');
  const withAmount = delivered.filter((o) => o.amountReceived != null);
  const deliveredRevenue = sum(withAmount.map((o) => o.amountReceived as number));

  return {
    deliveredRevenue,
    totalOrders: orders.length,
    deliveredOrders: delivered.length,
    pendingOrders: orders.filter((o) => PENDING_STATUSES.includes(o.status)).length,
    cancelledOrders: byStatus.cancelled,
    averageDeliveredOrderValue: withAmount.length ? Math.round(deliveredRevenue / withAmount.length) : null,
    deliveredWithoutAmount: delivered.length - withAmount.length,
    byStatus,
  };
}
