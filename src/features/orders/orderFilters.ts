import type { Order, OrderStatus } from '@/types/order';
import { inRange, type DateRange } from '@/lib/dateRange';

export interface OrderFilters {
  query: string;
  statuses: OrderStatus[];
  range: DateRange;
}

const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ'‘’`]/g, '').trim();

/**
 * Search matches order number, customer name, or phone. Phone matching uses
 * digits only, so "90 123 45 67", "+998901234567" and "1234567" all work.
 */
export function matchesQuery(order: Order, query: string): boolean {
  const q = norm(query);
  if (!q) return true;
  if (norm(order.orderNumber).includes(q) || norm(order.customer.fullName).includes(q)) return true;
  const digits = q.replace(/\D/g, '');
  return digits.length >= 3 && order.customer.phone.replace(/\D/g, '').includes(digits);
}

export function filterOrders(orders: Order[], f: OrderFilters): Order[] {
  return orders
    .filter(
      (o) =>
        matchesQuery(o, f.query) &&
        (!f.statuses.length || f.statuses.includes(o.status)) &&
        inRange(o.createdAt, f.range),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
