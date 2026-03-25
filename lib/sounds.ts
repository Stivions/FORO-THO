type SoundType = 'join' | 'leave' | 'dm' | 'like' | 'comment' | 'follow' | 'notification'

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return ctx
}

/** Call once on first user gesture to pre-unlock AudioContext (browsers require this) */
export function unlockAudio() {
  try {
    const a = getCtx()
    if (a.state === 'suspended') a.resume().catch(() => {})
  } catch {}
}

function playTones(sound: SoundType, a: AudioContext) {
  const t = a.currentTime

  function tone(
    frequency: number,
    startTime: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
  ) {
    const osc  = a.createOscillator()
    const gain = a.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, startTime)
    gain.gain.setValueAtTime(volume, startTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
    osc.connect(gain)
    gain.connect(a.destination)
    osc.start(startTime)
    osc.stop(startTime + duration)
  }

  switch (sound) {
    case 'join':
      tone(440, t,        0.12, 0.22)
      tone(660, t + 0.12, 0.18, 0.22)
      break
    case 'leave':
      tone(660, t,        0.12, 0.18)
      tone(440, t + 0.12, 0.18, 0.18)
      break
    case 'dm':
      tone(880,  t,       0.08, 0.25)
      tone(1100, t + 0.1, 0.1,  0.20)
      break
    case 'like':
      tone(1047, t, 0.12, 0.18)
      break
    case 'comment':
      tone(784, t,        0.09, 0.18)
      tone(784, t + 0.15, 0.09, 0.12)
      break
    case 'follow':
      tone(523, t,       0.1,  0.2)
      tone(659, t + 0.1, 0.1,  0.2)
      tone(784, t + 0.2, 0.15, 0.2)
      break
    case 'notification':
      tone(880, t, 0.15, 0.2)
      break
  }
}

export function playSound(sound: SoundType) {
  try {
    const a = getCtx()
    if (a.state === 'suspended') {
      // Resume first (needed when no prior user gesture), then play
      a.resume().then(() => playTones(sound, a)).catch(() => {})
    } else {
      playTones(sound, a)
    }
  } catch {
    // AudioContext unavailable — silently ignore
  }
}
