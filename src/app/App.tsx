import { createBrowserRouter, RouterProvider } from 'react-router';
import { StorefrontLayout } from '@/layouts/StorefrontLayout';
import { HomePage } from '@/pages/storefront/HomePage';
import { CollectionPage } from '@/pages/storefront/CollectionPage';
import { ProductPage } from '@/pages/storefront/ProductPage';
import { CartPage } from '@/pages/storefront/CartPage';
import { CheckoutPage } from '@/pages/storefront/CheckoutPage';
import { OrderSuccessPage } from '@/pages/storefront/OrderSuccessPage';
import { AboutPage, ContactPage, NotFoundPage } from '@/pages/storefront/InfoPages';
import { CartProvider } from '@/features/cart/CartContext';

const router = createBrowserRouter([
  {
    element: <StorefrontLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'men', element: <CollectionPage key="men" scope="men" /> },
      { path: 'women', element: <CollectionPage key="women" scope="women" /> },
      { path: 'new', element: <CollectionPage key="new" scope="new" /> },
      { path: 'search', element: <CollectionPage key="all" scope="all" /> },
      { path: 'product/:slug', element: <ProductPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'order/success', element: <OrderSuccessPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: 'admin/*',
    // Admin code is split into its own chunk and loaded only when /admin is visited.
    lazy: async () => ({ Component: (await import('./AdminApp')).AdminApp }),
  },
]);

export function App() {
  return (
    <CartProvider>
      <RouterProvider router={router} />
    </CartProvider>
  );
}
