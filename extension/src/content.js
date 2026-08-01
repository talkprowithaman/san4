// San4 Live Coach — in-call UI (injected on meet.google.com).
//
// Flow: detect an active Meet call -> show a "Coach this call?" prompt ->
// on accept, transcribe the user's mic live (Web Speech API) -> "Stop & coach"
// -> analysis (via background -> /api/gemini) -> report with score, fillers,
// fixes, and "Watch this to improve" videos -> open in San4.
//
// Styles live in a Shadow DOM so Meet's CSS can't touch us and ours can't touch
// Meet. The mic (user's side) is what we coach; other-side capture is scaffolded
// in background/offscreen.

const MIN_COACH_SECONDS = 20
let host, shadow, state = 'idle' // idle | prompt | listening | analyzing | report
let recognition = null
let transcript = ''
let interim = ''
let startedAt = 0
let timerId = null

// Only show up on an actual call URL: meet.google.com/abc-defg-hij
function onCallPage() {
  return /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(location.pathname)
}

function mount() {
  if (host || !onCallPage()) return
  host = document.createElement('div')
  host.id = 'san4-live-coach-host'
  host.style.cssText = 'position:fixed;z-index:2147483647;right:16px;bottom:16px;'
  shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = CSS
  shadow.appendChild(style)
  const root = document.createElement('div')
  root.id = 'root'
  shadow.appendChild(root)
  document.documentElement.appendChild(host)
  state = 'prompt'
  render()
}

function unmount() {
  stopListening()
  host?.remove()
  host = null; shadow = null; state = 'idle'; transcript = ''; interim = ''
}

// ── Speech recognition (user's mic) ──────────────────────────────────────────
function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) { alert('San4: your browser does not support live transcription. Try Chrome.'); return }
  transcript = ''; interim = ''
  recognition = new SR()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'en-IN'
  recognition.onresult = e => {
    interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) transcript += r[0].transcript + ' '
      else interim += r[0].transcript
    }
    if (state === 'listening') render()
  }
  // Web Speech self-terminates; revive it while we're still listening.
  recognition.onend = () => { if (state === 'listening') { try { recognition.start() } catch {} } }
  recognition.onerror = () => {}
  try { recognition.start() } catch {}

  startedAt = Date.now()
  timerId = setInterval(() => { if (state === 'listening') render() }, 1000)
  state = 'listening'

  // Scaffold: also capture the other side (tab audio) for future STT.
  chrome.runtime.sendMessage({ type: 'START_TAB_CAPTURE', tabId: null }, () => {})
  render()
}

function stopListening() {
  clearInterval(timerId); timerId = null
  if (recognition) { try { recognition.onend = null; recognition.stop() } catch {} recognition = null }
  chrome.runtime.sendMessage({ type: 'STOP_TAB_CAPTURE' }, () => {})
}

function elapsed() { return Math.floor((Date.now() - startedAt) / 1000) }
function fmt(s) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` }

// ── Analyze ──────────────────────────────────────────────────────────────────
async function coach() {
  const full = (transcript + ' ' + interim).trim()
  if (elapsed() < MIN_COACH_SECONDS || full.length < 40) {
    flash('Speak a bit more first, then tap Stop & coach.')
    return
  }
  stopListening()
  state = 'analyzing'; render()

  chrome.runtime.sendMessage({ type: 'ANALYZE', transcript: full, context: 'Google Meet call' }, async resp => {
    if (!resp?.ok) {
      state = 'report'
      renderError(resp?.error === 'rate_limited'
        ? 'Free coaching limit reached for now. Sign in to San4 to keep going.'
        : 'Could not score this one. Please try again.')
      return
    }
    window.__san4_report = resp.report
    state = 'report'
    await renderReport(resp.report)
  })
}

// ── Rendering ────────────────────────────────────────────────────────────────
function root() { return shadow.getElementById('root') }
function flash(text) {
  const el = shadow.getElementById('flash')
  if (el) { el.textContent = text; el.style.opacity = '1'; setTimeout(() => el.style.opacity = '0', 2600) }
}

function render() {
  if (!shadow) return
  if (state === 'prompt')     return renderPrompt()
  if (state === 'listening')  return renderListening()
  if (state === 'analyzing')  return renderAnalyzing()
}

function renderPrompt() {
  root().innerHTML = `
    <div class="card prompt">
      <div class="head"><span class="logo">🦢</span><b>San4 Live Coach</b><button id="x" class="x">✕</button></div>
      <p class="sub">Want me to listen to how <b>you</b> speak on this call and coach you after? Only your mic is analysed.</p>
      <div class="row">
        <button id="start" class="btn primary">🎙️ Coach this call</button>
        <button id="dismiss" class="btn ghost">Not now</button>
      </div>
      <p class="fine">You'll get a rating, filler-word count, fixes, and videos to improve.</p>
      <div id="flash" class="flash"></div>
    </div>`
  shadow.getElementById('start').onclick = startListening
  shadow.getElementById('dismiss').onclick = () => host.style.display = 'none'
  shadow.getElementById('x').onclick = () => host.style.display = 'none'
}

function renderListening() {
  const words = (transcript + interim).trim()
  root().innerHTML = `
    <div class="card">
      <div class="head"><span class="dot"></span><b>Listening…</b><span class="time">${fmt(elapsed())}</span></div>
      <div class="transcript">${words ? escapeHtml(words.slice(-320)) : '<span class="muted">Start speaking…</span>'}<span class="interim">${escapeHtml(interim)}</span></div>
      <button id="stop" class="btn primary wide">⏹ Stop &amp; coach</button>
      <div id="flash" class="flash"></div>
    </div>`
  shadow.getElementById('stop').onclick = coach
}

function renderAnalyzing() {
  root().innerHTML = `
    <div class="card center">
      <div class="spinner"></div>
      <b>Scoring how you communicated…</b>
      <p class="sub">Clarity, confidence, fillers and fixes</p>
    </div>`
}

function renderError(text) {
  root().innerHTML = `
    <div class="card">
      <div class="head"><span class="logo">🦢</span><b>San4</b><button id="x" class="x">✕</button></div>
      <p class="sub">${escapeHtml(text)}</p>
      <button id="again" class="btn ghost wide">Try again</button>
    </div>`
  shadow.getElementById('x').onclick = unmount
  shadow.getElementById('again').onclick = () => { state = 'prompt'; render() }
}

async function renderReport(r) {
  const color = r.overall_score >= 80 ? '#00C49A' : r.overall_score >= 60 ? '#FF6B35' : '#F87171'
  const strengths = (r.strengths || []).slice(0, 3).map(s => `<li>${escapeHtml(s)}</li>`).join('')
  const improvements = (r.improvements || []).slice(0, 3).map(s => `<li>${escapeHtml(s)}</li>`).join('')
  const fixes = (r.fixes || []).slice(0, 2).map(f =>
    `<div class="fix"><s>${escapeHtml(f.issue)}</s><span>→ ${escapeHtml(f.better)}</span></div>`).join('')

  // Reuse the app's weakness -> video map (shared module).
  let vids = []
  try {
    const mod = await import(chrome.runtime.getURL('src/lib/communicationVideos.js'))
    vids = mod.recommendedVideos(r.weaknesses || [], 3)
  } catch {}
  const videoHtml = vids.map(v => `
    <a class="vid" href="${v.url}" target="_blank" rel="noopener">
      ${v.thumbnail ? `<img src="${v.thumbnail}" />` : `<div class="vthumb">🔎</div>`}
      <div class="vmeta"><span class="vtitle">${escapeHtml(v.title)}</span>
      <span class="vchan ${v.source}">${v.source === 'owned' ? '▶ ' + escapeHtml(v.channel) : 'Search on YouTube'}</span></div>
    </a>`).join('')

  root().innerHTML = `
    <div class="card report">
      <div class="head"><span class="logo">🦢</span><b>Your call, coached</b><button id="x" class="x">✕</button></div>
      <div class="score" style="color:${color}">${r.overall_score}<small>/100</small></div>
      <p class="sub">${escapeHtml(r.summary || '')}</p>
      <div class="fillers">Filler words: <b>${r.filler_word_count ?? 0}</b>${(r.top_filler_words||[]).length ? ' · ' + (r.top_filler_words||[]).slice(0,4).map(escapeHtml).join(', ') : ''}</div>
      ${strengths ? `<div class="sec"><h4 class="good">✅ What worked</h4><ul>${strengths}</ul></div>` : ''}
      ${improvements ? `<div class="sec"><h4 class="warn">↑ Work on this</h4><ul>${improvements}</ul></div>` : ''}
      ${fixes ? `<div class="sec"><h4 class="acc">✍️ Say it this way</h4>${fixes}</div>` : ''}
      ${videoHtml ? `<div class="sec"><h4 class="warn">📺 Watch this to improve</h4>${videoHtml}</div>` : ''}
      <div class="row">
        <button id="san4" class="btn primary">Open in San4</button>
        <button id="again" class="btn ghost">Coach again</button>
      </div>
    </div>`
  shadow.getElementById('x').onclick = unmount
  shadow.getElementById('again').onclick = () => { state = 'prompt'; render() }
  shadow.getElementById('san4').onclick = () => window.open('https://san4.vercel.app/call-analyzer', '_blank')
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
}

// ── SPA nav: Meet swaps URLs without reloads ─────────────────────────────────
let lastPath = location.pathname
setInterval(() => {
  if (location.pathname !== lastPath) {
    lastPath = location.pathname
    if (onCallPage()) mount()
    else unmount()
  }
}, 1500)
setTimeout(mount, 2500)

const CSS = `
  * { box-sizing: border-box; font-family: 'DM Sans', system-ui, sans-serif; }
  #root { width: 320px; }
  .card { background:#0B1220; color:#F1F5F9; border:1px solid rgba(255,255,255,.1);
    border-radius:18px; padding:16px; box-shadow:0 20px 60px rgba(0,0,0,.5); }
  .card.center { text-align:center; display:flex; flex-direction:column; align-items:center; gap:8px; }
  .head { display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:14px; }
  .head b { flex:1; }
  .logo { font-size:18px; }
  .x { background:none; border:none; color:#6B8CAE; cursor:pointer; font-size:14px; }
  .sub { font-size:13px; color:#94A3B8; line-height:1.5; margin:0 0 12px; }
  .fine { font-size:11px; color:#6B8CAE; margin:10px 0 0; }
  .row { display:flex; gap:8px; }
  .btn { border:none; border-radius:100px; padding:10px 14px; font-weight:700; font-size:13px; cursor:pointer; }
  .btn.wide { width:100%; margin-top:10px; }
  .btn.primary { background:linear-gradient(135deg,#7B5EA7,#4FACFE); color:#fff; flex:1; }
  .btn.ghost { background:rgba(255,255,255,.06); color:#cbd5e1; border:1px solid rgba(255,255,255,.12); }
  .dot { width:10px; height:10px; border-radius:50%; background:#F87171; animation:p 1s infinite; }
  @keyframes p { 50% { opacity:.35; } }
  .time { font-variant-numeric:tabular-nums; color:#94A3B8; font-size:13px; }
  .transcript { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
    border-radius:12px; padding:10px; font-size:13px; line-height:1.5; min-height:64px; max-height:140px; overflow:auto; }
  .interim { color:#6B8CAE; }
  .muted { color:#6B8CAE; }
  .spinner { width:26px; height:26px; border:3px solid rgba(255,255,255,.15); border-top-color:#7B5EA7;
    border-radius:50%; animation:s .8s linear infinite; }
  @keyframes s { to { transform:rotate(360deg); } }
  .report { max-height:78vh; overflow:auto; width:340px; }
  .score { font-size:42px; font-weight:800; line-height:1; margin:2px 0 6px; }
  .score small { font-size:16px; color:#6B8CAE; font-weight:600; }
  .fillers { font-size:12px; color:#cbd5e1; background:rgba(255,255,255,.04); border-radius:10px; padding:8px 10px; margin-bottom:12px; }
  .sec { margin-bottom:12px; }
  .sec h4 { font-size:12px; margin:0 0 6px; }
  .sec ul { margin:0; padding-left:16px; }
  .sec li { font-size:12px; color:#94A3B8; margin-bottom:4px; line-height:1.4; }
  .good { color:#00C49A; } .warn { color:#FF6B35; } .acc { color:#A78BFA; }
  .fix { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:10px; padding:8px; margin-bottom:6px; }
  .fix s { display:block; color:#8B95A8; font-size:11px; margin-bottom:3px; }
  .fix span { color:#E2E8F0; font-size:12px; }
  .vid { display:flex; gap:8px; align-items:center; text-decoration:none; background:rgba(255,255,255,.03);
    border:1px solid rgba(255,255,255,.07); border-radius:10px; padding:6px; margin-bottom:6px; }
  .vid img, .vthumb { width:64px; height:38px; border-radius:6px; object-fit:cover; flex-shrink:0; }
  .vthumb { background:rgba(255,107,53,.14); display:flex; align-items:center; justify-content:center; }
  .vmeta { min-width:0; display:flex; flex-direction:column; }
  .vtitle { color:#fff; font-size:12px; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .vchan { font-size:11px; color:#6B8CAE; } .vchan.owned { color:#A78BFA; }
  .flash { color:#FCA5A5; font-size:11px; margin-top:8px; opacity:0; transition:opacity .3s; min-height:14px; }
`
