import type { Order } from '@/types/order';

/**
 * DEMO ONLY — orders persisted in this browser's localStorage so the Phase 1
 * admin screens have something to work with. Nothing leaves the device.
 */
const ORDERS_KEY = 'store.demo.orders.v1';
const SEQ_KEY = 'store.demo.orderSeq.v1';
const IDEMPOTENCY_KEY = 'store.demo.orderIdempotency.v1';
const FIRST_NUMBER = 1001;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const localOrderStore = {
  list(): Order[] {
    const data = read<unknown>(ORDERS_KEY, []);
    return Array.isArray(data) ? (data as Order[]) : [];
  },
  saveAll(orders: Order[]) {
    write(ORDERS_KEY, orders);
  },
  nextOrderNumber(): string {
    const n = read<number>(SEQ_KEY, FIRST_NUMBER - 1) + 1;
    write(SEQ_KEY, n);
    return `DEMO-${n}`;
  },
  findByIdempotencyKey(key: string): string | undefined {
    return read<Record<string, string>>(IDEMPOTENCY_KEY, {})[key];
  },
  rememberIdempotencyKey(key: string, orderId: string) {
    const map = read<Record<string, string>>(IDEMPOTENCY_KEY, {});
    map[key] = orderId;
    write(IDEMPOTENCY_KEY, map);
  },
};
