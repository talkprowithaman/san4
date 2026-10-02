// San4 Live Coach — in-call UI (injected on meet.google.com).
//
// Capture strategy: record the user's mic with getUserMedia + MediaRecorder,
// then send the audio to Gemini (via background -> /api/gemini) which transcribes
// AND coaches in one call. We deliberately do NOT use the Web Speech API: it is
// unreliable, poor at Hindi, and fights Google Meet for the microphone (which is
// why capture was failing). A live mic-level meter shows the mic is working.
//
// Styles live in a Shadow DOM so Meet's CSS can't touch us and ours can't touch
// Meet. Only the user's mic is analysed.

const MIN_SECONDS = 12
let host, shadow, state = 'idle' // idle | prompt | recording | analyzing | report
let stream = null, recorder = null, chunks = []
let audioCtx = null, analyser = null, levelRAF = null
let startedAt = 0, timerId = null

function onCallPage() {
  return /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(location.pathname)
}

function mount() {
  if (host || !onCallPage()) return
  host = document.createElement('div')
  host.id = 'san4-live-coach-host'
  host.style.cssText = 'position:fixed;z-index:2147483647;right:16px;bottom:16px;'
  shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style'); style.textContent = CSS
  shadow.appendChild(style)
  const root = document.createElement('div'); root.id = 'root'
  shadow.appendChild(root)
  document.documentElement.appendChild(host)
  state = 'prompt'; render()
}

function unmount() {
  teardownCapture()
  host?.remove(); host = null; shadow = null; state = 'idle'
}

// ── Capture (mic) ────────────────────────────────────────────────────────────
function pickMime() {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
    .find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || 'audio/webm'
}

async function startRecording() {
  try {
    // Constrain to the USER's voice only. echoCancellation removes the other
    // participants leaking in through the speakers (the only way non-user voices
    // could reach the mic); noiseSuppression/autoGainControl clean the rest.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
  } catch (err) {
    const msg = err?.name === 'NotAllowedError'
      ? 'Chrome blocked the mic. Click the 🎙️/lock icon in the address bar, allow the microphone, then try again.'
      : err?.name === 'NotFoundError'
      ? 'No microphone found. Plug one in or check your input device.'
      : `Could not open the mic (${err?.name || 'error'}).`
    state = 'prompt'; render(); flash(msg)
    return
  }

  const mime = pickMime()
  chunks = []
  recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 48000 })
  recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }
  recorder.start(1000)
  recorder._mime = mime

  // Live level meter — proves the mic is actually capturing.
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioCtx.createAnalyser(); analyser.fftSize = 256
    audioCtx.createMediaStreamSource(stream).connect(analyser)
    pumpLevel()
  } catch {}

  startedAt = Date.now()
  timerId = setInterval(() => { if (state === 'recording') updateTime() }, 500)
  state = 'recording'; render()
}

function pumpLevel() {
  const buf = new Uint8Array(analyser.frequencyBinCount)
  const tick = () => {
    if (!analyser || state !== 'recording') return
    analyser.getByteTimeDomainData(buf)
    let peak = 0
    for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128))
    const pct = Math.min(100, Math.round((peak / 128) * 220))
    const bar = shadow?.getElementById('level')
    if (bar) bar.style.width = pct + '%'
    levelRAF = requestAnimationFrame(tick)
  }
  tick()
}

function teardownCapture() {
  clearInterval(timerId); timerId = null
  cancelAnimationFrame(levelRAF); levelRAF = null
  try { recorder && recorder.state !== 'inactive' && recorder.stop() } catch {}
  stream?.getTracks().forEach(t => t.stop())
  try { audioCtx?.close() } catch {}
  stream = null; analyser = null; audioCtx = null
}

function elapsed() { return Math.floor((Date.now() - startedAt) / 1000) }
function fmt(s) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` }
function updateTime() { const t = shadow?.getElementById('time'); if (t) t.textContent = fmt(elapsed()) }

// ── Stop & coach ─────────────────────────────────────────────────────────────
async function coach() {
  if (elapsed() < MIN_SECONDS) { flash(`Speak for at least ${MIN_SECONDS}s, then Stop & coach.`); return }

  // Flush the recorder and gather the audio.
  const blob = await new Promise(resolve => {
    const mime = recorder?._mime || 'audio/webm'
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }))
    try { recorder.stop() } catch { resolve(new Blob(chunks, { type: mime })) }
  })
  teardownCapture()

  if (!blob || blob.size < 2000) { state = 'prompt'; render(); flash('We did not capture any audio. Check your mic and try again.'); return }

  state = 'analyzing'; render()
  const audioBase64 = await blobToBase64(blob)
  const mimeType = (blob.type || 'audio/webm').split(';')[0]

  chrome.runtime.sendMessage({ type: 'ANALYZE_AUDIO', audioBase64, mimeType, context: 'Google Meet call' }, async resp => {
    if (chrome.runtime.lastError) { state = 'report'; renderError('Extension lost connection. Reload the Meet tab and try again.'); return }
    if (!resp?.ok) {
      const e = resp?.error
      state = 'report'
      renderError(
        e === 'no_speech'    ? 'We recorded audio but heard no clear speech. Make sure you are unmuted and speaking, then try again.'
      : e === 'rate_limited' ? 'Free coaching limit reached for now. Sign in to San4 to keep going.'
      : 'Could not score this one. Please try again.')
      return
    }
    window.__san4_report = resp.report
    state = 'report'; await renderReport(resp.report)
  })
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

// ── Rendering ────────────────────────────────────────────────────────────────
function root() { return shadow.getElementById('root') }
function flash(text) {
  const el = shadow?.getElementById('flash')
  if (el) { el.textContent = text; el.style.opacity = '1'; setTimeout(() => el.style.opacity = '0', 3600) }
}

function render() {
  if (!shadow) return
  if (state === 'prompt')    return renderPrompt()
  if (state === 'recording') return renderRecording()
  if (state === 'analyzing') return renderAnalyzing()
}

function renderPrompt() {
  root().innerHTML = `
    <div class="card">
      <div class="head"><span class="logo">🦢</span><b>San4 Live Coach</b><button id="x" class="x">✕</button></div>
      <p class="sub">Want me to listen to how <b>you</b> speak on this call and coach you after? Only your mic is recorded.</p>
      <div class="row">
        <button id="start" class="btn primary">🎙️ Coach this call</button>
        <button id="dismiss" class="btn ghost">Not now</button>
      </div>
      <p class="fine">You'll get a rating, filler count, fixes, and videos to improve.</p>
      <p class="fine">🎧 Tip: headphones keep it to only your voice.</p>
      <div id="flash" class="flash"></div>
    </div>`
  shadow.getElementById('start').onclick = startRecording
  shadow.getElementById('dismiss').onclick = () => host.style.display = 'none'
  shadow.getElementById('x').onclick = () => host.style.display = 'none'
}

function renderRecording() {
  root().innerHTML = `
    <div class="card">
      <div class="head"><span class="dot"></span><b>Recording your voice</b><span id="time" class="time">0:00</span></div>
      <div class="meter"><div id="level" class="meter-fill"></div></div>
      <p class="hint">Speak normally. The bar moves when we hear you.</p>
      <button id="stop" class="btn primary wide">⏹ Stop &amp; coach</button>
      <div id="flash" class="flash"></div>
    </div>`
  shadow.getElementById('stop').onclick = coach
}

function renderAnalyzing() {
  root().innerHTML = `
    <div class="card center">
      <div class="spinner"></div>
      <b>Transcribing &amp; scoring…</b>
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

// ── Meet is an SPA; watch for call navigation ────────────────────────────────
let lastPath = location.pathname
setInterval(() => {
  if (location.pathname !== lastPath) {
    lastPath = location.pathname
    if (onCallPage()) mount(); else unmount()
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
  .hint { font-size:11px; color:#6B8CAE; margin:8px 0 0; }
  .fine { font-size:11px; color:#6B8CAE; margin:10px 0 0; }
  .row { display:flex; gap:8px; }
  .btn { border:none; border-radius:100px; padding:10px 14px; font-weight:700; font-size:13px; cursor:pointer; }
  .btn.wide { width:100%; margin-top:12px; }
  .btn.primary { background:linear-gradient(135deg,#7B5EA7,#4FACFE); color:#fff; flex:1; }
  .btn.ghost { background:rgba(255,255,255,.06); color:#cbd5e1; border:1px solid rgba(255,255,255,.12); }
  .dot { width:10px; height:10px; border-radius:50%; background:#F87171; animation:p 1s infinite; }
  @keyframes p { 50% { opacity:.35; } }
  .time { font-variant-numeric:tabular-nums; color:#94A3B8; font-size:13px; }
  .meter { height:10px; border-radius:6px; background:rgba(255,255,255,.06); overflow:hidden; }
  .meter-fill { height:100%; width:0%; background:linear-gradient(90deg,#00C49A,#4FACFE); transition:width .08s linear; }
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
  .flash { color:#FCA5A5; font-size:11px; margin-top:8px; opacity:0; transition:opacity .3s; min-height:14px; line-height:1.4; }
`
