import { describe, expect, it } from 'vitest';
import { orderFromRow, productFromRow, type OrderRow, type ProductRow } from '@/services/supabase/mappers';
import { errorCode, supabaseEnabled } from '@/services/supabase/client';
import { computeOverview } from '@/features/analytics/overview';

const productRow: ProductRow = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'paxta-futbolka',
  name: 'Paxta futbolka',
  description: 'Tavsif',
  price: 189000,
  category_id: 'tshirts',
  gender: 'men',
  sizes: ['S', 'M'],
  color_ids: ['white', 'black'],
  delivery_min_days: 14,
  delivery_max_days: 21,
  featured: true,
  new_arrival: false,
  status: 'active',
  created_at: '2026-11-17T10:00:00Z',
  updated_at: '2026-11-17T11:00:00Z',
  product_variants: [
    { id: 'v4', size: 'M', color_id: 'black', available: false },
    { id: 'v1', size: 'S', color_id: 'white', available: true },
    { id: 'v3', size: 'S', color_id: 'black', available: true },
    { id: 'v2', size: 'M', color_id: 'white', available: true },
  ],
  product_images: [
    { id: 'i2', url: 'https://x/2.webp', storage_path: 'products/2.webp', alt: '', position: 1 },
    { id: 'i1', url: 'https://x/1.webp', storage_path: 'products/1.webp', alt: 'a', position: 0 },
  ],
};

describe('Supabase row mapping', () => {
  it('maps products with ordered variants and images', () => {
    const p = productFromRow(productRow);
    expect(p.variants.map((v) => v.id)).toEqual(['v1', 'v2', 'v3', 'v4']);
    expect(p.images.map((i) => i.id)).toEqual(['i1', 'i2']);
    expect(p.images[0].storagePath).toBe('products/1.webp');
    expect(p).toMatchObject({ categoryId: 'tshirts', colorIds: ['white', 'black'], newArrival: false, deliveryEstimate: { minDays: 14, maxDays: 21 } });
  });

  it('maps orders (bigint strings → numbers) and keeps revenue rules intact', () => {
    const row = {
      id: 'o1',
      order_number: 'YB-1001',
      customer_name: 'Aziza',
      customer_phone: '+998901234567',
      city: null,
      address: null,
      customer_comment: null,
      total: '907000',
      status: 'delivered',
      amount_received: '850000',
      delivered_at: '2026-11-17T12:00:00Z',
      privacy_consent_at: '2026-11-17T10:00:00Z',
      created_at: '2026-11-17T10:00:00Z',
      updated_at: '2026-11-17T12:00:00Z',
      order_items: [
        { id: 'it1', product_id: 'p', variant_id: null, product_name: 'X', product_slug: 'x', category_id: null, size: 'M', color_id: 'black', color_name: 'Qora', unit_price: '189000', quantity: 2, line_total: '378000', image_url: null },
      ],
      order_status_history: [
        { id: 'h2', from_status: 'in_transit', to_status: 'delivered', note: null, changed_at: '2026-11-17T12:00:00Z' },
        { id: 'h1', from_status: null, to_status: 'new', note: null, changed_at: '2026-11-17T10:00:00Z' },
      ],
      order_notes: [],
    } as unknown as OrderRow;
    const o = orderFromRow(row);
    expect(o.total).toBe(907000);
    expect(o.amountReceived).toBe(850000);
    expect(o.items[0]).toMatchObject({ unitPrice: 189000, lineTotal: 378000, variantId: '', categoryId: undefined });
    expect(o.statusHistory.map((h) => h.id)).toEqual(['h1', 'h2']);
    expect(o.isDemo).toBe(false);
    expect(computeOverview([o]).deliveredRevenue).toBe(850000);
  });
});

describe('Supabase helpers', () => {
  it('extracts codes raised by SQL functions', () => {
    expect(errorCode({ message: 'validation:phone' })).toBe('validation:phone');
    expect(errorCode({ message: 'unavailable' })).toBe('unavailable');
    expect(errorCode({ message: 'duplicate key value violates unique constraint', code: '23505' })).toBe('23505');
    expect(errorCode(null)).toBe('');
  });

  it('stays on demo data when Supabase is not configured', () => {
    expect(supabaseEnabled).toBe(false);
  });
});
