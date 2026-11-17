export interface AdminSession {
  email: string;
  /** ISO timestamp after which the session is no longer valid. */
  expiresAt: string;
  /** true for the Phase 1 development mock — never real security. */
  isMock: boolean;
}

export type SignInResult =
  | { ok: true; session: AdminSession }
  | { ok: false; reason: 'invalid_credentials' | 'unavailable' | 'rate_limited' };

/**
 * Admin authentication contract. Phase 2 implements this with Supabase Auth
 * (accounts provisioned in the Supabase dashboard; no public sign-up).
 * Authorisation of data access is enforced by Row Level Security, not by the UI.
 */
export interface AuthService {
  getSession(): Promise<AdminSession | null>;
  signIn(email: string, password: string): Promise<SignInResult>;
  signOut(): Promise<void>;
  onChange(listener: (session: AdminSession | null) => void): () => void;
}
