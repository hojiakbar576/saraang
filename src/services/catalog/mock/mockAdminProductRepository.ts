import type { AdminProductRepository } from '../AdminProductRepository';
import type { Product } from '@/types/catalog';
import { buildVariants, validateProductInput, variantKey, type ProductInput } from '@/features/products/admin/productInput';
import { localProductStore, type ProductStore } from './localProductStore';
import { localOrderStore } from '@/services/orders/mock/localOrderStore';
import { imageStorage } from '@/services/storage';

function toProduct(id: string, input: ProductInput, createdAt: string, now: string): Product {
  // Drop availability flags for sizes/colours that were removed.
  const valid = new Set(input.colorIds.flatMap((c) => input.sizes.map((s) => variantKey(s, c))));
  const unavailable = input.unavailable.filter((k) => valid.has(k));
  return {
    id,
    slug: input.slug.trim(),
    name: input.name.trim(),
    description: input.description.trim(),
    price: input.price,
    categoryId: input.categoryId,
    gender: input.gender,
    sizes: input.sizes,
    colorIds: input.colorIds,
    variants: buildVariants(id, { ...input, unavailable }),
    images: input.images.map((img, i) => ({ ...img, position: i })),
    deliveryEstimate: { ...input.deliveryEstimate },
    featured: input.featured,
    newArrival: input.newArrival,
    status: input.status,
    createdAt,
    updatedAt: now,
  };
}

export function createMockAdminProductRepository(
  store: ProductStore,
  isReferencedByOrders: (productId: string) => boolean,
  removeImage: (storagePath: string) => Promise<void> = async () => {},
): AdminProductRepository {
  const newId = () => `p_${crypto.randomUUID().slice(0, 8)}`;

  return {
    async listProducts() {
      return [...(await store.all())].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async getProduct(id) {
      return (await store.all()).find((p) => p.id === id) ?? null;
    },
    async listSlugs() {
      return (await store.all()).map((p) => p.slug);
    },
    async createProduct(input) {
      const all = await store.all();
      const v = validateProductInput(input, all.map((p) => p.slug));
      if (!v.ok) return v;
      const now = new Date().toISOString();
      const product = toProduct(newId(), v.data, now, now);
      await store.save([product, ...all]);
      return { ok: true, product };
    },
    async updateProduct(id, input) {
      const all = await store.all();
      const existing = all.find((p) => p.id === id);
      if (!existing) return { ok: false, errors: { name: 'Mahsulot topilmadi.' } };
      const v = validateProductInput(input, all.filter((p) => p.id !== id).map((p) => p.slug));
      if (!v.ok) return v;
      const product = toProduct(id, v.data, existing.createdAt, new Date().toISOString());
      await store.save(all.map((p) => (p.id === id ? product : p)));
      // Delete stored files of images that were removed from the product.
      const kept = new Set(product.images.map((i) => i.id));
      await Promise.all(
        existing.images.filter((i) => !kept.has(i.id) && i.storagePath).map((i) => removeImage(i.storagePath!)),
      );
      return { ok: true, product };
    },
    async setStatus(id, status) {
      const all = await store.all();
      const existing = all.find((p) => p.id === id);
      if (!existing) return null;
      const updated = { ...existing, status, updatedAt: new Date().toISOString() };
      await store.save(all.map((p) => (p.id === id ? updated : p)));
      return updated;
    },
    async deleteProduct(id) {
      const all = await store.all();
      const existing = all.find((p) => p.id === id);
      if (!existing) return { ok: false, reason: 'not_found' };
      if (isReferencedByOrders(id)) return { ok: false, reason: 'has_orders' };
      await store.save(all.filter((p) => p.id !== id));
      await Promise.all(existing.images.filter((i) => i.storagePath).map((i) => removeImage(i.storagePath!)));
      return { ok: true };
    },
    async importProducts(inputs) {
      const all = await store.all();
      const now = new Date().toISOString();
      const created = inputs.map((input) => toProduct(newId(), input, now, now));
      await store.save([...created, ...all]);
      return created;
    },
  };
}

export const mockAdminProductRepository = createMockAdminProductRepository(
  localProductStore,
  (productId) => localOrderStore.list().some((o) => o.items.some((i) => i.productId === productId)),
  (path) => imageStorage.remove(path),
);
