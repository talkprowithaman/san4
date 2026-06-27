// Plays raw 16-bit mono PCM (from Gemini TTS) by wrapping it in a WAV header
// the browser can play. Tracks the current clip so we can stop it when the user
// starts talking.
let currentAudio = null

export function playPcmBase64(base64, sampleRate = 24000, { onstart, onend } = {}) {
  stopPlayback()
  const blob = pcmToWavBlob(base64ToBytes(base64), sampleRate)
  const url = URL.createObjectURL(blob)
  const el = new Audio(url)
  currentAudio = el
  el.onplay = () => onstart?.()
  el.onended = () => { URL.revokeObjectURL(url); if (currentAudio === el) currentAudio = null; onend?.() }
  el.onerror = () => { URL.revokeObjectURL(url); if (currentAudio === el) currentAudio = null; onend?.() }
  return el.play()
}

export function stopPlayback() {
  if (currentAudio) {
    try { currentAudio.pause() } catch { /* ignore */ }
    currentAudio = null
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
