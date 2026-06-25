import { useState, useEffect, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// useReminders — daily practice reminder state + Web Notifications.
//
// Persistence is localStorage (no schema migration needed for the prototype).
// Notifications fire while the app/tab is open via ReminderScheduler. True
// background push (closed tab) needs a service worker + push server — that's a
// later upgrade; the data model here (enabled + HH:MM time) carries straight
// over to it.
// ─────────────────────────────────────────────────────────────────────────────

const K_ENABLED = 'san4_reminder_enabled'
const K_TIME    = 'san4_reminder_time'
const K_FIRED   = 'san4_reminder_last_fired'
const EVT       = 'san4-reminders-changed'

export function readReminderConfig() {
  let enabled = false, time = '09:00'
  try {
    enabled = localStorage.getItem(K_ENABLED) === 'true'
    time    = localStorage.getItem(K_TIME) || '09:00'
  } catch {}
  return { enabled, time }
}

export function markReminderFired() {
  try { localStorage.setItem(K_FIRED, new Date().toLocaleDateString('en-CA')) } catch {}
}
export function alreadyFiredToday() {
  try { return localStorage.getItem(K_FIRED) === new Date().toLocaleDateString('en-CA') } catch { return false }
}

const NOTIF_SUPPORTED = typeof window !== 'undefined' && 'Notification' in window

export function useReminders() {
  const [enabled, setEnabledState] = useState(() => readReminderConfig().enabled)
  const [time,    setTimeState]    = useState(() => readReminderConfig().time)
  const [permission, setPermission] = useState(() => (NOTIF_SUPPORTED ? Notification.permission : 'unsupported'))

  // Stay in sync if another component changes config
  useEffect(() => {
    const sync = () => { const c = readReminderConfig(); setEnabledState(c.enabled); setTimeState(c.time) }
    window.addEventListener(EVT, sync)
    return () => window.removeEventListener(EVT, sync)
  }, [])

  const persist = useCallback((next) => {
    try {
      if ('enabled' in next) localStorage.setItem(K_ENABLED, String(next.enabled))
      if ('time' in next)    localStorage.setItem(K_TIME, next.time)
    } catch {}
    window.dispatchEvent(new Event(EVT))
  }, [])

  const requestPermission = useCallback(async () => {
    if (!NOTIF_SUPPORTED) return 'unsupported'
    const p = await Notification.requestPermission()
    setPermission(p)
    return p
  }, [])

  const setEnabled = useCallback(async (val) => {
    if (val && NOTIF_SUPPORTED && Notification.permission !== 'granted') {
      const p = await requestPermission()
      if (p !== 'granted') { setEnabledState(false); persist({ enabled: false }); return false }
    }
    setEnabledState(val)
    persist({ enabled: val })
    return val
  }, [persist, requestPermission])

  const setTime = useCallback((val) => {
    setTimeState(val)
    persist({ time: val })
  }, [persist])

  const sendTest = useCallback(() => {
    if (!NOTIF_SUPPORTED || Notification.permission !== 'granted') return false
    const n = new Notification('🦢 Vak is ready for your practice', {
      body: 'This is what your daily reminder will look like. Tap to start a session.',
      icon: '/aman.jpg',
      tag: 'san4-reminder-test',
    })
    n.onclick = () => { window.focus(); window.location.href = '/practice'; n.close() }
    return true
  }, [])

  return {
    supported: NOTIF_SUPPORTED,
    enabled, time, permission,
    setEnabled, setTime, requestPermission, sendTest,
  }
}
