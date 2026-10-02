// ─────────────────────────────────────────────────────────────────────────────
// Offline takes — "Record now, score on wifi".
//
// Hostel at midnight, shared phone, two bars of signal: the user records a
// daily rep, the audio is kept ON THEIR PHONE (IndexedDB, never uploaded),
// and it is scored the next time the app is open with a connection. After
// scoring, the local copy is deleted.
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME = 'san4_offline'
const STORE   = 'takes'

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB unavailable')); return }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const store = t.objectStore(STORE)
    const out = fn(store)
    t.oncomplete = () => { db.close(); resolve(out?.result ?? out) }
    t.onerror = () => { db.close(); reject(t.error) }
  }))
}

// take: { userId, repId, blob, mimeType, seconds, recordedAt }
export function queueTake(take) {
  return tx('readwrite', store => store.add({ ...take, recordedAt: take.recordedAt || Date.now() }))
}

export function listTakes(userId) {
  return tx('readonly', store => store.getAll())
    .then(all => (all || []).filter(t => !userId || t.userId === userId))
    .catch(() => [])
}

export function deleteTake(id) {
  return tx('readwrite', store => store.delete(id)).catch(() => {})
}

// "Score on wifi": online, and not on mobile data or data saver where the
// browser can tell us (Android Chrome exposes connection.type; others don't,
// in which case being online is the best signal we have).
export function isOnline() {
  if (typeof navigator === 'undefined') return true
  if (navigator.onLine === false) return false
  const conn = navigator.connection
  if (conn?.saveData) return false
  if (conn?.type && conn.type === 'cellular') return false
  return true
}
