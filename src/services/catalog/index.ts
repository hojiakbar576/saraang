import type { CatalogRepository } from './CatalogRepository';
import type { AdminProductRepository } from './AdminProductRepository';
import { mockCatalogRepository } from './mock/mockCatalogRepository';
import { mockAdminProductRepository } from './mock/mockAdminProductRepository';
import { supabaseEnabled } from '@/services/supabase/client';
import { supabaseAdminProductRepository, supabaseCatalogRepository } from '@/services/supabase/repositories';

/** Public catalog (active products only). */
export const catalog: CatalogRepository = supabaseEnabled ? supabaseCatalogRepository : mockCatalogRepository;

/** Admin product management (Supabase: protected by RLS + admin allow-list). */
export const adminProducts: AdminProductRepository = supabaseEnabled ? supabaseAdminProductRepository : mockAdminProductRepository;

export type { CatalogRepository, AdminProductRepository };
export type { SaveProductResult, DeleteProductResult } from './AdminProductRepository';
