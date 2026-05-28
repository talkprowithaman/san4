-- ─────────────────────────────────────────────────────────────────────────────
-- San4 — Gamification Schema
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Creates: user_progress table with RLS, auto-create trigger for new users,
--          and a backfill for all existing users.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. USER PROGRESS TABLE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_progress (
  user_id            UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  total_xp           INTEGER DEFAULT 0,
  level              INTEGER DEFAULT 1,
  streak_count       INTEGER DEFAULT 0,
  longest_streak     INTEGER DEFAULT 0,
  last_practice_date DATE,
  badges             JSONB DEFAULT '[]',
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress"   ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;

CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 2. AUTO-CREATE PROGRESS ROW WHEN PROFILE IS CREATED ─────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_progress ON public.profiles;
CREATE TRIGGER on_profile_created_progress
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_progress();

-- ── 3. BACKFILL EXISTING USERS ───────────────────────────────────────────────
-- Creates a default progress row for any user who signed up before this ran.
INSERT INTO public.user_progress (user_id)
SELECT id FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.user_progress)
ON CONFLICT (user_id) DO NOTHING;

-- ── Done ──────────────────────────────────────────────────────────────────────
-- Expected: "Success. No rows returned."
-- All users now have a user_progress row. New signups auto-get one too.
