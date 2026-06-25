import { useProgress }  from '../hooks/useProgress'
import { useReminders } from '../hooks/useReminders'
import Navbar    from '../components/Navbar'
import VakMascot from '../components/VakMascot'

const PRESETS = ['07:00', '09:00', '13:00', '18:00', '21:00']
function pretty(t) {
  const [h, m] = t.split(':').map(Number)
  const ap = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`
}

export default function Reminders() {
  const { progress } = useProgress()
  const { supported, enabled, time, permission, setEnabled, setTime, sendTest } = useReminders()
  const streak = progress?.streak_count || 0

  return (
    <div className="min-h-screen" style={{ background: '#060E1A' }}>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8">

        <div className="text-center mb-6">
          <div className="flex justify-center mb-3 animate-float"><VakMascot level={3} size={72} /></div>
          <h1 className="text-2xl font-black text-white mb-1">Daily practice reminder</h1>
          <p className="text-sm" style={{ color: '#6B8CAE' }}>
            One small rep a day builds the habit. Vak will nudge you at your chosen time.
          </p>
          {streak > 0 && (
            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-sm font-bold"
              style={{ background: 'rgba(255,107,53,0.12)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.25)' }}>
              🔥 {streak}-day streak — keep it alive
            </div>
          )}
        </div>

        {!supported && (
          <div className="rounded-2xl px-4 py-3 mb-5 text-sm"
            style={{ background: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
            This browser doesn't support notifications. Try Chrome or Edge on desktop, or install the app.
          </div>
        )}

        {/* Enable toggle */}
        <div className="rounded-2xl p-5 mb-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(160deg,#10192E,#0B1220)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <div className="text-white font-bold text-sm">Daily reminder</div>
            <div className="text-xs mt-0.5" style={{ color: '#6B8CAE' }}>
              {enabled ? `On — ${pretty(time)} every day` : 'Off'}
            </div>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            disabled={!supported}
            className="relative w-14 h-8 rounded-full transition-all shrink-0"
            style={{ background: enabled ? '#00C49A' : 'rgba(255,255,255,0.12)', opacity: supported ? 1 : 0.5 }}>
            <span className="absolute top-1 w-6 h-6 rounded-full bg-white transition-all"
              style={{ left: enabled ? 'calc(100% - 28px)' : '4px' }} />
          </button>
        </div>

        {permission === 'denied' && (
          <div className="rounded-2xl px-4 py-3 mb-4 text-sm"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>
            Notifications are blocked. Click the 🔒 lock icon in your address bar → allow Notifications → toggle this on again.
          </div>
        )}

        {/* Time picker */}
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: 'linear-gradient(160deg,#10192E,#0B1220)', border: '1px solid rgba(255,255,255,0.08)', opacity: enabled ? 1 : 0.5 }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#6B8CAE' }}>⏰ Reminder time</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map(p => (
              <button key={p} onClick={() => setTime(p)} disabled={!enabled}
                className="text-sm px-3 py-2 rounded-xl font-semibold transition-all"
                style={{
                  background: time === p ? 'rgba(0,196,154,0.18)' : 'rgba(255,255,255,0.05)',
                  color:      time === p ? '#00C49A' : '#6B8CAE',
                  border:     `1px solid ${time === p ? 'rgba(0,196,154,0.45)' : 'rgba(255,255,255,0.1)'}`,
                }}>
                {pretty(p)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: '#6B8CAE' }}>Or pick a custom time:</span>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} disabled={!enabled}
              className="input" style={{ width: 130, padding: '8px 12px' }} />
          </div>
        </div>

        {/* Preview / test */}
        <div className="rounded-2xl p-5 mb-6"
          style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <div className="flex items-start gap-3 mb-3">
            <span className="text-xl">🦢</span>
            <div>
              <div className="text-white font-bold text-sm">Vak is ready for your practice</div>
              <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                Two minutes today keeps your streak alive. Tap to begin.
              </div>
            </div>
          </div>
          <button onClick={sendTest} disabled={permission !== 'granted'}
            className="text-xs font-bold px-4 py-2 rounded-full transition-all"
            style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.3)',
                     opacity: permission === 'granted' ? 1 : 0.5 }}>
            🔔 Send a test notification
          </button>
        </div>

        <p className="text-xs text-center" style={{ color: '#6B8CAE' }}>
          Reminders fire while San4 is open in a tab. Background reminders (closed tab) are coming with the mobile app.
        </p>
      </main>
    </div>
  )
}
