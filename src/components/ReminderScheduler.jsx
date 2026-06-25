import { useEffect } from 'react'
import { readReminderConfig, markReminderFired, alreadyFiredToday } from '../hooks/useReminders'

// ─────────────────────────────────────────────────────────────────────────────
// ReminderScheduler — headless. Mounted once at the app root. Schedules the
// daily "Vak is ready for your practice" notification while the app is open.
//
// On mount (and whenever config changes) it computes the ms until the next
// occurrence of the chosen HH:MM, sets a timeout, fires the notification, marks
// it fired for today, and reschedules for tomorrow. A catch-up check fires the
// reminder if the chosen time already passed today and it hasn't shown yet.
// ─────────────────────────────────────────────────────────────────────────────

const EVT = 'san4-reminders-changed'

function fireNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (alreadyFiredToday()) return
  const messages = [
    'Two minutes today keeps your streak alive. Tap to begin.',
    "Vak is ready for your practice. Let's climb a level.",
    'Your daily rep is waiting. Confidence is built one session at a time.',
  ]
  const n = new Notification('🦢 Vak is ready for your practice', {
    body: messages[Math.floor(Math.random() * messages.length)],
    icon: '/aman.jpg',
    tag: 'san4-daily-reminder',
  })
  n.onclick = () => { window.focus(); window.location.href = '/practice'; n.close() }
  markReminderFired()
}

function msUntilNext(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const now = new Date()
  const target = new Date(now)
  target.setHours(h, m, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  return target - now
}

export default function ReminderScheduler() {
  useEffect(() => {
    let timer = null

    function schedule() {
      clearTimeout(timer)
      const { enabled, time } = readReminderConfig()
      if (!enabled || !('Notification' in window) || Notification.permission !== 'granted') return

      // Catch-up: if today's slot already passed and we never fired, fire now.
      const [h, m] = time.split(':').map(Number)
      const now = new Date()
      const slot = new Date(now); slot.setHours(h, m, 0, 0)
      if (now >= slot && !alreadyFiredToday()) fireNotification()

      // Schedule the next occurrence, then reschedule recursively.
      timer = setTimeout(() => { fireNotification(); schedule() }, msUntilNext(time) + 500)
    }

    schedule()
    window.addEventListener(EVT, schedule)
    // Re-evaluate when the tab regains focus (covers laptop sleep / day rollover)
    document.addEventListener('visibilitychange', schedule)
    return () => {
      clearTimeout(timer)
      window.removeEventListener(EVT, schedule)
      document.removeEventListener('visibilitychange', schedule)
    }
  }, [])

  return null
}
