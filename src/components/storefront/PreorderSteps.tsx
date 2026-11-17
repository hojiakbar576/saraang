import { t } from '@/i18n';

export function PreorderSteps() {
  return (
    <ol className="grid gap-px bg-line sm:grid-cols-3">
      {t.preorder.steps.map((step, i) => (
        <li key={step.title} className="bg-paper p-6 sm:p-8">
          <span className="display text-4xl text-clay">{String(i + 1).padStart(2, '0')}</span>
          <h3 className="mt-4 text-sm font-medium tracking-wide">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
