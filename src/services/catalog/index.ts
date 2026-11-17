import type { CatalogRepository } from './CatalogRepository';
import { mockCatalogRepository } from './mock/mockCatalogRepository';

/** The active catalog implementation. Phase 2: return the Supabase repository here. */
export const catalog: CatalogRepository = mockCatalogRepository;
export type { CatalogRepository };
