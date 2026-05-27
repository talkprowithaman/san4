-- ─────────────────────────────────────────────────────────────────────────────
-- San4 — Trigger Fix
-- Paste the ENTIRE file into: Supabase Dashboard → SQL Editor → Run
--
-- Root cause: SECURITY DEFINER functions without SET search_path = public
-- cannot resolve unqualified table names (e.g. "profiles" instead of
-- "public.profiles"), causing "Database error saving new user" on signup.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Drop old triggers + functions cleanly ──────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created   ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user()    CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_profile() CASCADE;

-- ── 2. handle_new_user  (auth.users → public.profiles) ───────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public           -- ← this is the critical fix
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT (id) DO NOTHING;    -- idempotent: safe if trigger runs twice
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── 3. handle_new_profile  (public.profiles → public.subscriptions) ───────────
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public           -- ← same fix here
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, sessions_used, sessions_limit, status)
  VALUES (NEW.id, 'free', 0, 3, 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();

-- ── Done ──────────────────────────────────────────────────────────────────────
-- Expected output: "Success. No rows returned."
-- Signup should now work without "Database error saving new user"
