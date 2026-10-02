import { useState, useEffect, useRef } from 'react'
import { C, F, mono } from '../lib/ink'
import { Screen, Back, Btn, TextBtn, Kicker, Spacer, Waveform } from '../components/ink/Ink'

// Warm-up: one tongue twister, three times fast, twenty seconds. Nothing is
// recorded or scored; it just gets the mouth moving before the real rep.
const TWISTERS = [
  'Red lorry, yellow lorry, red lorry, yellow lorry.',
  'She sells seashells by the seashore.',
  'Unique New York, you know you need unique New York.',
  'Six slippery snails slid slowly seaward.',
  'Peter Piper picked a peck of pickled peppers.',
  'A proper copper coffee pot.',
  'Truly rural, truly rural, truly rural.',
  'Fresh French fried fish, fresh French fried fish.',
]
const SECONDS = 20

export default function WarmUp() {
  const [i, setI] = useState(() => new Date().getDate() % TWISTERS.length)
  const [left, setLeft] = useState(null) // null = not started
  const timer = useRef(null)

  useEffect(() => () => clearInterval(timer.current), [])

  function start() {
    clearInterval(timer.current)
    setLeft(SECONDS)
    timer.current = setInterval(() => setLeft(v => {
      if (v <= 1) { clearInterval(timer.current); return 0 }
      return v - 1
    }), 1000)
  }

  const running = left != null && left > 0
  const done = left === 0

  return (
    <Screen pad="34px 30px 30px">
      <Back to="/today" mb={22} />
      <Kicker size={11} style={{ marginBottom: 20 }}>WARM UP · 20 SEC · NOT SCORED</Kicker>
      <p style={{ margin: '0 0 12px', fontFamily: F.display, fontWeight: 300, fontSize: 30, lineHeight: 1.3, letterSpacing: '-.01em' }}>
        {TWISTERS[i]}
      </p>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.dim }}>
        Say it three times, out loud, each one faster than the last. Clean consonants beat speed.
      </p>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, minHeight: 220 }}>
        <Waveform active={running} color={C.purple} />
        <div style={{ fontFamily: F.display, fontWeight: 300, fontSize: 56, letterSpacing: '-.04em', color: done ? C.teal : C.paper }}>
          {left == null ? SECONDS : left}
        </div>
        <div style={mono(12, C.dim, 0)}>{done ? 'Warm. Now do the real one.' : running ? 'Go. Out loud.' : 'Tap start, then speak'}</div>
      </div>
      <Spacer />
      {done
        ? <Btn to="/today">Back to today's rep</Btn>
        : <Btn kind="purple" onClick={start} disabled={running}>{running ? 'Speaking…' : 'Start'}</Btn>}
      <TextBtn onClick={() => { setI((i + 1) % TWISTERS.length); setLeft(null); clearInterval(timer.current) }} style={{ marginTop: 12 }}>
        Another one
      </TextBtn>
    </Screen>
  )
}
