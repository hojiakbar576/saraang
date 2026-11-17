import type { CatalogRepository } from '../CatalogRepository';
import { MOCK_PRODUCTS } from '@/data/mock/products';
import { CATEGORIES, COLORS } from '@/data/mock/taxonomy';

/** Small artificial delay so loading states are exercised during development. */
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export const mockCatalogRepository: CatalogRepository = {
  async listActiveProducts() {
    await delay();
    return MOCK_PRODUCTS.filter((p) => p.status === 'active');
  },
  async getActiveProductBySlug(slug) {
    await delay();
    return MOCK_PRODUCTS.find((p) => p.slug === slug && p.status === 'active') ?? null;
  },
  async listCategories() {
    return CATEGORIES;
  },
  async listColors() {
    return COLORS;
  },
};
