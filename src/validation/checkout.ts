import { z } from 'zod';
import { normalizeUzPhone } from '@/lib/phone';
import { msg } from '@/i18n';

// Error messages are message codes (see msg / translateMsg in @/i18n): they are
// translated when shown, so they follow the language the customer picks.

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, msg('checkout.errors.tooLong', { max }))
    .transform((v) => (v === '' ? null : v));

/**
 * Checkout form schema. Used by the form for instant feedback AND by the order
 * service, which re-validates everything (the server function does too).
 */
export const checkoutSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, msg('checkout.errors.nameRequired'))
    .max(80, msg('checkout.errors.nameTooLong'))
    .refine((v) => (v.match(/\p{L}/gu) ?? []).length >= 2, msg('checkout.errors.nameInvalid'))
    .transform((v) => v.replace(/\s+/g, ' ')),
  phone: z
    .string()
    .transform((v, ctx) => {
      const n = normalizeUzPhone(v);
      if (!n) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg('checkout.errors.phoneInvalid') });
        return z.NEVER;
      }
      return n;
    }),
  city: optionalText(60),
  address: optionalText(300),
  comment: optionalText(500),
  privacyConsent: z.literal(true, { errorMap: () => ({ message: msg('checkout.errors.consent') }) }),
});

export type CheckoutFormValues = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;
export type CheckoutField = keyof CheckoutFormValues;
/** Field → message code. Render with translateMsg(). */
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
