import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { formatUZS } from '@/lib/money';

export function Container({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10', className)} {...rest} />;
}

export function Badge({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center bg-paper/90 px-2 py-1 text-[10px] font-medium tracking-[0.18em] text-ink uppercase',
        className,
      )}
      {...rest}
    />
  );
}

export function Price({ amount, className }: { amount: number; className?: string }) {
  return <span className={cn('tabular-nums', className)}>{formatUZS(amount)}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse bg-sand/70', className)} />;
}

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeading({ eyebrow, title, action, className }: SectionHeadingProps) {
  return (
    <div className={cn('mb-6 flex items-end justify-between gap-4 sm:mb-8', className)}>
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="display text-3xl sm:text-4xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-stone px-6 py-16 text-center">
      {icon && <div className="mb-4 text-muted">{icon}</div>}
      <p className="display text-2xl">{title}</p>
      {text && <p className="mt-2 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
