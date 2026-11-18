/**
 * Admins sign in with a short login name ("admin", "aziz") instead of an email.
 *
 * Supabase Auth only knows emails, so each login maps to an internal address
 * `<login>@<ADMIN_LOGIN_DOMAIN>`. The `.invalid` domain is reserved (RFC 2606):
 * it can never receive mail, so the address is purely an identifier.
 * Create the Supabase user with exactly that address (see docs/SUPABASE_SETUP.md).
 */
export const ADMIN_LOGIN_DOMAIN = import.meta.env.VITE_ADMIN_LOGIN_DOMAIN?.trim() || 'admin.invalid';

const LOGIN_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/;

/** Normalises a login name; null when it is not a valid login. */
export function normalizeLogin(input: string): string | null {
  const v = input.trim().toLowerCase();
  return LOGIN_RE.test(v) ? v : null;
}

/**
 * Login name → internal Supabase email. A full email is accepted as-is so an
 * older email-based admin account keeps working.
 */
export function loginToEmail(input: string, domain = ADMIN_LOGIN_DOMAIN): string | null {
  const v = input.trim().toLowerCase();
  if (v.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
  const login = normalizeLogin(v);
  return login ? `${login}@${domain}` : null;
}

/** Internal email → login name for display ("admin@admin.invalid" → "admin"). */
export function displayLogin(email: string, domain = ADMIN_LOGIN_DOMAIN): string {
  const suffix = `@${domain}`;
  return email.toLowerCase().endsWith(suffix) ? email.slice(0, -suffix.length) : email;
}
