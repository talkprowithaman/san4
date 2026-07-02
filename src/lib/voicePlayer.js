// Plays raw 16-bit mono PCM (from Gemini TTS) by wrapping it in a WAV header
// the browser can play. Tracks the current clip so we can stop it when the user
// starts talking.
//
// Autoplay gotcha: Chrome only lets audio start close to a user gesture. Neural
// TTS takes 1-2s to generate, so by the time the audio arrives the gesture has
// "expired" and play() is rejected, which used to silently fall back to the
// robotic browser voice (the "two different voices" bug). Fix: primeAudio()
// unlocks a persistent <audio> element synchronously inside the click handler;
// an element that has played once (even silence) keeps its playback permission
// when we swap its src later.
let sharedAudio = null
let primed = false
let playToken = 0

// 50ms of silence as a WAV data URI, tiny and instant.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA='

// Call synchronously inside a click/tap handler (e.g. "Start Session", the mic
// button) before any awaited work. Safe to call repeatedly.
export function primeAudio() {
  try {
    if (!sharedAudio) sharedAudio = new Audio()
    if (primed) return
    sharedAudio.src = SILENT_WAV
    const p = sharedAudio.play()
    if (p?.then) p.then(() => { primed = true }).catch(() => { /* not fatal */ })
    else primed = true
  } catch { /* not fatal */ }
}

export function playPcmBase64(base64, sampleRate = 24000, { onstart, onend } = {}) {
  stopPlayback()
  const token = ++playToken
  const blob = pcmToWavBlob(base64ToBytes(base64), sampleRate)
  const url = URL.createObjectURL(blob)

  // Reuse the primed element so playback permission carries over.
  if (!sharedAudio) sharedAudio = new Audio()
  const el = sharedAudio
  const cleanup = () => {
    URL.revokeObjectURL(url)
    if (token === playToken) onend?.()
  }
  el.onplay  = () => { if (token === playToken) onstart?.() }
  el.onended = cleanup
  el.onerror = cleanup
  el.src = url
  return el.play().catch(err => {
    cleanup()
    throw err // let callers fall back (e.g. to browser TTS)
  })
}

export function stopPlayback() {
  playToken++ // invalidate in-flight callbacks
  if (sharedAudio) {
    try { sharedAudio.pause() } catch { /* ignore */ }
  }
}

function base64ToBytes(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function pcmToWavBlob(pcmBytes, sampleRate) {
  const dataSize = pcmBytes.length
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)  // PCM
  view.setUint16(22, 1, true)  // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)
  new Uint8Array(buffer, 44).set(pcmBytes)
  return new Blob([buffer], { type: 'audio/wav' })
}
