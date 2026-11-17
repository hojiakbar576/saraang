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

1. `20261117120000_init_schema.sql` — tables, constraints, indexes, RLS policies, categories and colours
2. `20261117120100_functions_and_storage.sql` — `place_order`, order status functions,
   product save/import, and the `product-images` storage bucket with admin-only upload

## 3. Lock down sign-ups and create the admin account

1. Authentication → Providers → Email: **disable "Allow new users to sign up"**.
   (Even if left on, a new account has no admin rights — but turn it off.)
2. Authentication → Users → **Add user** → the shared admin email + a strong password
   (tick "Auto confirm user").
3. SQL editor — grant admin rights to exactly that account:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'ADMIN-EMAIL-HERE';
   ```

Adding a second administrator later = repeat steps 2–3 for another email.

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
