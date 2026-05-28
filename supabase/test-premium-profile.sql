-- ─────────────────────────────────────────────────────────────────────────────
-- San4 — Premium Test Profile Setup
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- What this does:
--   1. Upgrades the user's subscription to Pro (unlimited sessions)
--   2. Seeds 6 realistic practice sessions across different scenarios
--      so the dashboard history and analytics look real
--
-- !! Replace 'YOUR_EMAIL_HERE' with the email you signed up with !!
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_user_id UUID;
  v_email   TEXT := 'YOUR_EMAIL_HERE';  -- ← Change this
BEGIN

  -- ── Look up the user ────────────────────────────────────────────────────────
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email: %. Sign up first, then run this script.', v_email;
  END IF;

  RAISE NOTICE 'Found user: %', v_user_id;

  -- ── 1. Upgrade profile name ─────────────────────────────────────────────────
  UPDATE public.profiles
  SET
    name       = COALESCE(NULLIF(name, ''), 'Aman Jindal'),
    role       = 'professional',
    goal       = 'Master high-stakes conversations at work',
    updated_at = NOW()
  WHERE id = v_user_id;

  -- ── 2. Upgrade subscription to Pro (unlimited) ──────────────────────────────
  INSERT INTO public.subscriptions (user_id, plan, sessions_used, sessions_limit, status, updated_at)
  VALUES (v_user_id, 'pro', 0, -1, 'active', NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET plan           = 'pro',
        sessions_limit = -1,
        sessions_used  = 0,
        status         = 'active',
        updated_at     = NOW();

  RAISE NOTICE 'Subscription upgraded to Pro ✓';

  -- ── 3. Seed practice session history ───────────────────────────────────────
  -- Clear any existing test sessions first (keep it clean)
  DELETE FROM public.practice_sessions WHERE user_id = v_user_id;

  -- Session 1: HR Interview — Strong performance
  INSERT INTO public.practice_sessions
    (user_id, scenario_id, scenario_title, messages, filler_word_count,
     confidence_score, pacing_score, overall_score, duration_seconds,
     feedback, action_item, created_at)
  VALUES (
    v_user_id, 'hr_interview', 'HR Interview',
    '[{"role":"ai","content":"Tell me about yourself and why you want this role."},{"role":"user","content":"I have 5 years of experience in key account management at Deloitte, where I managed a portfolio of enterprise clients worth ₹40 crore annually. I am drawn to this role because it combines strategic thinking with direct client impact — two things I genuinely enjoy."},{"role":"ai","content":"That is a strong start. What would you say is your biggest weakness?"},{"role":"user","content":"I tend to over-prepare. I sometimes spend more time on a presentation than needed. I have learned to timebox my prep and trust my expertise."}]'::jsonb,
    4, 85, 80, 84, 740,
    'Excellent structure in your self-introduction. STAR method used well for behavioral answers. Slight over-use of "basically" — work on replacing it with a pause.',
    'Record yourself answering "Walk me through your resume" in under 2 minutes. Play it back and cut every filler word.',
    NOW() - INTERVAL '2 days'
  );

  -- Session 2: Salary Negotiation — Good but room to improve
  INSERT INTO public.practice_sessions
    (user_id, scenario_id, scenario_title, messages, filler_word_count,
     confidence_score, pacing_score, overall_score, duration_seconds,
     feedback, action_item, created_at)
  VALUES (
    v_user_id, 'salary_negotiation', 'Salary Negotiation',
    '[{"role":"ai","content":"We can offer you ₹18 LPA. The role has a lot of growth potential."},{"role":"user","content":"I appreciate the offer. Based on my research and my 5 years of experience driving measurable revenue growth, I was expecting something in the ₹22–24 LPA range. Can we discuss what flexibility exists?"},{"role":"ai","content":"That is above our budget. What makes you feel that range is justified?"},{"role":"user","content":"In my current role I manage accounts worth ₹40 crore. I brought in 3 new enterprise clients last year alone, each worth ₹5–8 crore. I expect to do the same here within 6 months."}]'::jsonb,
    7, 74, 72, 73, 480,
    'Good anchoring with market data. Hesitation at the start of counter-offer hurt your position — the pause telegraphed uncertainty. Your justification with numbers was the strongest moment.',
    'Practice the first 10 seconds of your counter-offer until it feels completely natural. Confidence at the opening sets the tone.',
    NOW() - INTERVAL '4 days'
  );

  -- Session 3: Client Presentation — High scorer
  INSERT INTO public.practice_sessions
    (user_id, scenario_id, scenario_title, messages, filler_word_count,
     confidence_score, pacing_score, overall_score, duration_seconds,
     feedback, action_item, created_at)
  VALUES (
    v_user_id, 'client_presentation', 'Client Presentation',
    '[{"role":"ai","content":"Thanks for coming in. We have reviewed your proposal but have some concerns about the timeline."},{"role":"user","content":"Absolutely, I expected that question. Let me walk you through the three phases and exactly where we have built in buffer. Phase one is 3 weeks — discovery and stakeholder alignment. Phase two is 6 weeks — core implementation. Phase three is 3 weeks — UAT and handover. Total: 12 weeks with a 2-week buffer built in."},{"role":"ai","content":"What happens if phase two runs over?"},{"role":"user","content":"Great question. We have a parallel-track approach for the two riskiest deliverables so they do not block each other. If we hit a delay, phase three absorbs it without affecting your go-live date."}]'::jsonb,
    2, 91, 87, 90, 820,
    'Outstanding session. Structured thinking, no hesitation, excellent handling of pushback. Your pacing was near-perfect — you gave the client time to absorb each point before moving on.',
    'You are ready for real client pitches. Focus on reading the room — notice when a client wants to jump in and pause intentionally to give them space.',
    NOW() - INTERVAL '7 days'
  );

  -- Session 4: Performance Review — Average, early session
  INSERT INTO public.practice_sessions
    (user_id, scenario_id, scenario_title, messages, filler_word_count,
     confidence_score, pacing_score, overall_score, duration_seconds,
     feedback, action_item, created_at)
  VALUES (
    v_user_id, 'performance_review', 'Performance Review',
    '[{"role":"ai","content":"Let us talk about this quarter. How do you think it went?"},{"role":"user","content":"I think it went well, um, I mean I handled the XYZ account and basically managed to close the deal and, you know, things worked out."},{"role":"ai","content":"Can you be more specific about what you achieved and how?"},{"role":"user","content":"Right, so the XYZ account was ₹8 crore renewal. I negotiated the terms, brought in the legal team early so it did not delay and we closed 2 weeks before deadline."}]'::jsonb,
    14, 62, 65, 63, 590,
    'Your actual results are impressive — ₹8 crore deal closed early — but you buried the lead under filler words. "I think it went well" is a weak opener for a performance review. Lead with the outcome, then explain how.',
    'Rewrite your answer to "How did the quarter go?" in one sentence that starts with a number. Practice it 10 times until it is automatic.',
    NOW() - INTERVAL '14 days'
  );

  -- Session 5: Group Discussion — Improving trend
  INSERT INTO public.practice_sessions
    (user_id, scenario_id, scenario_title, messages, filler_word_count,
     confidence_score, pacing_score, overall_score, duration_seconds,
     feedback, action_item, created_at)
  VALUES (
    v_user_id, 'gd_round', 'Group Discussion',
    '[{"role":"ai","content":"Today we are discussing: Should Indian startups focus on Tier-2 cities? You may begin."},{"role":"user","content":"I strongly believe Tier-2 cities represent the next frontier for Indian startups. Three reasons: one, lower customer acquisition cost, two, less competitive saturation, and three, the rise of digital infrastructure — UPI, cheap data, smartphone penetration — makes it viable at scale today in a way it was not five years ago."},{"role":"ai","content":"Interesting points. But is the purchasing power there to justify the investment?"},{"role":"user","content":"That is a fair challenge. Purchasing power in Tier-2 has grown 18% year-on-year according to the 2023 CRISIL report. More importantly, unit economics improve when CAC drops — you do not need the same ARPU if your cost base is 40% lower."}]'::jsonb,
    5, 79, 76, 78, 650,
    'Strong structure and use of data. Your opening statement was assertive and well-organised. Work on listening cues — in a real GD, you would need to respond to others, not just make your own points.',
    'Practice summarising and synthesising someone else is point before adding your own — "Building on what X said... I would add..." This is the mark of a top GD performer.',
    NOW() - INTERVAL '10 days'
  );

  -- Session 6: Team Meeting — Most recent
  INSERT INTO public.practice_sessions
    (user_id, scenario_id, scenario_title, messages, filler_word_count,
     confidence_score, pacing_score, overall_score, duration_seconds,
     feedback, action_item, created_at)
  VALUES (
    v_user_id, 'team_meeting', 'Team Meeting',
    '[{"role":"ai","content":"Go ahead, the team is listening. What is the update?"},{"role":"user","content":"Quick update on Project Delta. We are on track for the April 15 deadline. Three things to flag: the design review moved to Thursday, dev is 2 days ahead of plan, and we need a decision on the third-party API by EOD Friday or it risks the timeline. Can I get 30 minutes with whoever owns that decision?"},{"role":"ai","content":"The API decision is with procurement. They say it might take another week. How do you handle that?"},{"role":"user","content":"I would escalate it today. If we wait a week we lose the buffer. I can put together a one-pager on the risk by noon and send it to the procurement lead and the project sponsor together — sometimes visibility alone speeds things up."}]'::jsonb,
    3, 88, 83, 86, 610,
    'Crisp update structure: status, flags, decision needed. No fluff. Your escalation response showed good judgment — you did not panic, you proposed a concrete action with a timeline.',
    'Before your next real meeting update, write down: (1) overall status in one word, (2) top 3 flags, (3) one decision needed. Stick to that structure every time.',
    NOW() - INTERVAL '1 day'
  );

  RAISE NOTICE 'Seeded 6 practice sessions ✓';

  -- ── 4. Seed gamification progress ──────────────────────────────────────────
  -- XP earned across the 6 sessions (formula: 50 + floor(score*1.5) + excellence):
  --   84→176, 73→159, 90→210, 63→144, 78→167, 86→179  =  1035 XP  →  Level 3 (Expressive)
  -- last_practice_date = yesterday so you can extend the streak by practicing today.
  INSERT INTO public.user_progress
    (user_id, total_xp, level, streak_count, longest_streak, last_practice_date)
  VALUES (
    v_user_id,
    1035,
    3,                                                  -- Expressive
    3,                                                  -- 3-day streak
    7,                                                  -- best ever streak
    (CURRENT_DATE - INTERVAL '1 day')::DATE             -- yesterday → extend today
  )
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp           = 1035,
        level              = 3,
        streak_count       = 3,
        longest_streak     = 7,
        last_practice_date = (CURRENT_DATE - INTERVAL '1 day')::DATE,
        updated_at         = NOW();

  RAISE NOTICE 'Gamification progress seeded ✓  (1035 XP · Level 3 Expressive · 3-day streak)';
  RAISE NOTICE '─────────────────────────────────────────────────────────────';
  RAISE NOTICE 'Done! Sign in at san4.vercel.app with: %', v_email;
  RAISE NOTICE 'Practice one session today to see the streak extend to 4 🔥';

END $$;
