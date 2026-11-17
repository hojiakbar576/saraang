import type { CatalogRepository } from '../CatalogRepository';
import { CATEGORIES, COLORS } from '@/data/mock/taxonomy';
import { localProductStore } from './localProductStore';

/** Small artificial delay so loading states are exercised during development. */
const delay = (ms = 80) => new Promise((r) => setTimeout(r, ms));

export const mockCatalogRepository: CatalogRepository = {
  async listActiveProducts() {
    await delay();
    return (await localProductStore.all()).filter((p) => p.status === 'active');
  },
  async getActiveProductBySlug(slug) {
    await delay();
    return (await localProductStore.all()).find((p) => p.slug === slug && p.status === 'active') ?? null;
  },
  async listCategories() {
    return CATEGORIES;
  },
  async listColors() {
    return COLORS;
  },
};
