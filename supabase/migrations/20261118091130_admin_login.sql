-- =============================================================================
-- Admin accounts with a login name instead of an email — 2026-11-18
--
-- The app maps a login ("admin") to the internal Supabase email
-- "<login>@admin.invalid" (src/features/admin/adminLogin.ts). ".invalid" is a
-- reserved domain that can never receive mail.
--
-- public.admin_set_login(login, password) creates that account (confirmed,
-- admin) or changes its password. It is NOT callable through the website API:
-- execute is revoked from anon/authenticated, so it only runs from the
-- Supabase SQL editor (as the project owner). Usage:
--
--   select public.admin_set_login('admin', 'your-new-password');
-- =============================================================================

create or replace function public.admin_set_login(p_login text, p_password text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_login text := lower(btrim(coalesce(p_login, '')));
  v_email text;
  v_id uuid;
begin
  if v_login !~ '^[a-z0-9][a-z0-9._-]{1,31}$' then
    raise exception 'Login must be 2-32 characters: a-z, 0-9, dot, dash or underscore.';
  end if;
  if p_password is null or char_length(p_password) < 10 then
    raise exception 'Password must be at least 10 characters.';
  end if;

  v_email := v_login || '@admin.invalid';
  select id into v_id from auth.users where email = v_email;

  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, reauthentication_token, phone_change, phone_change_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
      '', '', '', '', '', '', '', ''
    );
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      v_id::text, v_id,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now()
    );
  else
    update auth.users
    set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        updated_at = now(),
        banned_until = null
    where id = v_id;
  end if;

  insert into public.admin_users (user_id) values (v_id) on conflict (user_id) do nothing;
  return format('Admin login "%s" is ready.', v_login);
end;
$$;

revoke all on function public.admin_set_login(text, text) from public, anon, authenticated;
