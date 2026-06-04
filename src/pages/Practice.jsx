import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar              from '../components/Navbar'
import VakMascot           from '../components/VakMascot'
import { useSubscription } from '../hooks/useSubscription'
import { useProgress }     from '../hooks/useProgress'
import { useScenarioUnlocks } from '../hooks/useScenarioUnlocks'
import { SCENARIOS, ZONES }  from '../lib/progression'

// ── Helpers ────────────────────────────────────────────────────────────────────
function stars(n) {
  return '★'.repeat(n) + '☆'.repeat(3 - n)
}
function scoreColor(v) {
  if (v >= 80) return '#00C49A'
  if (v >= 60) return '#FF6B35'
  return '#F87171'
}

// ── Zone header divider ────────────────────────────────────────────────────────
function ZoneHeader({ zone }) {
  return (
    <div className="relative flex items-center gap-4 py-6 select-none">
      <div className="flex-1 h-px" style={{ background: zone.border }} />
      <div
        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black tracking-wider uppercase shrink-0"
        style={{ background: zone.bg, border: `1px solid ${zone.border}`, color: zone.color }}
      >
        <span>{zone.icon}</span>
        <span>{zone.label}</span>
      </div>
      <div className="flex-1 h-px" style={{ background: zone.border }} />
      {/* Sub-label below */}
      <div className="absolute -bottom-1 left-0 right-0 text-center text-xs" style={{ color: 'rgba(107,140,174,0.7)' }}>
        {zone.sub}
      </div>
    </div>
  )
}

// ── Score bar ──────────────────────────────────────────────────────────────────
function ScoreBar({ best, required, color }) {
  const pct = Math.min(100, Math.round((best / 100) * 100))
  const reqPct = required

  return (
    <div className="relative h-2.5 rounded-full overflow-visible" style={{ background: 'rgba(255,255,255,0.07)' }}>
      {/* Filled portion */}
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: best >= required ? color : '#6B8CAE' }} />
      {/* Pass-score marker */}
      {required && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
          style={{ left: `${reqPct}%`, background: color, opacity: 0.7 }}
        />
      )}
    </div>
  )
}

// ── Level card ────────────────────────────────────────────────────────────────
function LevelCard({ scenario: s, state, bestScore, onPlay, onUpgrade, onGoPrereq }) {
  const [hover, setHover] = useState(false)
  const passed = s.passScore && bestScore >= s.passScore
  const zone = ZONES.find(z => z.key === s.zone)

  const isAvailable = state === 'available'
  const isLocked    = state === 'locked'
  const isPro       = state === 'pro_locked'

  return (
    <div
      className="flex gap-4 items-start mb-4 animate-fade-in"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Level badge + connector line */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 transition-all"
          style={{
            background: isAvailable ? `${zone?.color || '#6B8CAE'}20` : 'rgba(255,255,255,0.05)',
            border: `2px solid ${isAvailable ? (zone?.color || '#6B8CAE') : 'rgba(255,255,255,0.1)'}`,
            color: isAvailable ? (zone?.color || '#6B8CAE') : '#6B8CAE',
          }}
        >
          {isPro ? '👑' : isLocked ? '🔒' : s.level}
        </div>
        {/* Connector line (except last in each zone) */}
        <div className="w-0.5 h-5 mt-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
      </div>

      {/* Card body */}
      <div
        className="flex-1 rounded-2xl p-5 mb-1 transition-all"
        style={{
          background:  hover && isAvailable
            ? `linear-gradient(135deg, ${zone?.bg || 'rgba(255,255,255,0.03)'}, rgba(255,255,255,0.02))`
            : 'linear-gradient(135deg, #0F1929, #080D18)',
          border: `1px solid ${
            hover && isAvailable
              ? (zone?.border || 'rgba(255,255,255,0.15)')
              : isPro
              ? 'rgba(245,158,11,0.2)'
              : 'rgba(255,255,255,0.07)'
          }`,
          opacity: isLocked && !isPro ? 0.7 : 1,
          boxShadow: hover && isAvailable && zone
            ? `0 4px 24px ${zone.color}18`
            : 'none',
        }}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-2xl shrink-0">{s.icon}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-black text-base leading-tight">{s.title}</h3>
                {s.tier === 'always_free' && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA' }}>FREE</span>
                )}
                {isPro && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>⚡ PRO</span>
                )}
                {passed && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(0,196,154,0.15)', color: '#00C49A' }}>✓ CLEARED</span>
                )}
              </div>
              <div className="text-xs mt-0.5 font-semibold" style={{ color: '#6B8CAE' }}>
                {stars(s.difficulty)} · Level {s.level}
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs font-bold" style={{ color: '#F59E0B' }}>+{s.xpOnPass} XP</div>
            <div className="text-xs" style={{ color: '#6B8CAE' }}>on pass</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed mb-3" style={{ color: '#94A3B8' }}>{s.desc}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {s.tags?.map(t => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#6B8CAE' }}>{t}</span>
          ))}
        </div>

        {/* Progress section */}
        {isAvailable && s.passScore && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: '#6B8CAE' }}>
                {passed
                  ? `✓ Cleared — best: ${bestScore}%`
                  : bestScore > 0
                  ? `Best: ${bestScore}% · Need ${s.passScore - bestScore}% more`
                  : `Pass ${s.passScore}%+ to unlock next level`}
              </span>
              <span style={{ color: zone?.color || '#6B8CAE' }}>{s.passScore}% pass</span>
            </div>
            <ScoreBar best={bestScore} required={s.passScore} color={zone?.color || '#6B8CAE'} />
            {s.unlockHint && !passed && (
              <p className="text-xs mt-1.5" style={{ color: zone?.color || '#6B8CAE', opacity: 0.8 }}>
                🎯 {s.unlockHint}
              </p>
            )}
            {passed && s.unlockHint && (
              <p className="text-xs mt-1.5" style={{ color: '#00C49A' }}>
                ✓ Next level unlocked!
              </p>
            )}
          </div>
        )}

        {/* Summit badge */}
        {s.isSummit && isAvailable && (
          <div className="rounded-xl px-3 py-2 mb-3 flex items-center gap-2"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}>
            <span>🏔️</span>
            <span className="text-xs font-semibold" style={{ color: '#A78BFA' }}>
              Free-tier summit — the highest free challenge. Score 82%+ to earn the Summit badge.
            </span>
          </div>
        )}

        {/* Locked — free tier */}
        {isLocked && (
          <div className="rounded-xl px-3 py-2 mb-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs" style={{ color: '#6B8CAE' }}>
              🔒 Complete <strong className="text-white">{s.prereqDisplay}</strong> to unlock this level for free.
            </p>
          </div>
        )}

        {/* Locked — Pro */}
        {isPro && (
          <div className="rounded-xl px-3 py-2 mb-3"
            style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-xs" style={{ color: '#F59E0B' }}>
              👑 Vak Pro · ₹299/month · Unlimited sessions · Notion community included
            </p>
          </div>
        )}

        {/* Action button */}
        <div className="flex gap-2 flex-wrap">
          {isAvailable && (
            <button
              onClick={onPlay}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-98"
              style={{ background: `linear-gradient(135deg, ${zone?.color || '#6B8CAE'}cc, ${zone?.color || '#6B8CAE'})` }}
            >
              {passed ? '↩ Play again' : `🎮 Play Level ${s.level} →`}
            </button>
          )}
          {isLocked && (
            <button
              onClick={onGoPrereq}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              → Go to prerequisite level
            </button>
          )}
          {isPro && (
            <button
              onClick={onUpgrade}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #92400e, #D97706)', color: 'white' }}
            >
              👑 Unlock with Pro →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Upgrade modal ──────────────────────────────────────────────────────────────
function UpgradeModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-3xl p-7 animate-slide-up"
        style={{ background: 'linear-gradient(160deg,#0D1B30,#08111E)', border: '1px solid rgba(245,158,11,0.4)', boxShadow: '0 0 80px rgba(245,158,11,0.15)' }}
        onClick={e => e.stopPropagation()}>

        {/* Summit visual */}
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">🏔️</div>
          <h3 className="text-white font-black text-xl mb-1">Unlock The Summit</h3>
          <p className="text-sm" style={{ color: '#6B8CAE' }}>
            You've conquered the base camp. Levels 11–14 await at the top.
          </p>
        </div>

        {/* Plans */}
        <div className="space-y-3 mb-5">
          {/* Pro */}
          <div className="rounded-2xl p-4"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-black text-white">👑 Vak Pro</span>
              <span className="font-black" style={{ color: '#F59E0B' }}>₹299<span className="text-xs font-normal text-slate-400">/mo</span></span>
            </div>
            <div className="space-y-1.5">
              {['All 14 scenario levels','Unlimited sessions','All teleprompter scripts','Body Language coaching','Notion community access'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#F59E0B' }}>✓</span>
                  <span className="text-xs text-white">{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Elite */}
          <div className="rounded-2xl p-4"
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-black text-white">💎 Vak Elite</span>
              <span className="font-black" style={{ color: '#A78BFA' }}>₹999<span className="text-xs font-normal text-slate-400">/mo</span></span>
            </div>
            <div className="space-y-1.5">
              {['Everything in Pro','Live meeting assist (coming soon)','WhatsApp/Telegram elite community','Early access to all new features'].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#A78BFA' }}>✓</span>
                  <span className="text-xs text-white">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Link to="/pricing" className="block w-full py-3 rounded-2xl font-bold text-center text-white mb-3 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#92400e,#D97706)' }} onClick={onClose}>
          See full pricing →
        </Link>
        <button onClick={onClose} className="w-full text-sm py-2 transition-colors"
          style={{ color: '#6B8CAE' }}>
          Continue climbing for free
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Practice() {
  const navigate = useNavigate()
  const { isPro } = useSubscription()
  const { progress, levelInfo } = useProgress()
  const { bestScores, unlockedSet, loading, freePassed, highestLevel } = useScenarioUnlocks()
  const [upgradeModal, setUpgradeModal] = useState(false)

  function getState(scenario) {
    if (scenario.tier === 'pro' && !isPro) return 'pro_locked'
    if (scenario.tier !== 'always_free' && !unlockedSet.has(scenario.id)) return 'locked'
    return 'available'
  }

  // Find the prerequisite level card to navigate to when a locked scenario is clicked
  function findPrereqLevel(scenario) {
    const prereqId = Object.keys(bestScores).length === 0
      ? 'hr_interview'
      : SCENARIOS.find(s =>
          s.tier !== 'pro' &&
          (unlockedSet.has(s.id)) &&
          s.level < scenario.level
        )?.id || 'hr_interview'
    const prereqScenario = SCENARIOS.find(s => s.id === prereqId)
    return prereqScenario
  }

  function play(scenario) {
    navigate(`/practice/${scenario.id}`, { state: { scenario } })
  }

  const totalXP   = progress?.total_xp || 0
  const streak    = progress?.streak_count || 0
  const level     = levelInfo?.current?.level || 1
  const levelName = levelInfo?.current?.name  || 'Hesitant'

  return (
    <div className="min-h-screen" style={{ background: '#050810' }}>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position:'absolute', top:-200, right:-150, width:700, height:700, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 65%)' }} />
        <div style={{ position:'absolute', bottom:-200, left:-100, width:600, height:600, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(245,158,11,0.06) 0%,transparent 65%)' }} />
      </div>

      <Navbar />

      <main className="max-w-2xl mx-auto px-4 pt-6 pb-16 relative z-10">

        {/* ── Mountain header ────────────────────────────────────────────── */}
        <div className="text-center mb-2 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3 text-sm font-semibold"
            style={{ background:'rgba(139,92,246,0.12)', color:'#A78BFA', border:'1px solid rgba(139,92,246,0.25)' }}>
            🏔️ Your Communication Mountain
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Every level you clear is a real skill.</h1>
          <p className="text-sm" style={{ color:'#6B8CAE' }}>
            No timers. No session limits. Climb at your own pace — earn each level by scoring above the pass threshold.
          </p>
        </div>

        {/* ── Climber stats bar ─────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2 mb-6 animate-slide-up">
          {[
            { icon:'🔥', label:'Streak',  value: streak > 0 ? `${streak}d` : '—', color:'#FF6B35' },
            { icon:'⭐', label:'Total XP', value: totalXP,                         color:'#F59E0B' },
            { icon:'🏆', label:'Cleared',  value: `${freePassed}/10`,              color:'#00C49A' },
            { icon:'📍', label:'Highest',  value: highestLevel > 0 ? `L${highestLevel}` : 'L1', color:'#8B5CF6' },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className="rounded-2xl p-3 text-center"
              style={{ background:'linear-gradient(145deg,#0F1929,#080D18)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-lg mb-0.5">{icon}</div>
              <div className="text-base font-black" style={{ color }}>{value}</div>
              <div className="text-xs" style={{ color:'#6B8CAE' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Vak level badge */}
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-6"
          style={{ background:'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(139,92,246,0.03))', border:'1px solid rgba(139,92,246,0.2)' }}>
          <div className="animate-float shrink-0"><VakMascot level={level} size={44} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm">{levelName} · Level {level}</div>
            <div className="text-xs" style={{ color:'#6B8CAE' }}>
              {levelInfo?.xpIntoLevel || 0} XP into this level
              {levelInfo?.next ? ` · ${levelInfo.next.name} at ${levelInfo.next.minXP} XP` : ' · Max level!'}
            </div>
          </div>
          <Link to="/progress" className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
            style={{ background:'rgba(139,92,246,0.15)', color:'#A78BFA', border:'1px solid rgba(139,92,246,0.25)' }}>
            View →
          </Link>
        </div>

        {/* Quick drill links */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { to:'/script-reading', icon:'📜', label:'Teleprompter', color:'#8B5CF6' },
            { to:'/micro-drill',    icon:'⚡', label:'Micro-Drills', color:'#F59E0B' },
            { to:'/body-language',  icon:'📹', label:'Body Language', color:'#00C49A', pro: true },
          ].map(({ to, icon, label, color, pro }) => (
            <Link key={to} to={to}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all hover:brightness-110"
              style={{ background:`${color}10`, border:`1px solid ${color}25` }}>
              <span className="text-xl">{icon}</span>
              <span className="text-xs font-bold text-white">{label}</span>
              {pro && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ background:`${color}20`, color }}>Pro</span>}
            </Link>
          ))}
        </div>

        {/* ── PROGRESSION PATH ──────────────────────────────────────────── */}
        {loading ? (
          <div className="text-center py-12" style={{ color:'#6B8CAE' }}>Loading your progress…</div>
        ) : (
          <>
            {ZONES.map(zone => {
              const zoneScenarios = SCENARIOS.filter(s => s.zone === zone.key)
              return (
                <div key={zone.key}>
                  <ZoneHeader zone={zone} />

                  {/* Pro zone teaser (if not Pro) */}
                  {zone.isPro && !isPro && (
                    <div className="rounded-2xl p-5 mb-5 text-center"
                      style={{ background:'linear-gradient(135deg,rgba(245,158,11,0.06),rgba(139,92,246,0.06))', border:'1px solid rgba(245,158,11,0.25)' }}>
                      <div className="text-3xl mb-2">🏔️</div>
                      <h3 className="text-white font-black text-base mb-1">You've reached The Summit</h3>
                      <p className="text-sm mb-4" style={{ color:'#6B8CAE' }}>
                        4 advanced scenarios await — Conflict Mediation, First Date, Skeptic Pitches and more.
                        One subscription. Unlimited sessions. A community that goes with you.
                      </p>
                      <button
                        onClick={() => setUpgradeModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-sm text-white transition-all hover:opacity-90"
                        style={{ background:'linear-gradient(135deg,#92400e,#D97706)' }}>
                        👑 Unlock The Summit →
                      </button>
                    </div>
                  )}

                  {zoneScenarios.map(s => (
                    <LevelCard
                      key={s.id}
                      scenario={s}
                      state={getState(s)}
                      bestScore={bestScores[s.id] || 0}
                      onPlay={() => play(s)}
                      onUpgrade={() => setUpgradeModal(true)}
                      onGoPrereq={() => {
                        const prereq = findPrereqLevel(s)
                        if (prereq) play(prereq)
                      }}
                    />
                  ))}
                </div>
              )
            })}
          </>
        )}

        {/* Bottom note */}
        <div className="mt-4 rounded-2xl px-5 py-4 flex items-start gap-3"
          style={{ background:'linear-gradient(160deg,#0F1929,#080D18)', border:'1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-xl">💡</span>
          <div>
            <span className="text-white font-bold text-sm">How the climb works: </span>
            <span className="text-sm" style={{ color:'#6B8CAE' }}>
              Clear Level 1 or 2 with 65%+ and Level 3 unlocks for free. Keep scoring above each
              threshold to keep climbing. All 10 levels are free — if you earn them.
              Score 90%+ for an Excellence bonus <span style={{ color:'#F59E0B' }}>(+25 XP)</span>.
            </span>
          </div>
        </div>
      </main>

      {upgradeModal && <UpgradeModal onClose={() => setUpgradeModal(false)} />}
    </div>
  )
}
