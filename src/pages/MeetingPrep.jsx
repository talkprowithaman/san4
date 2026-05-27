import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { generateTalkingPoints } from '../lib/gemini'
import Navbar from '../components/Navbar'

const PRIORITY_STYLE = {
  high:   'border-l-primary bg-primary/5',
  medium: 'border-l-teal bg-teal/5',
  low:    'border-l-navy-400 bg-navy-700/50',
}
const PRIORITY_LABEL = { high: 'Must Cover', medium: 'Should Cover', low: 'If Time Allows' }
const PRIORITY_COLOR = { high: 'text-primary', medium: 'text-teal', low: 'text-muted' }

export default function MeetingPrep() {
  const { user } = useAuth()

  const [form, setForm] = useState({ title: '', agenda: '' })
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState(false)
  const [history, setHistory] = useState([])
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    if (user) fetchHistory()
  }, [user])

  async function fetchHistory() {
    const { data } = await supabase
      .from('meeting_preps')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setHistory(data || [])
  }

  async function handleGenerate(e) {
    e.preventDefault()
    if (!form.agenda.trim()) return
    setLoading(true)
    setResult(null)
    setSaved(false)

    try {
      const data = await generateTalkingPoints(form.title || 'Meeting', form.agenda)
      setResult(data)
    } catch {
      setResult(null)
      alert('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  async function savePrep() {
    if (!result || !user) return
    await supabase.from('meeting_preps').insert({
      user_id:       user.id,
      meeting_title: form.title || 'Untitled Meeting',
      agenda:        form.agenda,
      talking_points: result.talking_points,
    })
    setSaved(true)
    fetchHistory()
  }

  function copyAll() {
    const text = result.talking_points
      .map((p, i) => `${i + 1}. ${p.point}\n   Tip: ${p.tip}`)
      .join('\n\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function reset() {
    setForm({ title: '', agenda: '' })
    setResult(null)
    setSaved(false)
  }

  return (
    <div className="min-h-screen bg-navy-900">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-black text-white">Meeting Prep</h1>
          <p className="text-muted mt-1">Paste your agenda. Get AI-generated talking points in 90 seconds.</p>
        </div>

        {!result ? (
          /* ── Input Form ── */
          <form onSubmit={handleGenerate} className="space-y-5 animate-fade-in">
            <div>
              <label className="block text-sm text-muted mb-1.5">Meeting title <span className="text-navy-500">(optional)</span></label>
              <input
                className="input"
                placeholder="e.g. Q3 Client Review, Performance Appraisal, Project Kickoff"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">
                Agenda / Context <span className="text-primary">*</span>
              </label>
              <textarea
                className="input min-h-40 resize-none"
                placeholder={`Describe what this meeting is about. The more context, the better the talking points.\n\nExample:\n"Meeting with a client from Wipro. They're unhappy about delivery delays in Q2. I need to explain what went wrong, what we've fixed, and propose a timeline for Q3."`}
                value={form.agenda}
                onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
                required
              />
              <p className="text-muted text-xs mt-1.5">
                Tip: Include who you're meeting, the goal, any concerns or challenges, and what outcome you want.
              </p>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading || !form.agenda.trim()}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin text-lg">⟳</span> Generating talking points…
                </span>
              ) : 'Generate Talking Points →'}
            </button>
          </form>

        ) : (
          /* ── Results ── */
          <div className="animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-white font-bold text-xl">{form.title || 'Meeting Prep'}</h2>
                <p className="text-muted text-sm">{result.talking_points?.length} talking points generated</p>
              </div>
              <div className="flex gap-2">
                <button onClick={copyAll} className="btn-ghost text-sm">
                  {copied ? '✓ Copied!' : 'Copy all'}
                </button>
                <button onClick={reset} className="btn-secondary text-sm py-2">
                  New prep
                </button>
              </div>
            </div>

            {/* Opening line */}
            {result.opening_line && (
              <div className="card border-teal/30 bg-teal/5 mb-5">
                <div className="flex gap-3">
                  <span className="text-xl">🎤</span>
                  <div>
                    <div className="text-teal font-semibold text-sm mb-1">Opening Line</div>
                    <p className="text-white text-sm italic">"{result.opening_line}"</p>
                  </div>
                </div>
              </div>
            )}

            {/* Talking points */}
            <div className="space-y-3 mb-5">
              {result.talking_points?.map((p, i) => (
                <div key={i} className={`card border-l-4 ${PRIORITY_STYLE[p.priority]}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-start gap-3">
                      <span className="text-muted font-black text-sm mt-0.5 w-5 shrink-0">{i + 1}</span>
                      <h4 className="text-white font-semibold text-sm leading-tight">{p.point}</h4>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${PRIORITY_COLOR[p.priority]}`}>
                      {PRIORITY_LABEL[p.priority]}
                    </span>
                  </div>
                  {p.tip && (
                    <div className="flex gap-3 ml-8 mt-2">
                      <span className="text-yellow-400 text-xs">💡</span>
                      <p className="text-muted text-xs leading-relaxed">{p.tip}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Watch out */}
            {result.watch_out && (
              <div className="card border-red-500/20 bg-red-500/5 mb-6">
                <div className="flex gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <div className="text-red-400 font-semibold text-sm mb-1">Watch Out</div>
                    <p className="text-muted text-sm">{result.watch_out}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Save button */}
            {!saved ? (
              <button onClick={savePrep} className="btn-secondary w-full">
                Save this prep to my history
              </button>
            ) : (
              <div className="text-center text-teal text-sm font-semibold">✓ Saved to your history</div>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 0 && !result && (
          <div className="mt-10">
            <h3 className="text-white font-semibold mb-4">Recent Preps</h3>
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="card flex items-center gap-3 hover:border-navy-500 transition-all">
                  <span className="text-xl">📋</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{h.meeting_title}</div>
                    <div className="text-muted text-xs">
                      {new Date(h.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {' · '}{h.talking_points?.length || 0} points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
