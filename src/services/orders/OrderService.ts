import type { CartLine } from '@/features/cart/cart';
import type { CheckoutErrors } from '@/validation/checkout';

export interface SubmitOrderInput {
  /** Raw form values; the service re-validates them. */
  form: unknown;
  lines: CartLine[];
  /** Generated once per checkout attempt so a double-submit cannot create two orders. */
  idempotencyKey: string;
}

export interface SubmittedOrderReceipt {
  orderNumber: string;
  total: number;
  phone: string;
  itemCount: number;
  isDemo: boolean;
}

export type SubmitOrderResult =
  | { ok: true; receipt: SubmittedOrderReceipt }
  | { ok: false; reason: 'validation'; errors: CheckoutErrors }
  | { ok: false; reason: 'empty' }
  | { ok: false; reason: 'unavailable'; keys: string[] }
  | { ok: false; reason: 'failed' };

/**
 * Public (customer-facing) order submission.
 * Phase 1: local mock. Phase 2: a Supabase Edge Function / RPC that performs
 * the same validation and pricing server-side; customers never get direct
 * table access.
 */
export interface OrderService {
  submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult>;
}
