import type { Category, Color, Product } from '@/types/catalog';

/**
 * Data-access contract for the public catalog. Phase 1 uses a local mock
 * implementation; Phase 2 swaps in a Supabase implementation with the same shape.
 * Storefront methods only ever return products with status "active".
 */
export interface CatalogRepository {
  listActiveProducts(): Promise<Product[]>;
  getActiveProductBySlug(slug: string): Promise<Product | null>;
  listCategories(): Promise<Category[]>;
  listColors(): Promise<Color[]>;
}
