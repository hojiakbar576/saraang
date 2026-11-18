# Supabase setup (Phase 2)

The app talks to Supabase only when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
are set; otherwise it keeps using the local demo data. Only the **public URL and the
publishable (anon) key** are used in the browser. The service-role key is never
needed by the frontend — do not put it in any `VITE_*` variable or commit it.

## 1. Create the project

- Supabase → New project, region **Central EU (Frankfurt) – eu-central-1**.
- Free plans allow **2 active free projects per owner**. If you already have two,
  pause one, upgrade, or create the store under another owner's account.

## 2. Apply the database migrations

Run, in order, the files in `supabase/migrations/` (SQL editor, Supabase CLI
`supabase db push`, or let Claude apply them through the Supabase connector):

1. `20261118075601_init_schema.sql` — tables, constraints, indexes, RLS policies, categories and colours
2. `20261118075714_functions_and_storage.sql` — `place_order`, order status functions,
   product save/import, and the `product-images` storage bucket with admin-only upload
3. `20261118075957_hardening.sql` — `place_order` temp-table guard, per-action admin
   write policies, order-number counter reset
4. `20261118083718_product_translations.sql` — Russian/English product text
   (`product_translations`), `name_ru`/`name_en` for categories and colours, translations in
   `admin_save_product`, language-neutral amount-correction note (see docs/I18N.md)
5. `20261118091130_admin_login.sql` — `admin_set_login()`: create an admin login or set its
   password (SQL editor only; not callable from the website)

File names match the versions recorded in the live project (applied 2026-11-18), so
`supabase db push` sees them as already applied.

Status of project `tuqaqmijpmcbxkfxjbig`: all five applied and smoke-tested
(ordering, re-pricing, idempotency, unavailable variant, consent, rate limit, status
flow, anon cannot see orders). The Supabase security advisor flags `place_order` and
`is_admin` as callable by anonymous users — both are intentional (customers must place
orders; `is_admin` only reports on the caller).

## 3. Lock down sign-ups and create the admin account

1. Authentication → Providers → Email: **disable "Allow new users to sign up"**.
   (Even if left on, a new account has no admin rights — but turn it off.)
2. Admins sign in with a **login name** (for example `admin`), not an email. Supabase
   stores it as the internal address `<login>@admin.invalid` (`.invalid` can never
   receive mail).
3. The `admin` account already exists and has admin rights (created 2026-11-18 with a
   random password nobody knows). To set or change a password — or to add another admin —
   run in the SQL editor (it only works there, never from the website):

   ```sql
   select public.admin_set_login('admin', 'your-new-password');
   ```

   Minimum 10 characters. A new login name (e.g. `aziz`) creates another admin account.

On the sign-in page type `admin` and the password.

## 4. Configure the app

Create `.env.local` (never committed):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable / anon key from Project Settings → API>
```

Restart `npm run dev`. Admin login now uses Supabase Auth; the demo banners disappear.
On Vercel, add the same two variables in Project → Settings → Environment Variables.

## 5. What protects the data

| Who | Can |
|---|---|
| Anyone | read categories, colours, and **active** products with their variants/images; call `place_order()` |
| Signed-in non-admin | same as anyone |
| Admin (`admin_users`) | everything: products, images upload/delete, orders, notes, status changes |

- Orders, order items, status history and notes have **no anonymous access**.
- `place_order()` re-validates the customer data, re-prices every line from the
  catalog, rejects unavailable variants, limits 5 orders per phone per 10 minutes,
  and is idempotent per checkout.
- A product that appears in any order cannot be deleted (foreign key RESTRICT) — archive it.
- `orders` enforces that only delivered orders carry `amount_received` and `delivered_at`.
- Money columns are `bigint` so'm. Cost columns (`purchase_cost`, `shipping_cost`,
  `unit_cost`, `other_costs`) exist for future profit tracking and are unused in V1.
