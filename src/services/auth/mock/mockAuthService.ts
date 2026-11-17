import type { AdminSession, AuthService } from '../AuthService';

/**
 * ⚠ DEVELOPMENT-ONLY MOCK — NOT SECURITY.
 * Compares against fake credentials from .env.development.local and stores a
 * flag in sessionStorage. Anyone with devtools can bypass it. It exists only so
 * the admin UI can be built before Supabase Auth is connected in Phase 2, and it
 * refuses to work in production builds.
 */
const SESSION_KEY = 'store.admin.mockSession.v1';
const SESSION_HOURS = 8;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

export interface MockAuthConfig {
  enabled: boolean;
  email: string | undefined;
  password: string | undefined;
  now?: () => number;
}

export function createMockAuthService(config: MockAuthConfig): AuthService {
  const now = config.now ?? (() => Date.now());
  const listeners = new Set<(s: AdminSession | null) => void>();
  let failures = 0;
  let lockedUntil = 0;

  const emit = (s: AdminSession | null) => listeners.forEach((l) => l(s));

  const read = (): AdminSession | null => {
    try {
      const raw = window.sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as AdminSession;
      if (typeof s.email !== 'string' || typeof s.expiresAt !== 'string') return null;
      if (Date.parse(s.expiresAt) <= now()) {
        window.sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return s;
    } catch {
      return null;
    }
  };

  return {
    async getSession() {
      if (!config.enabled) return null;
      return read();
    },

    async signIn(email, password) {
      if (!config.enabled || !config.email || !config.password) return { ok: false, reason: 'unavailable' };
      if (now() < lockedUntil) return { ok: false, reason: 'rate_limited' };
      await new Promise((r) => setTimeout(r, 300));
      const match = email.trim().toLowerCase() === config.email.toLowerCase() && password === config.password;
      if (!match) {
        failures += 1;
        if (failures >= MAX_ATTEMPTS) {
          lockedUntil = now() + LOCKOUT_MS;
          failures = 0;
        }
        return { ok: false, reason: 'invalid_credentials' };
      }
      failures = 0;
      const session: AdminSession = {
        email: config.email,
        expiresAt: new Date(now() + SESSION_HOURS * 3_600_000).toISOString(),
        isMock: true,
      };
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      emit(session);
      return { ok: true, session };
    },

    async signOut() {
      window.sessionStorage.removeItem(SESSION_KEY);
      emit(null);
    },

    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
