# San4 Live Coach — Chrome/Edge extension (MVP scaffold)

The "Zoom-style pop-up" for San4. When you're on a **Google Meet** call, San4
offers to listen to how *you* speak, then gives you a coaching report — a rating,
filler-word count, what worked, fixes ("say it this way instead"), and
**videos to improve** (Talk Pro with Aman first, YouTube search fallback).

It reuses the main app's coaching engine: analysis runs through the same
`/api/gemini` proxy, and the weakness→video map is the **same module** as the
web app (`src/lib/communicationVideos.js`).

## Load it (unpacked)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Join a Google Meet call (`meet.google.com/xxx-xxxx-xxx`). The San4 coach
   appears bottom-right. Click **Coach this call**, allow the mic, talk, then
   **Stop & coach**.

## What works today (MVP)

- ✅ Detects an active Meet call and shows the consent pop-up.
- ✅ Live transcript of **your** side via the Web Speech API (mic).
- ✅ Analysis via the San4 proxy → score, fillers, strengths, improvements,
  per-line fixes, `weaknesses[]`.
- ✅ "Watch this to improve" using the shared video map.
- ✅ Style-isolated UI (Shadow DOM) so Meet's CSS can't interfere.

## Scaffolded / TODO (next commits)

- ⛏️ **Other side of the call** — `background.js` + `offscreen.js` already capture
  the meeting *tab* audio via `chrome.tabCapture`. Turning that into a "Them"
  transcript (chunk → Gemini STT, reuse `gemini.transcribeSpeech`) is the next
  step. Today only your mic is transcribed (which is what we coach anyway).
- ⛏️ **Account link** — pass the user's Supabase access token to `analyze.js`
  (`authToken`) so calls save to their history and move their San4 Score,
  instead of the rate-limited guest lane.
- ⛏️ **Deep link** — "Open in San4" should post the report to a San4 route that
  persists it, not just open Call Analyzer.
- ⛏️ **Hindi/Hinglish** — Web Speech is unreliable for Hindi; route audio through
  Gemini STT (as the app does) for accuracy.
- ⛏️ **Realtime nudges** — surface "that's 5 'um's" / "slow down" live (premium).

## File map

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest, permissions (`tabCapture`, `offscreen`), Meet + San4 host access |
| `src/content.js` | In-call UI: prompt → live transcript → report (Shadow DOM) |
| `src/background.js` | Service worker: analysis fetch + tab-capture orchestration |
| `src/offscreen.js` | Holds the tab-audio stream (MV3 can't use media in the worker) |
| `src/popup.html/js` | Toolbar popup + status |
| `src/lib/analyze.js` | Transcript → coaching JSON via `/api/gemini` |
| `src/lib/communicationVideos.js` | Shared weakness→video map (copy of the app's) |
| `src/lib/config.js` | API base + constants |

## Coverage

Browser calls only (Meet, and any web-based call once matched in the manifest).
The **Zoom desktop app and FaceTime are native apps** a browser extension cannot
hear — those need the planned **native macOS menu-bar app** (ScreenCaptureKit).

## Note on `communicationVideos.js`

It's copied from `../src/lib/communicationVideos.js` to keep the extension
self-contained. If you change the map in the app, re-copy it here (or we can add
a tiny build step to symlink/bundle it).
