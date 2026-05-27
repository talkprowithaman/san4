-- ─────────────────────────────────────────────────────────────────────────────
-- San4 (Sanchaar) — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. WAITLIST
CREATE TABLE IF NOT EXISTS waitlist (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name       TEXT,
  role       TEXT DEFAULT 'professional',
  goal       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  plan                     TEXT DEFAULT 'free',
  razorpay_subscription_id TEXT,
  status                   TEXT DEFAULT 'active',
  sessions_used            INTEGER DEFAULT 0,
  sessions_limit           INTEGER DEFAULT 3,
  current_period_end       TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription"   ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create free subscription on profile creation
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, sessions_limit)
  VALUES (NEW.id, 'free', 3);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();

-- 4. PRACTICE SESSIONS
CREATE TABLE IF NOT EXISTS practice_sessions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE,
  scenario_id       TEXT NOT NULL,
  scenario_title    TEXT NOT NULL,
  messages          JSONB DEFAULT '[]',
  filler_word_count INTEGER DEFAULT 0,
  confidence_score  INTEGER DEFAULT 0,
  pacing_score      INTEGER DEFAULT 0,
  overall_score     INTEGER DEFAULT 0,
  duration_seconds  INTEGER DEFAULT 0,
  feedback          TEXT,
  action_item       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own sessions" ON practice_sessions
  FOR ALL USING (auth.uid() = user_id);

-- 5. MEETING PREPS
CREATE TABLE IF NOT EXISTS meeting_preps (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,
  meeting_title  TEXT,
  agenda         TEXT NOT NULL,
  talking_points JSONB DEFAULT '[]',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meeting_preps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own preps" ON meeting_preps
  FOR ALL USING (auth.uid() = user_id);
