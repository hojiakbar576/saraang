import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { AlertCircle, FlaskConical } from 'lucide-react';
import { brand } from '@/config/brand';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/form';
import { useAdminAuth } from '@/features/admin/AdminAuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabaseEnabled } from '@/services/supabase/client';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { loginToEmail } from '@/features/admin/adminLogin';

/** Only allow redirects back into the admin area (prevents open redirects). */
export function safeAdminRedirect(next: string | null): string {
  if (!next) return '/admin';
  return next.startsWith('/admin') && !next.startsWith('//') && !next.startsWith('/admin/login') ? next : '/admin';
}

export function AdminLoginPage() {
  const { t } = useTranslation();
  usePageTitle(t('admin.login.title'));
  const { session, loading, signIn } = useAdminAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const target = safeAdminRedirect(params.get('next'));

  if (!loading && session) return <Navigate to={target} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!login.trim() || !password) {
      setError(t('admin.login.required'));
      return;
    }
    const email = loginToEmail(login);
    if (!email) {
      setPassword('');
      setError(t('admin.login.invalid'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const r = await signIn(email, password);
    setSubmitting(false);
    if (r.ok) {
      navigate(target, { replace: true });
      return;
    }
    setPassword('');
    setError(
      r.reason === 'rate_limited'
        ? t('admin.login.rateLimited')
        : r.reason === 'unavailable'
          ? t('admin.login.unavailable')
          : t('admin.login.invalid'),
    );
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-mist/60 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="display text-2xl tracking-[0.2em] uppercase">
            {brand.name}
          </Link>
          <p className="mt-2 text-[11px] tracking-[0.2em] text-muted uppercase">{t('admin.panel')}</p>
          <LanguageSwitcher className="mt-4 justify-center" />
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-5 border border-line bg-paper p-6 sm:p-8">
          <h1 className="text-lg font-medium">{t('admin.login.title')}</h1>
          <TextField
            label={t('admin.login.login')}
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoFocus
          />
          <TextField
            label={t('admin.login.password')}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p role="alert" className="flex items-start gap-2 text-sm text-danger">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? t('admin.login.submitting') : t('admin.login.submit')}
          </Button>
          <p className="text-center text-xs text-muted">{t('admin.login.noSignup')}</p>
        </form>

        {import.meta.env.DEV && !supabaseEnabled && (
          <p className="mt-4 flex items-start gap-2 border border-dashed border-clay/50 bg-sand/40 p-3 text-xs text-ink-soft">
            <FlaskConical size={14} className="mt-0.5 shrink-0 text-clay" />
            <span>
              {t('admin.mockBanner')} {t('admin.login.devHint')}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
