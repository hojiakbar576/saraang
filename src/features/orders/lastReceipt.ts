import type { SubmittedOrderReceipt } from '@/services/orders';

/** Keeps the latest receipt for this tab so the success page survives a refresh. */
const KEY = 'store.lastReceipt.v1';

export function saveLastReceipt(r: SubmittedOrderReceipt) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

export function readLastReceipt(): SubmittedOrderReceipt | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as Partial<SubmittedOrderReceipt>;
    return typeof r.orderNumber === 'string' && typeof r.total === 'number' && typeof r.phone === 'string'
      ? (r as SubmittedOrderReceipt)
      : null;
  } catch {
    return null;
  }
}
