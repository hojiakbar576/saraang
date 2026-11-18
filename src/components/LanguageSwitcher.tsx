import { useTranslation } from 'react-i18next';
import { HTML_LANG, LANGUAGES, currentLang, setLanguage, type Lang } from '@/i18n';
import { cn } from '@/lib/cn';

/**
 * Language selector: uz / ru / en. A labelled group of toggle buttons — each is
 * reachable with Tab and activated with Enter/Space; the current language is
 * announced via aria-pressed. Switching re-renders in place (no page reload)
 * and the choice is remembered in localStorage.
 *
 * `inline`: compact "UZ RU EN" for headers. `block`: full language names (menus, sidebar).
 */
export function LanguageSwitcher({ variant = 'inline', className }: { variant?: 'inline' | 'block'; className?: string }) {
  const { t, i18n } = useTranslation();
  const active: Lang = (LANGUAGES as readonly string[]).includes(i18n.resolvedLanguage ?? '') ? (i18n.resolvedLanguage as Lang) : currentLang();

  return (
    <div role="group" aria-label={t('language.choose')} className={cn('flex items-center', variant === 'block' ? 'gap-1' : 'gap-0.5', className)}>
      {LANGUAGES.map((l) => {
        const selected = l === active;
        return (
          <button
            key={l}
            type="button"
            lang={HTML_LANG[l]}
            aria-pressed={selected}
            aria-label={variant === 'inline' ? t(`language.${l}`) : undefined}
            title={t(`language.${l}`)}
            onClick={() => {
              if (!selected) void setLanguage(l);
            }}
            className={cn(
              'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
              variant === 'inline'
                ? 'inline-flex h-8 min-w-8 items-center justify-center px-1.5 text-[11px] font-medium tracking-[0.08em] uppercase'
                : 'flex-1 border px-2 py-1.5 text-xs',
              variant === 'inline' && (selected ? 'text-ink underline decoration-1 underline-offset-4' : 'text-muted hover:text-ink'),
              variant === 'block' && (selected ? 'border-ink bg-ink text-paper' : 'border-line text-ink-soft hover:border-ink hover:text-ink'),
            )}
          >
            {variant === 'inline' ? l.toUpperCase() : t(`language.${l}`)}
          </button>
        );
      })}
    </div>
  );
}
