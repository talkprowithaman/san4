// Service worker — network + capture orchestration.
//
// The content script owns the in-call UI and the user's live transcript (Web
// Speech on the mic). The background owns:
//   1) analysis  — calls the San4 proxy (kept here so it runs with extension
//      privileges, not the page's origin), and
//   2) tab-audio capture — the OTHER side of the call, via an offscreen
//      document (MV3 service workers can't touch media directly).
//
// MVP note: the user's side (mic -> Web Speech -> analysis -> report) is fully
// wired. Other-side transcription (tab audio -> chunk -> Gemini STT) is
// scaffolded below and marked TODO so it can land as the next commit.
import { analyzeTranscript } from './lib/analyze.js'

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'ANALYZE') {
    analyzeTranscript(msg.transcript, { context: msg.context, authToken: msg.authToken })
      .then(report => sendResponse({ ok: true, report }))
      .catch(err => sendResponse({ ok: false, error: err.message }))
    return true // async
  }

  if (msg?.type === 'START_TAB_CAPTURE') {
    // The tab to capture is the one the content script runs in.
    startTabCapture(sender?.tab?.id)
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (msg?.type === 'STOP_TAB_CAPTURE') {
    stopTabCapture().then(() => sendResponse({ ok: true }))
    return true
  }
})

// ── Other-side audio capture (scaffold) ──────────────────────────────────────
// getMediaStreamId gives the offscreen doc a handle to the tab's audio; the
// offscreen document consumes it with getUserMedia({chromeMediaSource:'tab'}).
async function ensureOffscreen() {
  const has = await chrome.offscreen.hasDocument?.()
  if (has) return
  await chrome.offscreen.createDocument({
    url: 'src/offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Capture meeting tab audio to transcribe the other side of the call.',
  })
}

async function startTabCapture(tabId) {
  if (!tabId) return // scaffold: no tab context, skip other-side capture
  await ensureOffscreen()
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId })
  chrome.runtime.sendMessage({ target: 'offscreen', type: 'OFFSCREEN_START', streamId })
  // TODO: offscreen buffers tab audio -> POST chunks to a San4 STT endpoint
  // (reuse gemini transcribeSpeech) -> merge as the "Them" transcript track.
}

async function stopTabCapture() {
  chrome.runtime.sendMessage({ target: 'offscreen', type: 'OFFSCREEN_STOP' })
  try { await chrome.offscreen.closeDocument?.() } catch {}
}
