import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { brand } from '@/config/brand';
import { useTranslation } from 'react-i18next';
import { PageHeader, Panel } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { usePageTitle } from '@/hooks/usePageTitle';
import { adminOrders } from '@/services/orders';
import { supabaseEnabled } from '@/services/supabase/client';

export function SettingsPage() {
  const { t } = useTranslation();
  usePageTitle(t('admin.settings.title'));
  const [cleared, setCleared] = useState(false);

  const rows: [string, string][] = [
    [t('admin.settings.brandName'), brand.name],
    [t('admin.settings.phone'), brand.phone],
    [t('admin.settings.email'), brand.email],
    [t('admin.settings.hours'), t('brand.workingHours')],
    [t('admin.settings.city'), t('brand.city')],
  ];

  const clearDemo = async () => {
    if (!window.confirm(t('admin.settings.clearConfirm'))) return;
    await adminOrders.clearDemoOrders();
    setCleared(true);
  };

  return (
    <>
      <PageHeader title={t('admin.settings.title')} subtitle={t('admin.settings.intro')} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title={t('admin.settings.brandName')}>
          <dl className="divide-y divide-line text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
          {brand.contactsArePlaceholders && <p className="border-t border-line px-5 py-3 text-xs text-clay">{t('admin.settings.placeholders')}</p>}
        </Panel>

        {import.meta.env.DEV && !supabaseEnabled && (
          <Panel title={t('admin.settings.demoData')}>
            <div className="space-y-4 p-5 text-sm">
              <p className="text-muted">{t('admin.settings.demoDataText')}</p>
              <Button variant="secondary" size="sm" onClick={clearDemo}>
                <Trash2 size={14} /> {t('admin.settings.clearDemo')}
              </Button>
              {cleared && (
                <p role="status" className="flex items-center gap-2 text-success">
                  <Check size={14} /> {t('admin.settings.cleared')}
                </p>
              )}
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}
