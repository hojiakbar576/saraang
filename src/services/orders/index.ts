import type { OrderService } from './OrderService';
import type { AdminOrderRepository } from './AdminOrderRepository';
import { mockOrderService } from './mock/mockOrderService';
import { mockAdminOrderRepository } from './mock/mockAdminOrderRepository';

/** Customer-facing order submission. Phase 2: Supabase server-side function. */
export const orders: OrderService = mockOrderService;

/** Admin-only order access. Phase 2: Supabase queries protected by RLS. */
export const adminOrders: AdminOrderRepository = mockAdminOrderRepository;

export type { OrderService, SubmitOrderResult, SubmittedOrderReceipt } from './OrderService';
export type { AdminOrderRepository } from './AdminOrderRepository';
