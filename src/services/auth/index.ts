import type { AuthService } from './AuthService';
import { createMockAuthService } from './mock/mockAuthService';
import { supabaseEnabled } from '@/services/supabase/client';
import { supabaseAuthService } from '@/services/supabase/repositories';
import { loginToEmail } from '@/features/admin/adminLogin';

const mockLogin = import.meta.env.VITE_MOCK_ADMIN_LOGIN;

/**
 * Supabase Auth when configured. Otherwise the development-only mock, which is
 * enabled only in `vite dev` and refuses to work in production builds.
 */
export const auth: AuthService = supabaseEnabled
  ? supabaseAuthService
  : createMockAuthService({
      enabled: import.meta.env.DEV,
      email: mockLogin ? (loginToEmail(mockLogin) ?? undefined) : undefined,
      password: import.meta.env.VITE_MOCK_ADMIN_PASSWORD,
    });

export type { AuthService, AdminSession, SignInResult } from './AuthService';
