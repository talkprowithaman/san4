import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { sendPracticeMessage, analyzeSession } from '../lib/gemini'
import Navbar from '../components/Navbar'

export default function PracticeSession() {
  const { scenarioId }    = useParams()
  const { state }         = useLocation()
  const { user }          = useAuth()
  const navigate          = useNavigate()
  const bottomRef         = useRef(null)
  const inputRef          = useRef(null)

  const scenario = state?.scenario || { id: scenarioId, title: scenarioId, icon: '🎭' }

  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [aiThinking,setAiThinking]= useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [report,    setReport]    = useState(null)
  const [seconds,   setSeconds]   = useState(0)
  const [started,   setStarted]   = useState(false)

  // Timer
  useEffect(() => {
    if (!started) return
    const t = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [started])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, aiThinking])

  // Start session with AI opening
  useEffect(() => {
    startSession()
  }, [])

  async function startSession() {
    setStarted(true)
    setAiThinking(true)
    try {
      const opening = await sendPracticeMessage(scenario.id, [], 'Start the session now.')
      setMessages([{ role: 'ai', content: opening }])
    } catch {
      setMessages([{ role: 'ai', content: "Let's begin. I'm ready when you are." }])
    }
    setAiThinking(false)
    inputRef.current?.focus()
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || aiThinking) return
    setInput('')

    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setAiThinking(true)

    try {
      const response = await sendPracticeMessage(scenario.id, messages, text)

      if (response.includes('[SESSION_ENDED]')) {
        const clean = response.replace('[SESSION_ENDED]', '').trim()
        if (clean) setMessages([...newMessages, { role: 'ai', content: clean }])
        await endSession([...newMessages, { role: 'ai', content: clean }])
      } else {
        setMessages([...newMessages, { role: 'ai', content: response }])
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'ai', content: 'Sorry, something went wrong. Please try again.' }])
    }
    setAiThinking(false)
  }

  async function endSession(finalMessages) {
    const msgList = finalMessages || messages
    setAnalyzing(true)

    try {
      const analysis = await analyzeSession(scenario.title, msgList)

      // Save to Supabase
      if (user) {
        await supabase.from('practice_sessions').insert({
          user_id:          user.id,
          scenario_id:      scenario.id,
          scenario_title:   scenario.title,
          messages:         msgList,
          filler_word_count: analysis.filler_word_count,
          confidence_score:  analysis.confidence_score,
          pacing_score:      analysis.pacing_score,
          overall_score:     analysis.overall_score,
          duration_seconds:  seconds,
          feedback:          analysis.summary,
          action_item:       analysis.action_item,
        })
      }

      setReport(analysis)
    } catch {
      setReport({
        overall_score: 70, confidence_score: 70, pacing_score: 70,
        filler_word_count: 0, top_filler_words: [],
        strengths: ['You completed the session'], improvements: ['Keep practicing daily'],
        action_item: 'Try this scenario again tomorrow.',
        summary: 'Session completed. Regular practice builds real confidence.',
      })
    }
    setAnalyzing(false)
  }

  function fmt(s) {
    const m = Math.floor(s / 60); const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  function scoreColor(s) {
    if (s >= 80) return 'text-teal'
    if (s >= 60) return 'text-primary'
    return 'text-red-400'
  }

  // ── Report view ─────────────────────────────────────────────────────────────
  if (report) return (
    <div className="min-h-screen bg-navy-900">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 animate-slide-up">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{scenario.icon}</div>
          <h1 className="text-2xl font-black text-white">Session Complete</h1>
          <p className="text-muted text-sm mt-1">{scenario.title} · {fmt(seconds)}</p>
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Overall',    val: report.overall_score },
            { label: 'Confidence', val: report.confidence_score },
            { label: 'Pacing',     val: report.pacing_score },
          ].map(({ label, val }) => (
            <div key={label} className="card text-center">
              <div className={`text-4xl font-black ${scoreColor(val)}`}>{val}%</div>
              <div className="text-muted text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Filler words */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold">Filler Words</h3>
            <span className={`font-black text-xl ${report.filler_word_count > 10 ? 'text-red-400' : report.filler_word_count > 5 ? 'text-primary' : 'text-teal'}`}>
              {report.filler_word_count}
            </span>
          </div>
          {report.top_filler_words?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {report.top_filler_words.map(w => (
                <span key={w} className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-1 rounded-full">"{w}"</span>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="card mb-4">
          <h3 className="text-white font-semibold mb-2">Coach's Summary</h3>
          <p className="text-muted text-sm leading-relaxed">{report.summary}</p>
        </div>

        {/* Strengths + Improvements */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="card">
            <h3 className="text-teal font-semibold mb-3">✓ Strengths</h3>
            <ul className="space-y-2">
              {report.strengths?.map((s, i) => (
                <li key={i} className="text-muted text-sm flex gap-2">
                  <span className="text-teal mt-0.5">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3 className="text-primary font-semibold mb-3">↑ To Improve</h3>
            <ul className="space-y-2">
              {report.improvements?.map((s, i) => (
                <li key={i} className="text-muted text-sm flex gap-2">
                  <span className="text-primary mt-0.5">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action item */}
        <div className="card border-primary/30 bg-primary/5 mb-8">
          <div className="flex gap-3 items-start">
            <div className="text-2xl">🎯</div>
            <div>
              <h3 className="text-primary font-semibold mb-1">Your Action Item</h3>
              <p className="text-white text-sm">{report.action_item}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate('/practice')} className="btn-primary flex-1">
            Practice Again →
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary flex-1">
            Dashboard
          </button>
        </div>
      </main>
    </div>
  )

  // ── Analyzing view ───────────────────────────────────────────────────────────
  if (analyzing) return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse-slow">🔍</div>
        <h2 className="text-white font-bold text-xl mb-2">Analysing your session…</h2>
        <p className="text-muted text-sm">Calculating scores, counting filler words, preparing your report.</p>
      </div>
    </div>
  )

  // ── Chat view ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      <Navbar />

      {/* Header bar */}
      <div className="border-b border-navy-600 bg-navy-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{scenario.icon}</span>
          <div>
            <div className="text-white font-semibold text-sm">{scenario.title}</div>
            <div className="text-muted text-xs">{fmt(seconds)} elapsed</div>
          </div>
        </div>
        <button
          onClick={() => endSession()}
          className="btn-secondary text-sm py-2"
        >
          End Session →
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-3xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={msg.role === 'ai' ? 'bubble-ai' : 'bubble-user'}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {aiThinking && (
          <div className="flex justify-start animate-fade-in">
            <div className="bubble-ai">
              <div className="flex gap-1.5 items-center h-5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-navy-600 bg-navy-800 p-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Type your response… (Enter to send, Shift+Enter for new line)"
            className="input flex-1 resize-none h-12 pt-3"
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || aiThinking}
            className="btn-primary px-5 h-12 flex items-center"
          >
            Send
          </button>
        </div>
        <p className="text-muted text-xs text-center mt-2">
          Type <strong>end session</strong> or click "End Session →" when you're done
        </p>
      </div>
    </div>
  )
}
