import { useCallback, useEffect, useState } from 'react';
import { adminProducts } from '@/services/catalog';
import { PRODUCTS_CHANGED_EVENT } from '@/services/catalog/mock/localProductStore';
import type { Product } from '@/types/catalog';

export function useAdminProducts() {
  const [products, setProducts] = useState<Product[] | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    try {
      setProducts(await adminProducts.listProducts());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, []);

  useEffect(() => {
    reload();
    window.addEventListener(PRODUCTS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(PRODUCTS_CHANGED_EVENT, reload);
  }, [reload]);

  return { products, loading: products === undefined && !error, error, reload };
}
