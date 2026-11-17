import type { OrderService } from './OrderService';
import { mockOrderService } from './mock/mockOrderService';

/** Active order submission implementation. Phase 2: Supabase server-side function. */
export const orders: OrderService = mockOrderService;
export type { OrderService, SubmitOrderResult, SubmittedOrderReceipt } from './OrderService';
