import type { CatalogRepository } from './CatalogRepository';
import type { AdminProductRepository } from './AdminProductRepository';
import { mockCatalogRepository } from './mock/mockCatalogRepository';
import { mockAdminProductRepository } from './mock/mockAdminProductRepository';

/** Public catalog (active products only). Phase 2: Supabase implementation. */
export const catalog: CatalogRepository = mockCatalogRepository;

/** Admin product management. Phase 2: Supabase implementation protected by RLS. */
export const adminProducts: AdminProductRepository = mockAdminProductRepository;

export type { CatalogRepository, AdminProductRepository };
export type { SaveProductResult, DeleteProductResult } from './AdminProductRepository';
