import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuth'
import { getPublicCredential, getMyCredential, credentialHost, fmtCredDate } from '../lib/credential'
import { C, mono } from '../lib/ink'
import { Screen, Back, Btn, H1, Sub, Spacer, Rows, Row, Dots } from '../components/ink/Ink'
import CredentialCard from '../components/ink/CredentialCard'

// ── 20 · Public page — anyone with the link can check the score is real ─────
// Shows the number, the history and nothing else. Recordings are never here.
export default function Credential() {
  const { code } = useParams()
  const { user } = useAuthStore()
  const [cred, setCred] = useState(undefined) // undefined = loading, null = not found
  const [mine, setMine] = useState(false)

  useEffect(() => {
    getPublicCredential(code).then(c => setCred(c || null))
  }, [code])

  useEffect(() => {
    if (!user || !cred) return
    getMyCredential(user.id).then(m => setMine(!!m && m.code === cred.code))
  }, [user, cred])

  useEffect(() => {
    if (cred) document.title = `${cred.display_name || 'San4 member'} · San4 Score ${cred.score}`
    return () => { document.title = 'San4 — Communicate with Confidence' }
  }, [cred])

  if (cred === undefined) return (
    <Screen><div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Dots /></div></Screen>
  )

  if (cred === null) return (
    <Screen pad="36px 30px 30px">
      <div style={mono(10, C.dim, '.18em')}>PUBLIC PAGE · {credentialHost(code).toUpperCase()}</div>
      <H1 size={26} style={{ margin: '16px 0 12px' }}>There is no published credential at this link.</H1>
      <Sub>It may have been taken down by its owner, or the link is mistyped.</Sub>
      <Spacer />
      <Btn to="/start">Get your own San4 Score</Btn>
    </Screen>
  )

  return (
    <Screen pad="28px 28px 26px">
      {mine && <Back to="/me" mb={20} />}
      <div style={mono(10, C.dim, '.18em')}>PUBLIC PAGE · {credentialHost(cred.code).toUpperCase()}</div>
      <H1 size={26} style={{ margin: '16px 0 20px' }}>Anyone with this link can check the score is real.</H1>

      <CredentialCard score={cred.score} name={cred.display_name} sessions={cred.sessions_count} date={cred.first_assessed}
        code={cred.code} clarity={cred.clarity} structure={cred.structure} />

      <Rows style={{ marginTop: 16 }}>
        <Row label="Sessions behind it" value={cred.sessions_count} />
        <Row label="First assessed" value={fmtCredDate(cred.first_assessed) || '—'} />
        <Row label="Last updated" value={fmtCredDate(cred.updated_at)} />
        <Row label="Scored in" value={(cred.scored_in || 'English').toUpperCase()} />
      </Rows>
      <p style={{ margin: '18px 0 0', fontSize: 12.5, lineHeight: 1.6, color: C.dim }}>
        Recordings are never published. The page shows the number, the history and nothing else.
      </p>
      <Spacer min={24} />
      {mine
        ? <Btn to="/today" style={{ padding: 16, borderRadius: 15, fontSize: 14.5 }}>Back to Today</Btn>
        : <Btn to={user ? '/today' : '/start'} style={{ padding: 16, borderRadius: 15, fontSize: 14.5 }}>{user ? 'Back to San4' : 'Get your own San4 Score'}</Btn>}
    </Screen>
  )
}
