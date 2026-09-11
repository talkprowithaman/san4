// ── Turning Supabase auth errors into something a human can act on ───────────
// Supabase returns operational messages written for developers ("email rate
// limit exceeded", "For security purposes, you can only request this after
// 43 seconds"). We were passing err.message straight to setError, so users saw
// raw API strings and had no idea what to do next.
//
// Every message here answers two questions: is this my fault, and what do I do?

// Supabase caps auth emails. On the BUILT-IN mailer that cap is brutally low
// (2 per hour, project-wide, shared by every user), so this fires for people
// who have done nothing wrong -- someone else simply signed up before them.
// Detect it by status first, message second: the wording changes between
// GoTrue releases, the 429 does not.
export function isRateLimited(err) {
  if (!err) return false
  if (err.status === 429) return true
  const code = err.code || err.error_code || ''
  if (/rate_limit|over_email_send/i.test(code)) return true
  return /rate limit|too many|for security purposes/i.test(err.message || '')
}

// "For security purposes, you can only request this after 43 seconds."
// That one IS per-user and genuinely short, so we can promise a real wait.
function secondsToWait(err) {
  const m = /after (\d+) seconds?/i.exec(err?.message || '')
  return m ? parseInt(m[1], 10) : null
}

const SUPPORT = 'aman@san4.in'

// `context` shapes the copy: 'signup' | 'signin' | 'email' (link/reset sends).
export function friendlyAuthError(err, context = 'signin') {
  if (!err) return ''
  const msg = err.message || ''

  if (isRateLimited(err)) {
    const wait = secondsToWait(err)
    if (wait) return `Almost there — please wait ${wait} seconds and try again.`
    // No countdown means the project-wide hourly cap, which we cannot shorten
    // from the client. Say plainly that it is our problem, not theirs.
    return context === 'signup'
      ? `We've hit our hourly limit for sending signup emails — that's our side, not yours. Please try again a little later. If it keeps happening, email ${SUPPORT} and we'll set your account up by hand.`
      : `We've hit our hourly limit for sending emails — that's our side, not yours. Please try again a little later, or sign in with your password if you have one.`
  }

  if (/invalid login credentials/i.test(msg))
    return 'That email and password don’t match. Check for typos, or use "Forgot password?" below.'

  if (/email not confirmed/i.test(msg))
    return 'Please confirm your email first — check your inbox (and spam) for the link from Vak.'

  if (/user already registered|already been registered/i.test(msg))
    return 'You already have an account with this email. Try signing in instead.'

  if (/password should be at least/i.test(msg))
    return 'Use at least 6 characters for your password.'

  if (/unable to validate email|invalid email/i.test(msg))
    return 'That email address doesn’t look right. Mind checking it?'

  if (/signups not allowed|signup is disabled/i.test(msg))
    return `New signups are paused right now. Email ${SUPPORT} if you need access.`

  // Network / project-paused: Supabase surfaces this as a generic fetch failure.
  if (/failed to fetch|networkerror|load failed/i.test(msg))
    return 'We can’t reach our servers right now. Check your connection and try again in a moment.'

  // Anything unmapped: keep the technical detail in the console for us, and
  // give the user a plain sentence rather than an API string.
  console.warn('auth error:', err.status, err.code, msg)
  return `Something went wrong on our side. Please try again — and if it persists, email ${SUPPORT}.`
}
