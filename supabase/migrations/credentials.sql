-- ─────────────────────────────────────────────────────────────────────────────
-- San4 verified credential — the public score page at /a/<code>
-- Supabase Dashboard → SQL Editor → New Query → paste → Run (safe to re-run)
--
-- Writes only happen through publish_credential(), which computes the score
-- in Postgres from the caller's own practice_sessions and checks the Pro plan
-- server-side. The public page reads through get_credential(), which exposes
-- the number, the history and nothing else (never recordings or transcripts).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS credentials (
  code            TEXT PRIMARY KEY,
  user_id         UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name    TEXT,
  score           INTEGER NOT NULL,
  band            TEXT NOT NULL,
  clarity         INTEGER,
  structure       INTEGER,
  sessions_count  INTEGER NOT NULL DEFAULT 0,
  first_assessed  DATE,
  scored_in       TEXT NOT NULL DEFAULT 'English',
  published       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- Owners can read their own row. No insert/update/delete policies: all writes
-- go through the SECURITY DEFINER function below.
DROP POLICY IF EXISTS "Users can view own credential" ON credentials;
CREATE POLICY "Users can view own credential" ON credentials
  FOR SELECT USING (auth.uid() = user_id);

-- Band names match SCORE_BANDS in src/lib/san4Score.js.
CREATE OR REPLACE FUNCTION public.san4_band(p_score INTEGER)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_score >= 85 THEN 'Influential'
    WHEN p_score >= 70 THEN 'Confident'
    WHEN p_score >= 55 THEN 'Clear'
    WHEN p_score >= 40 THEN 'Developing'
    ELSE 'Hesitant'
  END
$$;

-- Publish (or refresh) the caller's credential. Returns the public code.
-- p_comm: the latest assessment communication score, which the app keeps on
-- the device (same 40/60 blend as computeSan4Score in san4Score.js).
CREATE OR REPLACE FUNCTION public.publish_credential(
  p_comm      INTEGER DEFAULT NULL,
  p_clarity   INTEGER DEFAULT NULL,
  p_structure INTEGER DEFAULT NULL,
  p_name      TEXT    DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid        UUID := auth.uid();
  v_plan     TEXT;
  v_recent   NUMERIC;
  v_score    INTEGER;
  v_sessions INTEGER;
  v_first    DATE;
  v_name     TEXT;
  v_code     TEXT;
  alphabet   TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i          INTEGER;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_signed_in';
  END IF;

  SELECT plan INTO v_plan FROM subscriptions WHERE user_id = uid;
  IF COALESCE(v_plan, 'free') NOT IN ('pro', 'pro_plus') THEN
    RAISE EXCEPTION 'pro_required';
  END IF;

  -- Recency-weighted average of the last 10 scored sessions (10, 9, 8, …).
  SELECT SUM(overall_score * (11 - rn))::NUMERIC / NULLIF(SUM(11 - rn), 0)
    INTO v_recent
    FROM (
      SELECT overall_score, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
        FROM practice_sessions
       WHERE user_id = uid AND overall_score > 0
       ORDER BY created_at DESC
       LIMIT 10
    ) t;

  IF p_comm IS NOT NULL AND (p_comm < 0 OR p_comm > 100) THEN p_comm := NULL; END IF;
  IF v_recent IS NULL AND p_comm IS NULL THEN
    RAISE EXCEPTION 'no_score_yet';
  END IF;

  v_score := ROUND(CASE
    WHEN v_recent IS NULL THEN p_comm
    WHEN p_comm  IS NULL THEN v_recent
    ELSE 0.4 * p_comm + 0.6 * v_recent
  END);

  SELECT COUNT(*), MIN(created_at)::DATE INTO v_sessions, v_first
    FROM practice_sessions WHERE user_id = uid AND overall_score > 0;

  SELECT COALESCE(NULLIF(TRIM(p_name), ''), NULLIF(TRIM(name), ''))
    INTO v_name FROM profiles WHERE id = uid;

  SELECT code INTO v_code FROM credentials WHERE user_id = uid;
  IF v_code IS NULL THEN
    LOOP
      v_code := '';
      FOR i IN 1..4 LOOP
        v_code := v_code || SUBSTR(alphabet, 1 + FLOOR(RANDOM() * LENGTH(alphabet))::INTEGER, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM credentials WHERE code = v_code);
    END LOOP;
  END IF;

  INSERT INTO credentials (code, user_id, display_name, score, band, clarity, structure,
                           sessions_count, first_assessed, published, updated_at)
  VALUES (v_code, uid, LEFT(v_name, 80), v_score, san4_band(v_score),
          CASE WHEN p_clarity   BETWEEN 0 AND 100 THEN p_clarity   END,
          CASE WHEN p_structure BETWEEN 0 AND 100 THEN p_structure END,
          v_sessions, v_first, TRUE, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    display_name   = EXCLUDED.display_name,
    score          = EXCLUDED.score,
    band           = EXCLUDED.band,
    clarity        = COALESCE(EXCLUDED.clarity, credentials.clarity),
    structure      = COALESCE(EXCLUDED.structure, credentials.structure),
    sessions_count = EXCLUDED.sessions_count,
    first_assessed = EXCLUDED.first_assessed,
    published      = TRUE,
    updated_at     = NOW();

  RETURN v_code;
END;
$$;

-- Take the public page down (the code is kept so old links can be revived).
CREATE OR REPLACE FUNCTION public.unpublish_credential()
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE credentials SET published = FALSE, updated_at = NOW() WHERE user_id = auth.uid();
$$;

-- Public read: the number, the history and nothing else.
CREATE OR REPLACE FUNCTION public.get_credential(p_code TEXT)
RETURNS TABLE (
  code TEXT, display_name TEXT, score INTEGER, band TEXT, clarity INTEGER, structure INTEGER,
  sessions_count INTEGER, first_assessed DATE, scored_in TEXT, updated_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT code, display_name, score, band, clarity, structure,
         sessions_count, first_assessed, scored_in, updated_at
    FROM credentials
   WHERE code = UPPER(TRIM(p_code)) AND published
$$;

REVOKE ALL ON FUNCTION public.publish_credential(INTEGER, INTEGER, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unpublish_credential() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_credential(INTEGER, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpublish_credential() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_credential(TEXT) TO anon, authenticated;
