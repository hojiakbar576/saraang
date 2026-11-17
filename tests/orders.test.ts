import { describe, expect, it } from 'vitest';
import {
  applyAmountCorrection,
  applyNote,
  applyStatusChange,
  canTransition,
  TRANSITIONS,
} from '@/features/orders/statusFlow';
import { filterOrders, matchesQuery } from '@/features/orders/orderFilters';
import { computeOverview } from '@/features/analytics/overview';
import { inRange, rangeForPreset, rangeFromInputs } from '@/lib/dateRange';
import { ORDER_STATUSES, type Order, type OrderStatus } from '@/types/order';

let seq = 0;
const ctx = (now = '2026-11-17T10:00:00.000Z') => ({ now, newId: () => `id${++seq}` });

function order(patch: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    orderNumber: 'DEMO-1001',
    customer: { fullName: 'Aziza Karimova', phone: '+998901234567', city: 'Toshkent', address: null, comment: null },
    items: [],
    total: 718_000,
    status: 'new',
    amountReceived: null,
    deliveredAt: null,
    statusHistory: [{ id: 'h0', from: null, to: 'new', at: '2026-11-17T09:00:00.000Z', note: null }],
    internalNotes: [],
    privacyConsentAt: '2026-11-17T09:00:00.000Z',
    createdAt: '2026-11-17T09:00:00.000Z',
    updatedAt: '2026-11-17T09:00:00.000Z',
    isDemo: true,
    ...patch,
  };
}

function walk(o: Order, steps: OrderStatus[], amount = 718_000): Order {
  return steps.reduce((acc, s) => {
    const r = applyStatusChange(acc, s, { amountReceived: s === 'delivered' ? amount : undefined }, ctx());
    if (!r.ok) throw new Error(`${acc.status} → ${s}: ${r.error}`);
    return r.order;
  }, o);
}

describe('order status transitions', () => {
  it('follows the main path and records history with timestamps', () => {
    const o = walk(order(), ['contacted', 'confirmed', 'ordered_from_china', 'in_transit', 'delivered']);
    expect(o.status).toBe('delivered');
    expect(o.statusHistory.map((h) => h.to)).toEqual(['new', 'contacted', 'confirmed', 'ordered_from_china', 'in_transit', 'delivered']);
    expect(o.statusHistory.at(-1)).toMatchObject({ from: 'in_transit', to: 'delivered', at: '2026-11-17T10:00:00.000Z' });
    expect(o.deliveredAt).toBe('2026-11-17T10:00:00.000Z');
    expect(o.amountReceived).toBe(718_000);
  });

  it('blocks skipping steps and changing finished orders arbitrarily', () => {
    expect(canTransition('new', 'delivered')).toBe(false);
    expect(canTransition('confirmed', 'in_transit')).toBe(false);
    expect(canTransition('delivered', 'cancelled')).toBe(false);
    expect(canTransition('cancelled', 'delivered')).toBe(false);
    expect(applyStatusChange(order(), 'delivered', { amountReceived: 1 }, ctx())).toEqual({ ok: false, error: 'not_allowed' });
  });

  it('lets every open status be cancelled, and reopens cancelled orders as new', () => {
    for (const s of ORDER_STATUSES.filter((x) => x !== 'delivered' && x !== 'cancelled')) {
      expect(canTransition(s, 'cancelled')).toBe(true);
    }
    expect(TRANSITIONS.cancelled).toEqual(['new']);
  });

  it('requires a valid non-negative whole amount when delivering', () => {
    const inTransit = order({ status: 'in_transit' });
    expect(applyStatusChange(inTransit, 'delivered', {}, ctx())).toEqual({ ok: false, error: 'amount_required' });
    expect(applyStatusChange(inTransit, 'delivered', { amountReceived: -1 }, ctx())).toEqual({ ok: false, error: 'invalid_amount' });
    expect(applyStatusChange(inTransit, 'delivered', { amountReceived: 10.5 }, ctx())).toEqual({ ok: false, error: 'invalid_amount' });
    const partial = applyStatusChange(inTransit, 'delivered', { amountReceived: 650_000, note: 'Chegirma berildi' }, ctx());
    expect(partial.ok && partial.order.amountReceived).toBe(650_000);
    expect(partial.ok && partial.order.statusHistory.at(-1)?.note).toBe('Chegirma berildi');
    const zero = applyStatusChange(inTransit, 'delivered', { amountReceived: 0 }, ctx());
    expect(zero.ok).toBe(true);
  });

  it('removes a corrected delivery from revenue', () => {
    const delivered = walk(order({ status: 'in_transit' }), ['delivered']);
    expect(computeOverview([delivered]).deliveredRevenue).toBe(718_000);
    const back = walk(delivered, ['in_transit']);
    expect(back.amountReceived).toBeNull();
    expect(back.deliveredAt).toBeNull();
    expect(computeOverview([back]).deliveredRevenue).toBe(0);
  });

  it('never counts cancelled or confirmed orders as revenue', () => {
    const cancelled = walk(order(), ['cancelled']);
    const confirmed = walk(order({ id: 'o2' }), ['confirmed']);
    const o = computeOverview([cancelled, confirmed]);
    expect(o.deliveredRevenue).toBe(0);
    expect(o.cancelledOrders).toBe(1);
    expect(o.pendingOrders).toBe(1);
  });

  it('corrects the received amount only on delivered orders and logs it', () => {
    const delivered = walk(order({ status: 'in_transit' }), ['delivered']);
    const r = applyAmountCorrection(delivered, 700_000, ctx());
    expect(r.ok && r.order.amountReceived).toBe(700_000);
    expect(r.ok && r.order.internalNotes).toHaveLength(1);
    expect(applyAmountCorrection(order(), 1, ctx())).toEqual({ ok: false, error: 'not_allowed' });
    expect(applyAmountCorrection(delivered, -5, ctx())).toEqual({ ok: false, error: 'invalid_amount' });
  });

  it('adds internal notes and rejects empty or oversized ones', () => {
    const r = applyNote(order(), '  Mijoz 18:00 dan keyin  ', ctx());
    expect(r.ok && r.order.internalNotes[0].text).toBe('Mijoz 18:00 dan keyin');
    expect(applyNote(order(), '   ', ctx())).toEqual({ ok: false, error: 'empty' });
    expect(applyNote(order(), 'x'.repeat(1001), ctx())).toEqual({ ok: false, error: 'note_too_long' });
  });
});

describe('order search and filters', () => {
  const a = order();
  const b = order({ id: 'o2', orderNumber: 'DEMO-1002', status: 'cancelled', createdAt: '2026-10-01T09:00:00.000Z', customer: { ...a.customer, fullName: 'Jasur Oʻlmasov', phone: '+998935550011' } });

  it('matches order number, name and phone digits in any format', () => {
    expect(matchesQuery(a, 'demo-1001')).toBe(true);
    expect(matchesQuery(a, 'aziza')).toBe(true);
    expect(matchesQuery(a, '90 123 45 67')).toBe(true);
    expect(matchesQuery(a, '+998 (90) 123')).toBe(true);
    expect(matchesQuery(b, "o'lmasov")).toBe(true);
    expect(matchesQuery(a, '55')).toBe(false);
  });

  it('filters by status and date range', () => {
    const range = rangeFromInputs('2026-11-01', '2026-11-30');
    expect(filterOrders([a, b], { query: '', statuses: [], range }).map((o) => o.id)).toEqual(['o1']);
    expect(filterOrders([a, b], { query: '', statuses: ['cancelled'], range: { from: null, to: null } }).map((o) => o.id)).toEqual(['o2']);
  });
});

describe('date ranges', () => {
  const now = new Date(2026, 10, 17, 15, 30);
  it('builds inclusive local-day presets', () => {
    const today = rangeForPreset('today', now);
    expect(inRange(new Date(2026, 10, 17, 0, 0).toISOString(), today)).toBe(true);
    expect(inRange(new Date(2026, 10, 17, 23, 59).toISOString(), today)).toBe(true);
    expect(inRange(new Date(2026, 10, 16, 23, 59).toISOString(), today)).toBe(false);
    const week = rangeForPreset('7d', now);
    expect(inRange(new Date(2026, 10, 11, 0, 1).toISOString(), week)).toBe(true);
    expect(inRange(new Date(2026, 10, 10, 23, 59).toISOString(), week)).toBe(false);
    expect(rangeForPreset('month', now).from).toEqual(new Date(2026, 10, 1));
  });
  it('treats the custom end date as inclusive and ignores invalid input', () => {
    const r = rangeFromInputs('2026-11-01', '2026-11-17');
    expect(inRange(new Date(2026, 10, 17, 22, 0).toISOString(), r)).toBe(true);
    expect(rangeFromInputs('', 'nope')).toEqual({ from: null, to: null });
  });
});
