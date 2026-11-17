import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  title: string;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Accessible slide-over panel: traps scroll, closes on Escape / backdrop, restores focus. */
export function Drawer({ open, onClose, side = 'left', title, closeLabel, children, footer }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="animate-fade-in absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'absolute top-0 flex h-full w-[88%] max-w-sm flex-col bg-paper shadow-xl outline-none',
          side === 'left' ? 'animate-slide-in-left left-0' : 'animate-slide-in-right right-0',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
          <p className="eyebrow text-ink">{title}</p>
          <button type="button" onClick={onClose} aria-label={closeLabel} className="-mr-2 p-2 hover:bg-mist">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="shrink-0 border-t border-line p-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
