import type { CategoryId } from '@/types/catalog';
import type { Order } from '@/types/order';
import { inRange, type DateRange } from '@/lib/dateRange';
import { sum } from '@/lib/money';
import { PENDING_STATUSES } from './overview';

/**
 * Analytics definitions (shown to the admins on the page):
 * - Revenue: amount received on DELIVERED orders, dated by when they were delivered.
 * - Orders: orders placed in the period, dated by when they were created.
 * - Outcomes: current status of orders placed in the period.
 * - Top products / categories: units in orders placed in the period, excluding cancelled orders.
 * All money is integer so'm; no floating-point sums.
 */

export type Granularity = 'day' | 'month';

export interface Bucket {
  key: string;
  start: Date;
  value: number;
}

export interface TopEntry {
  id: string;
  name: string;
  units: number;
  /** Sum of order-time line totals (integer so'm). Not revenue — orders may not be delivered yet. */
  orderValue: number;
}

export interface AnalyticsResult {
  granularity: Granularity;
  revenue: { total: number; deliveredOrders: number; average: number | null; series: Bucket[] };
  orders: { total: number; series: Bucket[] };
  outcomes: { delivered: number; inProgress: number; cancelled: number };
  topProducts: TopEntry[];
  topCategories: TopEntry[];
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const MAX_DAILY_BUCKETS = 62;

/** Resolves an open-ended range ("all time") to concrete bounds based on the data. */
export function resolveRange(range: DateRange, orders: Order[], now = new Date()): { from: Date; to: Date } {
  const to = range.to ?? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  let from = range.from;
  if (!from) {
    const times = orders.flatMap((o) => [Date.parse(o.createdAt), o.deliveredAt ? Date.parse(o.deliveredAt) : NaN]).filter((t) => !Number.isNaN(t));
    from = times.length ? startOfDay(new Date(Math.min(...times))) : new Date(to.getFullYear(), to.getMonth(), to.getDate() - 7);
  }
  return { from, to };
}

export function makeBuckets(from: Date, to: Date): { granularity: Granularity; buckets: Bucket[] } {
  const days = Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
  const granularity: Granularity = days <= MAX_DAILY_BUCKETS ? 'day' : 'month';
  const buckets: Bucket[] = [];
  if (granularity === 'day') {
    for (let d = startOfDay(from); d < to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      buckets.push({ key: dayKey(d), start: d, value: 0 });
    }
  } else {
    for (let d = startOfMonth(from); d < to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      buckets.push({ key: monthKey(d), start: d, value: 0 });
    }
  }
  return { granularity, buckets };
}

function bucketKey(iso: string, g: Granularity): string {
  const d = new Date(iso);
  return g === 'day' ? dayKey(d) : monthKey(d);
}

export function computeAnalytics(
  orders: Order[],
  range: DateRange,
  ctx: { categoryName: (id: CategoryId) => string; categoryOfProduct: (productId: string) => CategoryId | undefined; now?: Date },
): AnalyticsResult {
  const { from, to } = resolveRange(range, orders, ctx.now);
  const bounded: DateRange = { from, to };
  const { granularity, buckets } = makeBuckets(from, to);

  // Revenue — delivered orders, by delivery date, using the amount actually received.
  const delivered = orders.filter(
    (o) => o.status === 'delivered' && o.deliveredAt && o.amountReceived != null && inRange(o.deliveredAt, bounded),
  );
  const revenueSeries = buckets.map((b) => ({ ...b }));
  const revenueIndex = new Map(revenueSeries.map((b) => [b.key, b]));
  for (const o of delivered) {
    const b = revenueIndex.get(bucketKey(o.deliveredAt!, granularity));
    if (b) b.value = sum([b.value, o.amountReceived!]);
  }
  const revenueTotal = sum(delivered.map((o) => o.amountReceived!));

  // Orders placed in the period.
  const placed = orders.filter((o) => inRange(o.createdAt, bounded));
  const orderSeries = buckets.map((b) => ({ ...b }));
  const orderIndex = new Map(orderSeries.map((b) => [b.key, b]));
  for (const o of placed) {
    const b = orderIndex.get(bucketKey(o.createdAt, granularity));
    if (b) b.value += 1;
  }

  // Best sellers — non-cancelled orders placed in the period.
  const products = new Map<string, TopEntry>();
  const categories = new Map<string, TopEntry>();
  for (const o of placed) {
    if (o.status === 'cancelled') continue;
    for (const it of o.items) {
      const p = products.get(it.productId) ?? { id: it.productId, name: it.productName, units: 0, orderValue: 0 };
      p.units += it.quantity;
      p.orderValue = sum([p.orderValue, it.lineTotal]);
      products.set(it.productId, p);

      const catId = it.categoryId ?? ctx.categoryOfProduct(it.productId);
      if (catId) {
        const c = categories.get(catId) ?? { id: catId, name: ctx.categoryName(catId), units: 0, orderValue: 0 };
        c.units += it.quantity;
        c.orderValue = sum([c.orderValue, it.lineTotal]);
        categories.set(catId, c);
      }
    }
  }
  const rank = (a: TopEntry, b: TopEntry) => b.units - a.units || b.orderValue - a.orderValue || a.name.localeCompare(b.name);

  return {
    granularity,
    revenue: {
      total: revenueTotal,
      deliveredOrders: delivered.length,
      average: delivered.length ? Math.round(revenueTotal / delivered.length) : null,
      series: revenueSeries,
    },
    orders: { total: placed.length, series: orderSeries },
    outcomes: {
      delivered: placed.filter((o) => o.status === 'delivered').length,
      inProgress: placed.filter((o) => PENDING_STATUSES.includes(o.status)).length,
      cancelled: placed.filter((o) => o.status === 'cancelled').length,
    },
    topProducts: [...products.values()].sort(rank).slice(0, 5),
    topCategories: [...categories.values()].sort(rank).slice(0, 5),
  };
}

// ——— Formatting helpers for axes ———

/** 850000 → "850 ming", 1290000 → "1,3 mln" — compact Uzbek axis labels. */
export function formatCompactUZS(v: number): string {
  const abs = Math.abs(v);
  const trim = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',');
  if (abs >= 1e9) return `${trim(v / 1e9)} mlrd`;
  if (abs >= 1e6) return `${trim(v / 1e6)} mln`;
  if (abs >= 1e3) return `${trim(v / 1e3)} ming`;
  return String(v);
}

/** A "nice" axis maximum (1, 2, 2.5, 5 × 10^n) at or above `max`. */
export function niceMax(max: number): number {
  if (max <= 0) return 1;
  const exp = Math.floor(Math.log10(max));
  const base = 10 ** exp;
  for (const m of [1, 2, 2.5, 5, 10]) if (m * base >= max) return m * base;
  return 10 * base;
}
