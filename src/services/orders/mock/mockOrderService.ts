import type { OrderService, SubmittedOrderReceipt } from '../OrderService';
import type { Order } from '@/types/order';
import { catalog } from '@/services/catalog';
import { validateCheckout } from '@/validation/checkout';
import { buildOrder } from '@/features/orders/buildOrder';
import { localOrderStore } from './localOrderStore';

const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));

function receipt(order: Order): SubmittedOrderReceipt {
  return {
    orderNumber: order.orderNumber,
    total: order.total,
    phone: order.customer.phone,
    itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
    isDemo: order.isDemo,
  };
}

/** Phase 1 mock: validates, prices from the catalog and stores the order locally. */
export const mockOrderService: OrderService = {
  async submitOrder({ form, lines, idempotencyKey }) {
    await delay();
    try {
      const existingId = localOrderStore.findByIdempotencyKey(idempotencyKey);
      if (existingId) {
        const existing = localOrderStore.list().find((o) => o.id === existingId);
        if (existing) return { ok: true, receipt: receipt(existing) };
      }

      const v = validateCheckout(form);
      if (!v.ok) return { ok: false, reason: 'validation', errors: v.errors };

      const [products, colors] = await Promise.all([catalog.listActiveProducts(), catalog.listColors()]);
      const built = buildOrder(v.data, lines, {
        products,
        colors,
        now: new Date().toISOString(),
        newId: () => crypto.randomUUID(),
        orderNumber: '',
        isDemo: true,
      });
      if (!built.ok) {
        if (built.error.reason === 'empty') return { ok: false, reason: 'empty' };
        if (built.error.reason === 'unavailable') return { ok: false, reason: 'unavailable', keys: built.error.keys };
        return { ok: false, reason: 'failed' };
      }

      // Allocate the number only once the order is known to be valid.
      const order: Order = { ...built.order, orderNumber: localOrderStore.nextOrderNumber() };
      localOrderStore.saveAll([order, ...localOrderStore.list()]);
      localOrderStore.rememberIdempotencyKey(idempotencyKey, order.id);
      return { ok: true, receipt: receipt(order) };
    } catch {
      return { ok: false, reason: 'failed' };
    }
  },
};
