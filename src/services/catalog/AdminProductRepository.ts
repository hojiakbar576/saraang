import type { Product, ProductStatus } from '@/types/catalog';
import type { ProductErrors, ProductInput } from '@/features/products/admin/productInput';

export type SaveProductResult = { ok: true; product: Product } | { ok: false; errors: ProductErrors };

export type DeleteProductResult = { ok: true } | { ok: false; reason: 'not_found' | 'has_orders' };

/**
 * Admin product management. Phase 2: Supabase tables (products, product_images,
 * product_variants) writable only by authenticated admins via RLS.
 */
export interface AdminProductRepository {
  listProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  listSlugs(): Promise<string[]>;
  createProduct(input: ProductInput): Promise<SaveProductResult>;
  updateProduct(id: string, input: ProductInput): Promise<SaveProductResult>;
  setStatus(id: string, status: ProductStatus): Promise<Product | null>;
  /** Hard delete — refused when any order references the product (archive it instead). */
  deleteProduct(id: string): Promise<DeleteProductResult>;
  /** Creates many products at once (CSV import). Inputs must already be validated. */
  importProducts(inputs: ProductInput[]): Promise<Product[]>;
}
