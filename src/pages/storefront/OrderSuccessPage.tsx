import { useLocation } from 'react-router';
import { CheckCircle2, FlaskConical, PackageSearch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { brand } from '@/config/brand';
import { Container, EmptyState, Price } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/Button';
import { PreorderSteps } from '@/components/storefront/PreorderSteps';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatUzPhone } from '@/lib/phone';
import { readLastReceipt } from '@/features/orders/lastReceipt';
import type { SubmittedOrderReceipt } from '@/services/orders';

export function OrderSuccessPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const fromState = (location.state as { receipt?: SubmittedOrderReceipt } | null)?.receipt;
  const receipt = fromState ?? readLastReceipt();
  usePageTitle(receipt?.isDemo ? t('success.demoTitle') : t('success.title'));

  if (!receipt) {
    return (
      <Container className="pt-16">
        <EmptyState
          icon={<PackageSearch size={28} strokeWidth={1.25} />}
          title={t('success.missingTitle')}
          text={t('success.missingText')}
          action={<ButtonLink to="/contact">{t('nav.contact')}</ButtonLink>}
        />
      </Container>
    );
  }

  return (
    <Container className="max-w-3xl pt-12 sm:pt-20">
      {receipt.isDemo && (
        <div role="note" className="mb-8 flex gap-3 border border-dashed border-clay/60 bg-sand/40 p-4 text-sm text-ink-soft">
          <FlaskConical size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-clay" />
          <p className="leading-relaxed">{t('success.demoBanner')}</p>
        </div>
      )}

      <div className="text-center">
        <CheckCircle2 size={40} strokeWidth={1.25} className="mx-auto text-success" />
        <h1 className="display mt-5 text-4xl sm:text-5xl">{receipt.isDemo ? t('success.demoTitle') : t('success.title')}</h1>
        <div className="mx-auto mt-8 inline-flex flex-col items-center border border-line px-10 py-5">
          <span className="eyebrow">{t('success.orderNumber')}</span>
          <span className="mt-2 text-2xl font-medium tracking-wider tabular-nums">{receipt.orderNumber}</span>
          <span className="mt-2 text-sm text-muted">
            {t('success.total')}: <Price amount={receipt.total} />
          </span>
        </div>
        <p className="mx-auto mt-8 max-w-md text-[15px] leading-relaxed text-ink-soft">
          {t('success.nextText', { phone: formatUzPhone(receipt.phone) })}
        </p>
        <p className="mt-3 text-sm text-muted">
          {brand.phone} · {t('brand.workingHours')}
        </p>
        <ButtonLink to="/" size="lg" className="mt-8">
          {t('success.continue')}
        </ButtonLink>
      </div>

      <div className="mt-16 border border-line">
        <PreorderSteps />
      </div>
    </Container>
  );
}
