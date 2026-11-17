import type { OrderService } from './OrderService';
import type { AdminOrderRepository } from './AdminOrderRepository';
import { mockOrderService } from './mock/mockOrderService';
import { mockAdminOrderRepository } from './mock/mockAdminOrderRepository';
import { supabaseEnabled } from '@/services/supabase/client';
import { supabaseAdminOrderRepository, supabaseOrderService } from '@/services/supabase/repositories';

/** Customer-facing order submission (Supabase: the place_order() database function). */
export const orders: OrderService = supabaseEnabled ? supabaseOrderService : mockOrderService;

/** Admin-only order access (Supabase: protected by RLS). */
export const adminOrders: AdminOrderRepository = supabaseEnabled ? supabaseAdminOrderRepository : mockAdminOrderRepository;

export type { OrderService, SubmitOrderResult, SubmittedOrderReceipt } from './OrderService';
export type { AdminOrderRepository } from './AdminOrderRepository';
