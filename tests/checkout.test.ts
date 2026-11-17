import { beforeEach, describe, expect, it } from 'vitest';
import { formatLocalPhoneInput, formatUzPhone, normalizeUzPhone } from '@/lib/phone';
import { validateCheckout } from '@/validation/checkout';
import { buildOrder, type BuildOrderContext } from '@/features/orders/buildOrder';
import { MOCK_PRODUCTS } from '@/data/mock/products';
import { COLORS } from '@/data/mock/taxonomy';
import { mockOrderService } from '@/services/orders/mock/mockOrderService';
import { localOrderStore } from '@/services/orders/mock/localOrderStore';
import type { Product } from '@/types/catalog';

const validForm = {
  fullName: '  Aziza   Karimova ',
  phone: '+998 90 123 45 67',
  city: 'Toshkent',
  address: '',
  comment: '',
  privacyConsent: true,
};

describe('phone utils', () => {
  it('normalises common Uzbek formats', () => {
    expect(normalizeUzPhone('+998 (90) 123-45-67')).toBe('+998901234567');
    expect(normalizeUzPhone('901234567')).toBe('+998901234567');
    expect(normalizeUzPhone('998901234567')).toBe('+998901234567');
    expect(normalizeUzPhone('+7 900 123 45 67')).toBeNull();
    expect(normalizeUzPhone('90 123')).toBeNull();
  });

  it('formats for display and while typing', () => {
    expect(formatUzPhone('+998901234567')).toBe('+998 90 123 45 67');
    expect(formatLocalPhoneInput('9012345')).toBe('90 123 45');
    expect(formatLocalPhoneInput('90123456789999')).toBe('90 123 45 67');
  });
});

describe('checkout validation', () => {
  it('accepts a valid form and normalises values', () => {
    const r = validateCheckout(validForm);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.fullName).toBe('Aziza Karimova');
      expect(r.data.phone).toBe('+998901234567');
      expect(r.data.address).toBeNull();
      expect(r.data.city).toBe('Toshkent');
    }
  });

  it('requires name, valid phone and consent', () => {
    const r = validateCheckout({ ...validForm, fullName: ' ', phone: '+998 90 12', privacyConsent: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['fullName', 'phone', 'privacyConsent']);
  });

  it('rejects names without letters and over-long optional fields', () => {
    const r = validateCheckout({ ...validForm, fullName: '123', comment: 'x'.repeat(501) });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.fullName).toBeDefined();
      expect(r.errors.comment).toBeDefined();
    }
  });
});

describe('buildOrder', () => {
  const data = (() => {
    const r = validateCheckout(validForm);
    if (!r.ok) throw new Error('fixture invalid');
    return r.data;
  })();
  let n = 0;
  const ctx = (products: Product[] = MOCK_PRODUCTS): BuildOrderContext => ({
    products,
    colors: COLORS,
    now: '2026-11-17T10:00:00.000Z',
    newId: () => `id_${++n}`,
    orderNumber: 'TEST-1',
    isDemo: true,
  });
  const tee = MOCK_PRODUCTS.find((p) => p.slug === 'oversize-paxta-futbolka')!;
  const coat = MOCK_PRODUCTS.find((p) => p.slug === 'klassik-palto')!;

  it('prices from the catalog, snapshots items and totals in integer UZS', () => {
    const r = buildOrder(
      data,
      [
        { productId: tee.id, size: 'M', colorId: 'white', quantity: 2 },
        { productId: coat.id, size: 'L', colorId: 'beige', quantity: 1 },
      ],
      ctx(),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const { order } = r;
    expect(order.total).toBe(189_000 * 2 + 1_290_000);
    expect(order.status).toBe('new');
    expect(order.statusHistory).toHaveLength(1);
    expect(order.items[0]).toMatchObject({
      productName: tee.name,
      unitPrice: 189_000,
      quantity: 2,
      lineTotal: 378_000,
      size: 'M',
      colorName: 'Oq',
    });
    expect(order.amountReceived).toBeNull();
    expect(order.deliveredAt).toBeNull();
  });

  it('keeps the historical snapshot when the product changes later', () => {
    const products = structuredClone(MOCK_PRODUCTS);
    const r = buildOrder(data, [{ productId: tee.id, size: 'M', colorId: 'white', quantity: 1 }], ctx(products));
    if (!r.ok) throw new Error('expected ok');
    const p = products.find((x) => x.id === tee.id)!;
    p.name = 'Renamed';
    p.price = 1;
    expect(r.order.items[0].productName).toBe(tee.name);
    expect(r.order.items[0].unitPrice).toBe(189_000);
  });

  it('rejects unavailable variants, unknown products and empty carts', () => {
    const r = buildOrder(
      data,
      [
        { productId: tee.id, size: 'S', colorId: 'black', quantity: 1 },
        { productId: 'nope', size: 'M', colorId: 'black', quantity: 1 },
      ],
      ctx(),
    );
    expect(r).toMatchObject({ ok: false, error: { reason: 'unavailable' } });
    if (!r.ok && r.error.reason === 'unavailable') expect(r.error.keys).toHaveLength(2);
    expect(buildOrder(data, [], ctx())).toMatchObject({ ok: false, error: { reason: 'empty' } });
  });

  it('rejects invalid quantities, including duplicates merged above the limit', () => {
    const line = { productId: tee.id, size: 'M', colorId: 'white' };
    expect(buildOrder(data, [{ ...line, quantity: 0 }], ctx()).ok).toBe(false);
    expect(buildOrder(data, [{ ...line, quantity: 1.5 }], ctx()).ok).toBe(false);
    expect(buildOrder(data, [{ ...line, quantity: 6 }, { ...line, quantity: 6 }], ctx()).ok).toBe(false);
  });
});

describe('mock order service', () => {
  beforeEach(() => window.localStorage.clear());
  const tee = MOCK_PRODUCTS.find((p) => p.slug === 'oversize-paxta-futbolka')!;
  const lines = [{ productId: tee.id, size: 'M', colorId: 'white', quantity: 1 }];

  it('stores a demo order with sequential numbers', async () => {
    const a = await mockOrderService.submitOrder({ form: validForm, lines, idempotencyKey: 'k1' });
    const b = await mockOrderService.submitOrder({ form: validForm, lines, idempotencyKey: 'k2' });
    expect(a).toMatchObject({ ok: true, receipt: { orderNumber: 'DEMO-1001', total: 189_000, isDemo: true } });
    expect(b).toMatchObject({ ok: true, receipt: { orderNumber: 'DEMO-1002' } });
    expect(localOrderStore.list()).toHaveLength(2);
  });

  it('does not create a duplicate on a repeated submit', async () => {
    await mockOrderService.submitOrder({ form: validForm, lines, idempotencyKey: 'same' });
    const again = await mockOrderService.submitOrder({ form: validForm, lines, idempotencyKey: 'same' });
    expect(again).toMatchObject({ ok: true, receipt: { orderNumber: 'DEMO-1001' } });
    expect(localOrderStore.list()).toHaveLength(1);
  });

  it('re-validates input and never stores invalid orders', async () => {
    const r = await mockOrderService.submitOrder({ form: { ...validForm, privacyConsent: false }, lines, idempotencyKey: 'x' });
    expect(r).toMatchObject({ ok: false, reason: 'validation' });
    const u = await mockOrderService.submitOrder({
      form: validForm,
      lines: [{ productId: tee.id, size: 'S', colorId: 'black', quantity: 1 }],
      idempotencyKey: 'y',
    });
    expect(u).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(localOrderStore.list()).toHaveLength(0);
  });
});
