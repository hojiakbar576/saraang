import { createBrowserRouter, RouterProvider } from 'react-router';
import { StorefrontLayout } from '@/layouts/StorefrontLayout';
import { HomePage } from '@/pages/storefront/HomePage';
import { CollectionPage } from '@/pages/storefront/CollectionPage';
import { ProductPage } from '@/pages/storefront/ProductPage';
import { CartPage } from '@/pages/storefront/CartPage';
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
      { path: 'about', element: <AboutPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // Admin routes (/admin/*) are added in Milestone 3 under a separate layout.
]);

export function App() {
  return (
    <CartProvider>
      <RouterProvider router={router} />
    </CartProvider>
  );
}
