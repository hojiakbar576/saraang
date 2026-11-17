import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

const control =
  'w-full border bg-paper px-4 text-[15px] text-ink placeholder:text-muted/60 transition-colors focus:outline-none disabled:opacity-50';
const controlState = (error?: string) => (error ? 'border-danger focus:border-danger' : 'border-line hover:border-stone focus:border-ink');

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  optionalLabel?: string;
  error?: string;
  children: ReactNode;
}

function FieldShell({ id, label, hint, optionalLabel, error, children }: FieldShellProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-baseline gap-2 text-[13px] font-medium">
        {label}
        {optionalLabel && <span className="text-xs font-normal text-muted">({optionalLabel})</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  optionalLabel?: string;
  error?: string;
  prefix?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, optionalLabel, error, prefix, className, id: idProp, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldShell id={id} label={label} hint={hint} optionalLabel={optionalLabel} error={error}>
      <div className="relative flex">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[15px] text-muted tabular-nums">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(control, controlState(error), 'h-12', prefix && 'pl-[3.75rem] tabular-nums', className)}
          {...rest}
        />
      </div>
    </FieldShell>
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  optionalLabel?: string;
  error?: string;
}

export function TextArea({ label, hint, optionalLabel, error, className, id: idProp, ...rest }: TextAreaProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} optionalLabel={optionalLabel} error={error}>
      <textarea
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(control, controlState(error), 'min-h-24 resize-y py-3 leading-relaxed', className)}
        {...rest}
      />
    </FieldShell>
  );
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  error?: string;
}

export function Checkbox({ label, error, checked, id: idProp, ...rest }: CheckboxProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="peer sr-only"
          {...rest}
        />
        <span
          className={cn(
            'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink',
            checked ? 'border-ink bg-ink text-paper' : error ? 'border-danger' : 'border-stone',
          )}
        >
          {checked && <Check size={13} strokeWidth={2.2} />}
        </span>
        <span className="text-ink-soft">{label}</span>
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 pl-[30px] text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
