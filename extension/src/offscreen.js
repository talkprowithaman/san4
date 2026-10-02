// Offscreen document — holds the meeting tab's audio stream (the OTHER side of
// the call). Scaffolded for the MVP: it captures + records tab audio. Turning
// that audio into a "Them" transcript (chunk -> Gemini STT) is the next step,
// marked TODO. The user's own side is already transcribed live in content.js.

let stream = null
let recorder = null
let chunks = []

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.target !== 'offscreen') return

  if (msg.type === 'OFFSCREEN_START') {
    startCapture(msg.streamId)
  }
  if (msg.type === 'OFFSCREEN_STOP') {
    stopCapture()
  }
})

async function startCapture(streamId) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId },
      },
    })

    // Keep the tab audible to the user while we capture it (getUserMedia on a
    // tab mutes it otherwise).
    const ctx = new AudioContext()
    ctx.createMediaStreamSource(stream).connect(ctx.destination)

    chunks = []
    recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
    recorder.start(5000) // 5s slices — future: POST each slice to STT
    // TODO: on each slice, base64-encode and POST to a San4 STT endpoint
    // (reuse gemini.transcribeSpeech) to build the other-side transcript live.
  } catch (err) {
    console.warn('[San4] tab capture failed:', err.message)
  }
}

function stopCapture() {
  try { recorder?.stop() } catch {}
  stream?.getTracks().forEach(t => t.stop())
  stream = null; recorder = null; chunks = []
}
