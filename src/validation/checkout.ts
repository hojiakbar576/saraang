import { z } from 'zod';
import { normalizeUzPhone } from '@/lib/phone';
import { t } from '@/i18n';

const e = t.checkout.errors;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, e.tooLong(max))
    .transform((v) => (v === '' ? null : v));

/**
 * Checkout form schema. Used by the form for instant feedback AND by the order
 * service, which re-validates everything (the Phase 2 server function will too).
 */
export const checkoutSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, e.nameRequired)
    .max(80, e.nameTooLong)
    .refine((v) => (v.match(/\p{L}/gu) ?? []).length >= 2, e.nameInvalid)
    .transform((v) => v.replace(/\s+/g, ' ')),
  phone: z
    .string()
    .transform((v, ctx) => {
      const n = normalizeUzPhone(v);
      if (!n) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: e.phoneInvalid });
        return z.NEVER;
      }
      return n;
    }),
  city: optionalText(60),
  address: optionalText(300),
  comment: optionalText(500),
  privacyConsent: z.literal(true, { errorMap: () => ({ message: e.consent }) }),
});

export type CheckoutFormValues = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;
export type CheckoutField = keyof CheckoutFormValues;
export type CheckoutErrors = Partial<Record<CheckoutField, string>>;

export function validateCheckout(
  values: unknown,
): { ok: true; data: CheckoutData } | { ok: false; errors: CheckoutErrors } {
  const r = checkoutSchema.safeParse(values);
  if (r.success) return { ok: true, data: r.data };
  const errors: CheckoutErrors = {};
  for (const issue of r.error.issues) {
    const field = issue.path[0] as CheckoutField | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors };
}
