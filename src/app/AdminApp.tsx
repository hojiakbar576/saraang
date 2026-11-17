import { Navigate, Route, Routes } from 'react-router';
import { AdminAuthProvider, RequireAdmin } from '@/features/admin/AdminAuthContext';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { ComingSoonPage, SettingsPage } from '@/pages/admin/SectionPages';
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
          <Route path="products" element={<ComingSoonPage title={t.admin.nav.products} description={t.admin.comingSoon.products} />} />
          <Route path="orders" element={<ComingSoonPage title={t.admin.nav.orders} description={t.admin.comingSoon.orders} />} />
          <Route path="analytics" element={<ComingSoonPage title={t.admin.nav.analytics} description={t.admin.comingSoon.analytics} />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}
