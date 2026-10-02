import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { useSessions } from '../hooks/useSessions'
import { getCommScore, getLastMetrics } from '../lib/san4Score'
import { getMyCredential, publishCredential, linkedInAddUrl, renderCredentialPng } from '../lib/credential'
import { shareCard } from '../lib/shareCard'
import { track } from '../lib/analytics'
import { C, F, mono } from '../lib/ink'
import { TabScreen, Btn, TextBtn, H1, Rows, Row, Notice, ChevronIcon } from '../components/ink/Ink'
import CredentialCard from '../components/ink/CredentialCard'

// The verified page and badge are Pro (design: "Pro is depth, not access").
// Flip this to make publishing free for everyone.
const CREDENTIAL_REQUIRES_PRO = true

const PUBLISH_ERRORS = {
  no_score_yet: 'Do one rep or the 2-minute test first, so there is a number to verify.',
  setup: 'The public credential is not switched on yet. Try again soon.',
  failed: 'Could not publish right now. Check your connection and try again.',
}

// ── 19 · Me — your credential ──────────────────────────────────────────────
export default function Me() {
  const navigate = useNavigate()
  const { user, profile, signOut, updateName } = useAuth()
  const { isPro, loading: subLoading } = useSubscription()
  const { score, sessionsTotal, firstSessionAt, loading } = useSessions()
  const [cred, setCred] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [nameDraft, setNameDraft] = useState('')
  const metrics = getLastMetrics(user?.id) || {}
  const canPublish = !CREDENTIAL_REQUIRES_PRO || isPro

  useEffect(() => { getMyCredential(user?.id).then(setCred) }, [user])

  async function publish() {
    setError('')
    if (!canPublish) { navigate('/pro'); return null }
    setBusy(true)
    const res = await publishCredential({ comm: getCommScore(user?.id), clarity: metrics.clarity, structure: metrics.structure, name: profile?.name })
    setBusy(false)
    if (res.error === 'pro_required') { navigate('/pro'); return null }
    if (res.error) { setError(PUBLISH_ERRORS[res.error]); return null }
    track('credential_published', {})
    const fresh = await getMyCredential(user?.id)
    setCred(fresh || { code: res.code })
    return res.code
  }

  // Keep a published page in step with the live number.
  useEffect(() => {
    if (!cred?.published || !canPublish || loading || score == null || cred.score === score) return
    publishCredential({ comm: getCommScore(user?.id), clarity: metrics.clarity, structure: metrics.structure, name: profile?.name })
      .then(r => { if (r.code) getMyCredential(user?.id).then(setCred) })
  }, [cred?.code, score, loading, canPublish]) // eslint-disable-line

  const code = cred?.published ? cred.code : null

  async function openPage() {
    const c = await publish()
    if (c) navigate(`/a/${c}`)
  }

  async function addToProfile() {
    const c = await publish()
    if (!c) return
    track('credential_linkedin', {})
    window.open(linkedInAddUrl({ score, code: c, date: new Date() }), '_blank', 'noopener')
  }

  async function download() {
    if (score == null) return
    const blob = await renderCredentialPng({
      score, name: profile?.name, sessions: sessionsTotal, date: firstSessionAt, code,
      clarity: metrics.clarity, structure: metrics.structure,
    })
    shareCard(blob, `My San4 Score is ${score}. One number for how I communicate.${code ? ' Verify it: ' + window.location.origin + '/a/' + code : ''}`)
  }

  return (
    <TabScreen>
      <H1 size={27} mb={20}>Your credential</H1>

      <CredentialCard score={score} name={profile?.name} sessions={sessionsTotal} date={firstSessionAt} code={code} />

      {!profile?.name && (
        <form onSubmit={e => { e.preventDefault(); updateName(user.id, nameDraft) }} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input className="input" placeholder="Your name, as it should read on the card" value={nameDraft}
            onChange={e => setNameDraft(e.target.value)} style={{ fontSize: 13.5, padding: '12px 14px' }} />
          <button type="submit" disabled={!nameDraft.trim()} style={{
            border: 'none', borderRadius: 14, padding: '0 16px', background: C.paper, color: C.ink, font: `700 13px ${F.sans}`, cursor: 'pointer', opacity: nameDraft.trim() ? 1 : 0.45,
          }}>Save</button>
        </form>
      )}

      {error && <Notice tone="red" style={{ marginTop: 12 }}>{error}</Notice>}

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {score == null ? (
          <Btn to="/assessment">Get your San4 Score</Btn>
        ) : (
          <>
            <Btn kind="outline" onClick={openPage} disabled={busy || subLoading} style={{ padding: 15, borderRadius: 15, fontSize: 14 }}>
              {canPublish ? (code ? 'Open my public page' : 'Publish my public page') : 'Open my public page · Pro'}
            </Btn>
            <Btn onClick={addToProfile} disabled={busy || subLoading} style={{ padding: 15, borderRadius: 15, fontSize: 14 }}>
              {canPublish ? 'Add to my LinkedIn profile' : 'Add to my profile · Pro'}
            </Btn>
          </>
        )}
      </div>
      {score != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 12 }}>
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: C.dim }}>Exports as a light card, because that is the surface it lands on.</p>
          <TextBtn onClick={download} color={C.lilac} style={{ flex: 'none' }}>Download</TextBtn>
        </div>
      )}

      <div style={{ ...mono(10), margin: '28px 0 10px' }}>YOU</div>
      <Rows>
        <Row label="Score history" value={<ChevronIcon size={14} color={C.dim} />} onClick={() => navigate('/progress')} />
        <Row label="Every rep, every score" value={<ChevronIcon size={14} color={C.dim} />} onClick={() => navigate('/dashboard')} />
        <Row label="Reminders" value={<ChevronIcon size={14} color={C.dim} />} onClick={() => navigate('/reminders')} />
        <Row label="Plan" value={isPro ? 'PRO' : 'FREE'} valueColor={isPro ? C.teal : C.dim} onClick={() => navigate('/pro')} />
        <Row label="Privacy" value={<ChevronIcon size={14} color={C.dim} />} onClick={() => navigate('/privacy')} />
      </Rows>
      <TextBtn onClick={async () => { await signOut(); navigate('/start') }} style={{ display: 'block', margin: '18px auto 0' }}>Sign out</TextBtn>
    </TabScreen>
  )
}
