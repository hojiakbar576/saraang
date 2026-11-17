import type { AdminOrderRepository } from '../AdminOrderRepository';
import { localOrderStore } from './localOrderStore';

export const mockAdminOrderRepository: AdminOrderRepository = {
  async listOrders() {
    return [...localOrderStore.list()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async clearDemoOrders() {
    localOrderStore.saveAll(localOrderStore.list().filter((o) => !o.isDemo));
  },
};
