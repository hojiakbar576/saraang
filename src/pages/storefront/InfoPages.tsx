import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { brand } from '@/config/brand';
import { t } from '@/i18n';
import { Container } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/Button';
import { PreorderSteps } from '@/components/storefront/PreorderSteps';
import { InstagramIcon, TelegramIcon } from '@/components/storefront/SocialIcons';
import { usePageTitle } from '@/hooks/usePageTitle';

export function AboutPage() {
  usePageTitle(t.about.title);
  return (
    <>
      <Container className="pt-12 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-24">
          <div>
            <p className="eyebrow mb-4">{brand.name}</p>
            <h1 className="display text-5xl sm:text-6xl">{t.about.title}</h1>
          </div>
          <div className="space-y-6">
            <p className="display text-2xl leading-snug sm:text-3xl">{t.about.lead}</p>
            {t.about.paragraphs.map((p) => (
              <p key={p} className="text-[15px] leading-relaxed text-ink-soft">{p}</p>
            ))}
          </div>
        </div>
      </Container>

      <section className="mt-16 bg-sand/60 sm:mt-24">
        <Container className="py-16 sm:py-20">
          <h2 className="display mb-10 text-3xl sm:text-4xl">{t.about.valuesTitle}</h2>
          <div className="grid gap-10 sm:grid-cols-3">
            {t.about.values.map((v) => (
              <div key={v.title} className="border-t border-ink/20 pt-5">
                <h3 className="text-sm font-medium tracking-wide">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{v.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Container className="pt-16 sm:pt-24">
        <h2 className="display mb-8 text-3xl sm:text-4xl">{t.preorder.title}</h2>
        <div className="border border-line">
          <PreorderSteps />
        </div>
      </Container>
    </>
  );
}

function ContactRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-line py-5">
      <span className="mt-0.5 text-muted">{icon}</span>
      <div>
        <p className="eyebrow mb-1">{label}</p>
        <div className="text-[15px]">{children}</div>
      </div>
    </div>
  );
}

export function ContactPage() {
  usePageTitle(t.contact.title);
  const icon = { size: 18, strokeWidth: 1.5 };
  return (
    <Container className="pt-12 sm:pt-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-24">
        <div>
          <h1 className="display text-5xl sm:text-6xl">{t.contact.title}</h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">{t.contact.lead}</p>
          {brand.contactsArePlaceholders && (
            <p className="mt-6 inline-block border border-dashed border-clay/60 px-3 py-2 text-xs text-clay">{t.contact.placeholderNotice}</p>
          )}
        </div>
        <div className="border-t border-line">
          <ContactRow icon={<Phone {...icon} />} label={t.contact.phone}>
            <a href={brand.phoneHref} className="hover:underline">{brand.phone}</a>
          </ContactRow>
          <ContactRow icon={<Mail {...icon} />} label={t.contact.email}>
            <a href={`mailto:${brand.email}`} className="hover:underline">{brand.email}</a>
          </ContactRow>
          <ContactRow icon={<Clock {...icon} />} label={t.contact.hours}>{brand.workingHours}</ContactRow>
          <ContactRow icon={<MapPin {...icon} />} label={t.contact.city}>{brand.city}</ContactRow>
          <div className="flex flex-wrap gap-3 py-6">
            <ButtonLink to={brand.social.telegram} target="_blank" rel="noopener noreferrer" variant="secondary">
              <TelegramIcon size={16} /> Telegram
            </ButtonLink>
            <ButtonLink to={brand.social.instagram} target="_blank" rel="noopener noreferrer" variant="secondary">
              <InstagramIcon size={16} /> Instagram
            </ButtonLink>
          </div>
        </div>
      </div>
    </Container>
  );
}

export function NotFoundPage() {
  usePageTitle(t.notFound.title);
  return (
    <Container className="flex flex-col items-center pt-24 text-center">
      <p className="display text-8xl text-stone">404</p>
      <h1 className="display mt-4 text-4xl">{t.notFound.title}</h1>
      <p className="mt-3 text-sm text-muted">{t.notFound.text}</p>
      <ButtonLink to="/" className="mt-8">{t.common.backToShop}</ButtonLink>
    </Container>
  );
}
