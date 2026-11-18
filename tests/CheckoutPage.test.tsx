import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { CartProvider } from '@/features/cart/CartContext';
import { CheckoutPage } from '@/pages/storefront/CheckoutPage';
import { OrderSuccessPage } from '@/pages/storefront/OrderSuccessPage';
import { MOCK_PRODUCTS } from '@/data/mock/products';
import { localOrderStore } from '@/services/orders/mock/localOrderStore';
import { t } from '@/i18n';

const tee = MOCK_PRODUCTS.find((p) => p.slug === 'oversize-paxta-futbolka')!;

function LocationProbe() {
  const { pathname } = useLocation();
  return <span data-testid="path">{pathname}</span>;
}

function renderCheckout() {
  render(
    <CartProvider>
      <MemoryRouter initialEntries={['/checkout']}>
        <LocationProbe />
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order/success" element={<OrderSuccessPage />} />
          <Route path="/cart" element={<p>cart page</p>} />
        </Routes>
      </MemoryRouter>
    </CartProvider>,
  );
}

describe('<CheckoutPage />', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('redirects to the cart when the cart is empty', async () => {
    renderCheckout();
    expect(await screen.findByText('cart page')).toBeInTheDocument();
  });

  it('shows errors, then creates a demo order and clears the cart', async () => {
    window.localStorage.setItem(
      'store.cart.v1',
      JSON.stringify({ lines: [{ productId: tee.id, size: 'M', colorId: 'white', quantity: 2 }] }),
    );
    const user = userEvent.setup();
    renderCheckout();

    const submit = await screen.findByRole('button', { name: new RegExp(t('checkout.submit')) });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);
    expect(await screen.findByText(t('checkout.errors.nameRequired'))).toBeInTheDocument();
    expect(screen.getByText(t('checkout.errors.phoneInvalid'))).toBeInTheDocument();
    expect(localOrderStore.list()).toHaveLength(0);

    await user.type(screen.getByLabelText(t('checkout.fullName')), 'Aziza Karimova');
    await user.type(screen.getByLabelText(t('checkout.phone')), '901234567');
    await user.click(screen.getByLabelText(t('checkout.consent')));
    await user.click(submit);

    expect(await screen.findByText('DEMO-1001', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/order/success');
    expect(screen.getByText(t('success.demoBanner'))).toBeInTheDocument();
    const stored = localOrderStore.list();
    expect(stored).toHaveLength(1);
    expect(stored[0].customer.phone).toBe('+998901234567');
    expect(stored[0].total).toBe(378_000);
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem('store.cart.v1')!).lines).toHaveLength(0));
  });
});
