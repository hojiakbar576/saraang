import { describe, expect, it } from 'vitest';
import { computeAnalytics, formatCompactUZS, makeBuckets, niceMax } from '@/features/analytics/analytics';
import { rangeForPreset } from '@/lib/dateRange';
import type { Order, OrderItem, OrderStatus } from '@/types/order';
import type { CategoryId } from '@/types/catalog';

const now = new Date(2026, 10, 17, 12, 0);
const day = (d: number, h = 10) => new Date(2026, 10, d, h, 0).toISOString();

function item(productId: string, name: string, qty: number, price: number, categoryId?: CategoryId): OrderItem {
  return {
    id: `${productId}-${qty}`,
    productId,
    variantId: `${productId}_v`,
    productName: name,
    productSlug: name,
    categoryId,
    size: 'M',
    colorId: 'black',
    colorName: 'Qora',
    unitPrice: price,
    quantity: qty,
    lineTotal: price * qty,
    imageUrl: null,
  };
}

let n = 0;
function order(status: OrderStatus, createdDay: number, items: OrderItem[], delivered?: { day: number; amount: number }): Order {
  const total = items.reduce((s, i) => s + i.lineTotal, 0);
  return {
    id: `o${++n}`,
    orderNumber: `T-${n}`,
    customer: { fullName: 'X', phone: '+998901234567', city: null, address: null, comment: null },
    items,
    total,
    status,
    amountReceived: delivered ? delivered.amount : null,
    deliveredAt: delivered ? day(delivered.day) : null,
    statusHistory: [],
    internalNotes: [],
    privacyConsentAt: day(createdDay),
    createdAt: day(createdDay),
    updatedAt: day(createdDay),
    isDemo: true,
  };
}

const ctx = {
  categoryName: (id: CategoryId) => ({ tshirts: 'Futbolkalar', dresses: 'Ayollar koʻylaklari' })[id as 'tshirts'] ?? id,
  categoryOfProduct: (id: string) => (id === 'legacy' ? ('dresses' as CategoryId) : undefined),
  now,
};

const orders: Order[] = [
  order('delivered', 3, [item('tee', 'Futbolka', 2, 189_000, 'tshirts')], { day: 12, amount: 378_000 }),
  order('delivered', 10, [item('dress', 'Koʻylak', 1, 529_000, 'dresses')], { day: 16, amount: 500_000 }), // partial
  order('cancelled', 15, [item('tee', 'Futbolka', 5, 189_000, 'tshirts')]),
  order('confirmed', 16, [item('tee', 'Futbolka', 1, 189_000, 'tshirts'), item('legacy', 'Eski', 3, 100_000)]),
  order('delivered', 20 - 30, [item('tee', 'Futbolka', 1, 189_000, 'tshirts')], { day: -12, amount: 189_000 }), // October
];

describe('computeAnalytics', () => {
  const r = computeAnalytics(orders, rangeForPreset('month', now), ctx);

  it('counts only received amounts of orders delivered in the period, by delivery date', () => {
    expect(r.revenue.total).toBe(878_000);
    expect(r.revenue.deliveredOrders).toBe(2);
    expect(r.revenue.average).toBe(439_000);
    expect(r.revenue.series.find((b) => b.key === '2026-11-12')?.value).toBe(378_000);
    expect(r.revenue.series.find((b) => b.key === '2026-11-16')?.value).toBe(500_000);
    expect(r.revenue.series.reduce((s, b) => s + b.value, 0)).toBe(r.revenue.total);
  });

  it('counts orders by creation date and summarises outcomes', () => {
    expect(r.orders.total).toBe(4);
    expect(r.orders.series.find((b) => b.key === '2026-11-16')?.value).toBe(1);
    expect(r.outcomes).toEqual({ delivered: 2, inProgress: 1, cancelled: 1 });
  });

  it('ranks best sellers by units, excluding cancelled orders', () => {
    expect(r.topProducts.map((p) => [p.name, p.units])).toEqual([
      ['Futbolka', 3],
      ['Eski', 3],
      ['Koʻylak', 1],
    ]);
    expect(r.topCategories.map((c) => [c.name, c.units])).toEqual([
      ['Ayollar koʻylaklari', 4],
      ['Futbolkalar', 3],
    ]);
  });

  it('uses daily buckets for short ranges and monthly for long ones', () => {
    expect(r.granularity).toBe('day');
    expect(r.revenue.series).toHaveLength(17);
    const year = computeAnalytics(orders, rangeForPreset('year', now), ctx);
    expect(year.granularity).toBe('month');
    expect(year.revenue.series).toHaveLength(11);
    expect(year.revenue.total).toBe(1_067_000);
  });

  it('handles no data without NaN', () => {
    const empty = computeAnalytics([], rangeForPreset('7d', now), ctx);
    expect(empty.revenue).toMatchObject({ total: 0, average: null, deliveredOrders: 0 });
    expect(empty.revenue.series).toHaveLength(7);
    expect(empty.topProducts).toEqual([]);
    const all = computeAnalytics([], rangeForPreset('all', now), ctx);
    expect(all.orders.series.length).toBeGreaterThan(0);
  });
});

describe('axis helpers', () => {
  it('builds buckets across month boundaries', () => {
    const { buckets } = makeBuckets(new Date(2026, 9, 30), new Date(2026, 10, 2));
    expect(buckets.map((b) => b.key)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
  });
  it('rounds axis maxima and formats compact soʻm', () => {
    expect(niceMax(878_000)).toBe(1_000_000);
    expect(niceMax(130_000)).toBe(200_000);
    expect(niceMax(0)).toBe(1);
    expect(formatCompactUZS(850_000)).toBe('850 ming');
    expect(formatCompactUZS(1_250_000)).toBe('1,3 mln');
    expect(formatCompactUZS(0)).toBe('0');
  });
});
