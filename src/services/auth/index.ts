import type { AuthService } from './AuthService';
import { createMockAuthService } from './mock/mockAuthService';
import { supabaseEnabled } from '@/services/supabase/client';
import { supabaseAuthService } from '@/services/supabase/repositories';

/**
 * Supabase Auth when configured. Otherwise the development-only mock, which is
 * enabled only in `vite dev` and refuses to work in production builds.
 */
export const auth: AuthService = supabaseEnabled
  ? supabaseAuthService
  : createMockAuthService({
      enabled: import.meta.env.DEV,
      email: import.meta.env.VITE_MOCK_ADMIN_EMAIL,
      password: import.meta.env.VITE_MOCK_ADMIN_PASSWORD,
    });

export type { AuthService, AdminSession, SignInResult } from './AuthService';
