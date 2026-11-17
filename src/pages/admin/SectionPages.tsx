import { useState } from 'react';
import { Check, Construction, Trash2 } from 'lucide-react';
import { brand } from '@/config/brand';
import { t } from '@/i18n';
import { PageHeader, Panel } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { usePageTitle } from '@/hooks/usePageTitle';
import { adminOrders } from '@/services/orders';

/** Honest placeholder for admin sections built in later milestones. */
export function ComingSoonPage({ title, description }: { title: string; description: string }) {
  usePageTitle(title);
  return (
    <>
      <PageHeader title={title} />
      <Panel>
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <Construction size={30} strokeWidth={1.25} className="text-muted" />
          <p className="display mt-4 text-2xl">{t.admin.comingSoon.title}</p>
          <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
        </div>
      </Panel>
    </>
  );
}

export function SettingsPage() {
  const s = t.admin.settings;
  usePageTitle(s.title);
  const [cleared, setCleared] = useState(false);

  const rows: [string, string][] = [
    [s.brandName, brand.name],
    [s.phone, brand.phone],
    [s.email, brand.email],
    [s.hours, brand.workingHours],
    [s.city, brand.city],
  ];

  const clearDemo = async () => {
    if (!window.confirm(s.clearConfirm)) return;
    await adminOrders.clearDemoOrders();
    setCleared(true);
  };

  return (
    <>
      <PageHeader title={s.title} subtitle={s.intro} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={s.brandName}>
          <dl className="divide-y divide-line text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
          {brand.contactsArePlaceholders && <p className="border-t border-line px-5 py-3 text-xs text-clay">{s.placeholders}</p>}
        </Panel>

        {import.meta.env.DEV && (
          <Panel title={s.demoData}>
            <div className="space-y-4 p-5 text-sm">
              <p className="text-muted">{s.demoDataText}</p>
              <Button variant="secondary" size="sm" onClick={clearDemo}>
                <Trash2 size={14} /> {s.clearDemo}
              </Button>
              {cleared && (
                <p role="status" className="flex items-center gap-2 text-success">
                  <Check size={14} /> {s.cleared}
                </p>
              )}
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}
