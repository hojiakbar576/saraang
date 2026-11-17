import type { Product } from '@/types/catalog';
import { kv, type KeyValueStore } from '@/lib/kvStore';
import { MOCK_PRODUCTS } from '@/data/mock/products';
import { PRODUCTS_CHANGED_EVENT } from '@/services/events';

/**
 * DEMO ONLY — the Phase 1 product "database", shared by the storefront and the
 * admin so edits made in the admin show up in the shop (same browser only).
 * Seeded with the demo catalog on first use. Replaced by Supabase in Phase 2.
 */
const KEY = 'products.v1';

const CHANGE_EVENT = PRODUCTS_CHANGED_EVENT;

export function createProductStore(store: KeyValueStore, seed: Product[] = MOCK_PRODUCTS) {
  let cache: Product[] | null = null;

  async function load(): Promise<Product[]> {
    if (cache) return cache;
    const saved = await store.get<Product[]>(KEY);
    if (Array.isArray(saved)) {
      cache = saved;
    } else {
      cache = structuredClone(seed);
      await store.set(KEY, cache);
    }
    return cache;
  }

  return {
    async all(): Promise<Product[]> {
      return structuredClone(await load());
    },
    async save(products: Product[]): Promise<void> {
      cache = structuredClone(products);
      await store.set(KEY, cache);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    async reset(): Promise<void> {
      await this.save(seed);
    },
    /** Drop the in-memory cache (e.g. another tab changed the data). */
    invalidate() {
      cache = null;
    },
  };
}

export type ProductStore = ReturnType<typeof createProductStore>;
export const localProductStore = createProductStore(kv);
export { PRODUCTS_CHANGED_EVENT };
