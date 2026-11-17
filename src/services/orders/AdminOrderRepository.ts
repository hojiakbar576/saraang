import type { Order, OrderStatus } from '@/types/order';
import type { StatusChangeError, StatusChangeOptions } from '@/features/orders/statusFlow';

export type OrderMutationResult =
  | { ok: true; order: Order }
  | { ok: false; error: StatusChangeError | 'not_found' | 'empty' };

/**
 * Admin-only order access. Phase 2: Supabase queries/RPCs that succeed only for
 * an authenticated admin (enforced by RLS); status changes run in a database
 * function so the order and its history row are written together.
 */
export interface AdminOrderRepository {
  listOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  changeStatus(id: string, to: OrderStatus, opts: StatusChangeOptions): Promise<OrderMutationResult>;
  correctAmountReceived(id: string, amount: number): Promise<OrderMutationResult>;
  addNote(id: string, text: string): Promise<OrderMutationResult>;
  /** Removes local demo orders. Not available for real data. */
  clearDemoOrders(): Promise<void>;
}
