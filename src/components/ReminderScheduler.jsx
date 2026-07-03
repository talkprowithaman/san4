import { useEffect } from 'react'
import { readReminderConfig, markReminderFired, alreadyFiredToday } from '../hooks/useReminders'
import { useProgressStore } from '../hooks/useProgress'

// ─────────────────────────────────────────────────────────────────────────────
// ReminderScheduler — headless. Mounted once at the app root. Two jobs, both
// while the app/tab is open (true background push needs a service worker,
// a later upgrade):
//
// 1. Daily practice reminder at the user's chosen HH:MM (opt-in, Reminders page)
// 2. Streak-danger alert at 20:30: streak alive + no practice today → Vak
//    speaks up before midnight kills the streak (loss aversion, the Duolingo
//    mechanic that actually retains people).
// ─────────────────────────────────────────────────────────────────────────────

const EVT = 'san4-reminders-changed'
const K_STREAK_WARNED = 'san4_streak_warn_fired'
const STREAK_WARN_TIME = '20:30'

function canNotify() {
  return 'Notification' in window && Notification.permission === 'granted'
}

function fireNotification() {
  if (!canNotify() || alreadyFiredToday()) return
  const messages = [
    'Two minutes today keeps your streak alive. Tap to begin.',
    "Vak is ready for your practice. Let's climb a level.",
    'Your daily rep is waiting. Confidence is built one session at a time.',
  ]
  const n = new Notification('🦢 Vak is ready for your practice', {
    body: messages[Math.floor(Math.random() * messages.length)],
    icon: '/san4-icon.png',
    tag: 'san4-daily-reminder',
  })
  n.onclick = () => { window.focus(); window.location.href = '/today'; n.close() }
  markReminderFired()
}

// ── Streak danger ─────────────────────────────────────────────────────────────
const todayKey = () => new Date().toLocaleDateString('en-CA')

function streakWarnedToday() {
  try { return localStorage.getItem(K_STREAK_WARNED) === todayKey() } catch { return false }
}
function markStreakWarned() {
  try { localStorage.setItem(K_STREAK_WARNED, todayKey()) } catch { /* ignore */ }
}

function fireStreakWarning() {
  if (!canNotify() || streakWarnedToday()) return
  // Read live progress from the global store; skip silently if not loaded.
  const progress = useProgressStore.getState().progress
  const streak = progress?.streak_count ?? 0
  const practisedToday = (progress?.last_practice_date || '').slice(0, 10) === todayKey()
  if (streak <= 0 || practisedToday) return

  const n = new Notification(`⏳ Your ${streak}-day streak ends at midnight`, {
    body: 'One 60-second rep saves it. Vak is waiting.',
    icon: '/san4-icon.png',
    tag: 'san4-streak-danger',
  })
  n.onclick = () => { window.focus(); window.location.href = '/today'; n.close() }
  markStreakWarned()
}

function msUntilNext(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const now = new Date()
  const target = new Date(now)
  target.setHours(h, m, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  return target - now
}

function pastToday(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const slot = new Date()
  slot.setHours(h, m, 0, 0)
  return new Date() >= slot
}

export default function ReminderScheduler() {
  useEffect(() => {
    let timer = null
    let streakTimer = null

    function schedule() {
      clearTimeout(timer)
      clearTimeout(streakTimer)
      if (!canNotify()) return

      // ── Daily practice reminder (opt-in) ────────────────────────────────
      const { enabled, time } = readReminderConfig()
      if (enabled) {
        // Catch-up: if today's slot already passed and we never fired, fire now.
        if (pastToday(time) && !alreadyFiredToday()) fireNotification()
        timer = setTimeout(() => { fireNotification(); schedule() }, msUntilNext(time) + 500)
      }

      // ── Streak danger (automatic — no opt-in beyond notification permission,
      // it only ever fires when there is genuinely a streak about to die) ──
      if (pastToday(STREAK_WARN_TIME) && !streakWarnedToday()) fireStreakWarning()
      streakTimer = setTimeout(() => { fireStreakWarning(); schedule() }, msUntilNext(STREAK_WARN_TIME) + 500)
    }

    schedule()
    window.addEventListener(EVT, schedule)
    // Re-evaluate when the tab regains focus (covers laptop sleep / day rollover)
    document.addEventListener('visibilitychange', schedule)
    return () => {
      clearTimeout(timer)
      clearTimeout(streakTimer)
      window.removeEventListener(EVT, schedule)
      document.removeEventListener('visibilitychange', schedule)
    }
  }, [])

  return null
}
