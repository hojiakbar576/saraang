import type { Order } from '@/types/order';

/**
 * Admin-only order access. Phase 2: Supabase queries that succeed only for an
 * authenticated admin (enforced by RLS). Extended with updates in Milestone 5.
 */
export interface AdminOrderRepository {
  listOrders(): Promise<Order[]>;
  /** Removes local demo orders. Not available for real data. */
  clearDemoOrders(): Promise<void>;
}
