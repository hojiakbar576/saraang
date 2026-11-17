import type { AdminOrderRepository, OrderMutationResult } from '../AdminOrderRepository';
import type { Order } from '@/types/order';
import { applyAmountCorrection, applyNote, applyStatusChange, type StatusChangeError } from '@/features/orders/statusFlow';
import { localOrderStore } from './localOrderStore';

import { ORDERS_CHANGED_EVENT } from '@/services/events';
export { ORDERS_CHANGED_EVENT };

const ctx = () => ({ now: new Date().toISOString(), newId: () => crypto.randomUUID() });

function mutate(
  id: string,
  fn: (o: Order) => { ok: true; order: Order } | { ok: false; error: StatusChangeError | 'empty' },
): OrderMutationResult {
  const all = localOrderStore.list();
  const existing = all.find((o) => o.id === id);
  if (!existing) return { ok: false, error: 'not_found' };
  const r = fn(existing);
  if (!r.ok) return r;
  localOrderStore.saveAll(all.map((o) => (o.id === id ? r.order : o)));
  window.dispatchEvent(new Event(ORDERS_CHANGED_EVENT));
  return { ok: true, order: r.order };
}

export const mockAdminOrderRepository: AdminOrderRepository = {
  async listOrders() {
    return [...localOrderStore.list()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getOrder(id) {
    return localOrderStore.list().find((o) => o.id === id) ?? null;
  },
  async changeStatus(id, to, opts) {
    return mutate(id, (o) => applyStatusChange(o, to, opts, ctx()));
  },
  async correctAmountReceived(id, amount) {
    return mutate(id, (o) => applyAmountCorrection(o, amount, ctx()));
  },
  async addNote(id, text) {
    return mutate(id, (o) => applyNote(o, text, ctx()));
  },
  async clearDemoOrders() {
    localOrderStore.saveAll(localOrderStore.list().filter((o) => !o.isDemo));
    window.dispatchEvent(new Event(ORDERS_CHANGED_EVENT));
  },
};
