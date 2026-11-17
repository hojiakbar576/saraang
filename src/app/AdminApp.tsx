import { Navigate, Route, Routes } from 'react-router';
import { AdminAuthProvider, RequireAdmin } from '@/features/admin/AdminAuthContext';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { ComingSoonPage, SettingsPage } from '@/pages/admin/SectionPages';
import { ProductsListPage } from '@/pages/admin/ProductsListPage';
import { ProductFormPage } from '@/pages/admin/ProductFormPage';
import { ProductImportPage } from '@/pages/admin/ProductImportPage';
import { OrdersListPage } from '@/pages/admin/OrdersListPage';
import { OrderDetailPage } from '@/pages/admin/OrderDetailPage';
import { t } from '@/i18n';

/**
 * Admin area (mounted at /admin/*). Loaded as a separate chunk so customers never
 * download admin code. The UI guard is convenience only; real protection comes
 * from Supabase Auth + Row Level Security in Phase 2.
 */
export function AdminApp() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsListPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/import" element={<ProductImportPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />
          <Route path="orders" element={<OrdersListPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="analytics" element={<ComingSoonPage title={t.admin.nav.analytics} description={t.admin.comingSoon.analytics} />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}
