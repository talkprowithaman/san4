-- ── Block disposable / temporary email signups (server-side) ─────────────────
-- The signup form checks this too (src/lib/disposableEmails.js), but a client
-- check is trivially bypassed by calling the auth API directly. This trigger is
-- the real enforcement: it rejects the insert before an account is ever created.
--
-- Run in: Supabase Dashboard → SQL Editor.
-- Safe to re-run (idempotent).
--
-- NOTE: this only affects NEW signups. Existing accounts, including the QA
-- account on a disposable domain, keep working and can still sign in.

create table if not exists public.blocked_email_domains (
  domain text primary key,
  added_at timestamptz not null default now()
);

-- Readable by anyone (so the app could surface it), writable only by service role.
alter table public.blocked_email_domains enable row level security;

drop policy if exists "blocked domains are readable" on public.blocked_email_domains;
create policy "blocked domains are readable"
  on public.blocked_email_domains for select using (true);

insert into public.blocked_email_domains (domain) values
  ('temp-mail.org'),('tempmail.com'),('temp-mail.io'),('tempmail.net'),('tempmailo.com'),
  ('neowd.com'),('rteet.com'),('dpptd.com'),('mrotzis.com'),('vddaz.com'),('zlorkun.com'),
  ('kimasoft.com'),('inkiny.com'),('bltiwd.com'),('gushijr.com'),('fexpost.com'),
  ('10minutemail.com'),('10minutemail.net'),('10minemail.com'),('20minutemail.com'),
  ('guerrillamail.com'),('guerrillamail.net'),('guerrillamail.org'),('guerrillamail.biz'),
  ('sharklasers.com'),('grr.la'),('spam4.me'),('pokemail.net'),
  ('mailinator.com'),('mailinator.net'),('mailinator2.com'),('notmailinator.com'),
  ('reallymymail.com'),('binkmail.com'),('bobmail.info'),('suremail.info'),
  ('yopmail.com'),('yopmail.fr'),('yopmail.net'),('cool.fr.nf'),('jetable.fr.nf'),
  ('throwawaymail.com'),('trashmail.com'),('trashmail.de'),('trash-mail.com'),
  ('wegwerfmail.de'),('mytrashmail.com'),('tempinbox.com'),('dispostable.com'),
  ('fakeinbox.com'),('spamgourmet.com'),('mailnesia.com'),('mintemail.com'),
  ('getnada.com'),('nada.email'),('emailondeck.com'),('tempr.email'),
  ('discard.email'),('mailde.info'),('moakt.com'),('tmpmail.org'),('tmpeml.com'),
  ('luxusmail.org'),('byom.de'),('anonbox.net'),('mohmal.com'),('inboxkitten.com'),
  ('harakirimail.com'),('incognitomail.com'),('burnermail.io'),('maildrop.cc'),
  ('mailcatch.com'),('mailexpire.com'),('spambox.us'),('spambog.com'),
  ('einrot.com'),('cuvox.de'),('dayrep.com'),('armyspy.com'),('fleckens.hu'),
  ('gustr.com'),('jourrapide.com'),('rhyta.com'),('superrito.com'),('teleworm.us'),
  ('linshiyouxiang.net'),('chacuo.net'),('emlhub.com'),('emlpro.com')
on conflict (domain) do nothing;

-- Reject the signup if the domain is listed, or looks like a throwaway service.
create or replace function public.reject_disposable_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  domain text := lower(split_part(new.email, '@', 2));
begin
  if domain is null or domain = '' then
    return new;
  end if;

  if exists (select 1 from public.blocked_email_domains b where b.domain = domain)
     or domain ~ '(tempmail|temp-mail|throwaway|trashmail|guerrilla|mailinator|yopmail|fakemail|fake-mail|disposable|10minute|minutemail|burnermail|dropmail)'
  then
    raise exception 'disposable_email_not_allowed'
      using hint = 'Please sign up with a permanent email address.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reject_disposable_email on auth.users;
create trigger trg_reject_disposable_email
  before insert on auth.users
  for each row execute function public.reject_disposable_email();
