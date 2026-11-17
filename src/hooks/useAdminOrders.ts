import { useCallback, useEffect, useState } from 'react';
import { adminOrders } from '@/services/orders';
import type { Order } from '@/types/order';

export function useAdminOrders() {
  const [orders, setOrders] = useState<Order[] | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    try {
      setOrders(await adminOrders.listOrders());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, []);

  useEffect(() => {
    reload();
    // Pick up orders placed in another tab (mock storage).
    const onStorage = () => reload();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [reload]);

  return { orders, loading: orders === undefined && !error, error, reload };
}
