import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { computeOverview } from '@/features/analytics/overview';
import { createMockAuthService } from '@/services/auth/mock/mockAuthService';
import { AdminAuthProvider, RequireAdmin } from '@/features/admin/AdminAuthContext';
import { safeAdminRedirect } from '@/pages/admin/AdminLoginPage';
import type { Order, OrderStatus } from '@/types/order';

function order(status: OrderStatus, total: number, amountReceived: number | null = null): Order {
  return {
    id: `${status}-${total}-${Math.random()}`,
    orderNumber: 'X',
    customer: { fullName: 'A', phone: '+998901234567', city: null, address: null, comment: null },
    items: [],
    total,
    status,
    amountReceived,
    deliveredAt: status === 'delivered' ? '2026-11-17T00:00:00.000Z' : null,
    statusHistory: [],
    internalNotes: [],
    privacyConsentAt: '2026-11-17T00:00:00.000Z',
    createdAt: '2026-11-17T00:00:00.000Z',
    updatedAt: '2026-11-17T00:00:00.000Z',
    isDemo: true,
  };
}

describe('computeOverview (revenue rules)', () => {
  it('counts only received amounts of delivered orders as revenue', () => {
    const o = computeOverview([
      order('delivered', 500_000, 500_000),
      order('delivered', 300_000, 250_000), // partial payment received
      order('confirmed', 900_000),
      order('in_transit', 400_000),
      order('cancelled', 700_000),
      order('new', 100_000),
    ]);
    expect(o.deliveredRevenue).toBe(750_000);
    expect(o.totalOrders).toBe(6);
    expect(o.deliveredOrders).toBe(2);
    expect(o.pendingOrders).toBe(3);
    expect(o.cancelledOrders).toBe(1);
    expect(o.averageDeliveredOrderValue).toBe(375_000);
    expect(o.byStatus.in_transit).toBe(1);
  });

  it('handles no orders and flags delivered orders missing an amount', () => {
    expect(computeOverview([])).toMatchObject({ deliveredRevenue: 0, totalOrders: 0, averageDeliveredOrderValue: null });
    const o = computeOverview([order('delivered', 100_000, null)]);
    expect(o.deliveredRevenue).toBe(0);
    expect(o.deliveredWithoutAmount).toBe(1);
    expect(o.averageDeliveredOrderValue).toBeNull();
  });
});

describe('mock auth service', () => {
  beforeEach(() => window.sessionStorage.clear());
  const config = { enabled: true, email: 'admin@example.test', password: 'pw-test' };

  it('signs in with correct credentials only', async () => {
    const auth = createMockAuthService(config);
    expect(await auth.signIn('admin@example.test', 'wrong')).toEqual({ ok: false, reason: 'invalid_credentials' });
    expect(await auth.getSession()).toBeNull();
    const r = await auth.signIn(' ADMIN@example.test ', 'pw-test');
    expect(r.ok).toBe(true);
    expect(await auth.getSession()).toMatchObject({ email: 'admin@example.test', isMock: true });
    await auth.signOut();
    expect(await auth.getSession()).toBeNull();
  });

  it('is unavailable when disabled (production builds) or not configured', async () => {
    expect(await createMockAuthService({ ...config, enabled: false }).signIn(config.email, config.password)).toEqual({
      ok: false,
      reason: 'unavailable',
    });
    expect(await createMockAuthService({ enabled: true, email: undefined, password: undefined }).signIn('a', 'b')).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('expires sessions and rate-limits repeated failures', async () => {
    let now = Date.parse('2026-11-17T10:00:00Z');
    const auth = createMockAuthService({ ...config, now: () => now });
    await auth.signIn(config.email, config.password);
    now += 9 * 3_600_000;
    expect(await auth.getSession()).toBeNull();

    for (let i = 0; i < 5; i++) await auth.signIn(config.email, 'bad');
    expect(await auth.signIn(config.email, config.password)).toEqual({ ok: false, reason: 'rate_limited' });
    now += 61_000;
    expect((await auth.signIn(config.email, config.password)).ok).toBe(true);
  });
});

describe('admin access protection', () => {
  beforeEach(() => window.sessionStorage.clear());
  const config = { enabled: true, email: 'admin@example.test', password: 'pw-test' };

  function renderGuarded(service: ReturnType<typeof createMockAuthService>) {
    render(
      <MemoryRouter initialEntries={['/admin/orders']}>
        <AdminAuthProvider service={service}>
          <Routes>
            <Route path="/admin/login" element={<p>login screen</p>} />
            <Route
              path="/admin/orders"
              element={
                <RequireAdmin>
                  <p>secret orders</p>
                </RequireAdmin>
              }
            />
          </Routes>
        </AdminAuthProvider>
      </MemoryRouter>,
    );
  }

  it('redirects anonymous visitors to the login page', async () => {
    renderGuarded(createMockAuthService(config));
    expect(await screen.findByText('login screen')).toBeInTheDocument();
    expect(screen.queryByText('secret orders')).not.toBeInTheDocument();
  });

  it('shows admin content to a signed-in admin', async () => {
    const service = createMockAuthService(config);
    await service.signIn(config.email, config.password);
    renderGuarded(service);
    expect(await screen.findByText('secret orders')).toBeInTheDocument();
  });

  it('only redirects back into the admin area after login', () => {
    expect(safeAdminRedirect('/admin/orders?status=new')).toBe('/admin/orders?status=new');
    expect(safeAdminRedirect('https://evil.example')).toBe('/admin');
    expect(safeAdminRedirect('//evil.example/admin')).toBe('/admin');
    expect(safeAdminRedirect('/admin/login')).toBe('/admin');
    expect(safeAdminRedirect(null)).toBe('/admin');
  });
});
