import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { auth as defaultAuth, type AdminSession, type AuthService, type SignInResult } from '@/services/auth';

interface AdminAuthValue {
  session: AdminSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children, service = defaultAuth }: { children: ReactNode; service?: AuthService }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    service.getSession().then((s) => {
      if (active) {
        setSession(s);
        setLoading(false);
      }
    });
    const off = service.onChange((s) => setSession(s));
    return () => {
      active = false;
      off();
    };
  }, [service]);

  // Re-check expiry periodically so an expired session logs out on its own.
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => service.getSession().then(setSession), 60_000);
    return () => clearInterval(id);
  }, [session, service]);

  const signIn = useCallback((email: string, password: string) => service.signIn(email, password), [service]);
  const signOut = useCallback(() => service.signOut(), [service]);

  const value = useMemo(() => ({ session, loading, signIn, signOut }), [session, loading, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminAuth(): AdminAuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  return v;
}

/** Route guard: renders children only for a signed-in admin, otherwise redirects to login. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, loading } = useAdminAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper text-sm text-muted" aria-busy="true">
        …
      </div>
    );
  }
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}
