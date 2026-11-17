import type { Order, OrderStatus } from '@/types/order';

/**
 * Allowed status changes. The main path moves forward one step at a time;
 * each step can also go back one step to correct a mistake. Any open order can
 * be cancelled, a cancelled order can be reopened as "new", and a delivered
 * order can be moved back to "in transit" (which clears the received amount).
 */
export const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ['contacted', 'confirmed', 'cancelled'],
  contacted: ['new', 'confirmed', 'cancelled'],
  confirmed: ['contacted', 'ordered_from_china', 'cancelled'],
  ordered_from_china: ['confirmed', 'in_transit', 'cancelled'],
  in_transit: ['ordered_from_china', 'delivered', 'cancelled'],
  delivered: ['in_transit'],
  cancelled: ['new'],
};

/** The "happy path" next step, highlighted in the UI. */
export const NEXT_STEP: Partial<Record<OrderStatus, OrderStatus>> = {
  new: 'contacted',
  contacted: 'confirmed',
  confirmed: 'ordered_from_china',
  ordered_from_china: 'in_transit',
  in_transit: 'delivered',
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export type StatusChangeError = 'not_allowed' | 'amount_required' | 'invalid_amount' | 'note_too_long';

export interface StatusChangeOptions {
  /** Required when moving to "delivered": the amount actually received (integer so'm, ≥ 0). */
  amountReceived?: number | null;
  note?: string | null;
}

export const MAX_NOTE_LENGTH = 1000;

function validAmount(n: unknown): n is number {
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
}

export function applyStatusChange(
  order: Order,
  to: OrderStatus,
  opts: StatusChangeOptions,
  ctx: { now: string; newId: () => string },
): { ok: true; order: Order } | { ok: false; error: StatusChangeError } {
  if (!canTransition(order.status, to)) return { ok: false, error: 'not_allowed' };
  const note = opts.note?.trim() || null;
  if (note && note.length > MAX_NOTE_LENGTH) return { ok: false, error: 'note_too_long' };

  let amountReceived = order.amountReceived;
  let deliveredAt = order.deliveredAt;
  if (to === 'delivered') {
    if (opts.amountReceived == null) return { ok: false, error: 'amount_required' };
    if (!validAmount(opts.amountReceived)) return { ok: false, error: 'invalid_amount' };
    amountReceived = opts.amountReceived;
    deliveredAt = ctx.now;
  } else if (order.status === 'delivered') {
    // Leaving "delivered" (correction): the order no longer counts as revenue.
    amountReceived = null;
    deliveredAt = null;
  }

  return {
    ok: true,
    order: {
      ...order,
      status: to,
      amountReceived,
      deliveredAt,
      updatedAt: ctx.now,
      statusHistory: [...order.statusHistory, { id: ctx.newId(), from: order.status, to, at: ctx.now, note }],
    },
  };
}

/** Correct the received amount of an already delivered order. */
export function applyAmountCorrection(
  order: Order,
  amount: number,
  ctx: { now: string; newId: () => string },
): { ok: true; order: Order } | { ok: false; error: StatusChangeError } {
  if (order.status !== 'delivered') return { ok: false, error: 'not_allowed' };
  if (!validAmount(amount)) return { ok: false, error: 'invalid_amount' };
  return {
    ok: true,
    order: {
      ...order,
      amountReceived: amount,
      updatedAt: ctx.now,
      internalNotes: [
        ...order.internalNotes,
        { id: ctx.newId(), text: `Olingan summa oʻzgartirildi: ${order.amountReceived ?? '—'} → ${amount} soʻm`, at: ctx.now },
      ],
    },
  };
}

export function applyNote(
  order: Order,
  text: string,
  ctx: { now: string; newId: () => string },
): { ok: true; order: Order } | { ok: false; error: 'empty' | 'note_too_long' } {
  const t = text.trim();
  if (!t) return { ok: false, error: 'empty' };
  if (t.length > MAX_NOTE_LENGTH) return { ok: false, error: 'note_too_long' };
  return {
    ok: true,
    order: { ...order, updatedAt: ctx.now, internalNotes: [...order.internalNotes, { id: ctx.newId(), text: t, at: ctx.now }] },
  };
}
