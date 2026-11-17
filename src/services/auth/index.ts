import type { AuthService } from './AuthService';
import { createMockAuthService } from './mock/mockAuthService';

/**
 * Phase 1: development mock, enabled only in `vite dev` (never in production builds).
 * Phase 2: replace with the Supabase Auth implementation.
 */
export const auth: AuthService = createMockAuthService({
  enabled: import.meta.env.DEV,
  email: import.meta.env.VITE_MOCK_ADMIN_EMAIL,
  password: import.meta.env.VITE_MOCK_ADMIN_PASSWORD,
});

export type { AuthService, AdminSession, SignInResult } from './AuthService';
