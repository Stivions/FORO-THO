type SoundType = 'join' | 'leave' | 'dm' | 'like' | 'comment' | 'follow' | 'notification'

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return ctx
}

function tone(
  frequency: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  audioCtx: AudioContext
) {
  const osc  = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, startTime)
  gain.gain.setValueAtTime(volume, startTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

export function playSound(sound: SoundType) {
  try {
    const a = getCtx()
    const t = a.currentTime

    switch (sound) {
      /* Discord-like join: two ascending tones */
      case 'join':
        tone(440, t,       0.12, 0.22, 'sine', a)
        tone(660, t + 0.12, 0.18, 0.22, 'sine', a)
        break

      /* Descending two tones on leave */
      case 'leave':
        tone(660, t,       0.12, 0.18, 'sine', a)
        tone(440, t + 0.12, 0.18, 0.18, 'sine', a)
        break

      /* DM: two quick high pings */
      case 'dm':
        tone(880, t,        0.08, 0.25, 'sine', a)
        tone(1100, t + 0.1, 0.1,  0.20, 'sine', a)
        break

      /* Like: short bright ping */
      case 'like':
        tone(1047, t, 0.12, 0.18, 'sine', a)
        break

      /* Comment: soft double ping */
      case 'comment':
        tone(784, t,       0.09, 0.18, 'sine', a)
        tone(784, t + 0.15, 0.09, 0.12, 'sine', a)
        break

      /* Follow: warm ascending */
      case 'follow':
        tone(523, t,       0.1, 0.2, 'sine', a)
        tone(659, t + 0.1, 0.1, 0.2, 'sine', a)
        tone(784, t + 0.2, 0.15, 0.2, 'sine', a)
        break

      /* Generic notification */
      case 'notification':
        tone(880, t, 0.15, 0.2, 'sine', a)
        break
    }
  } catch {
    // AudioContext blocked (e.g. no user gesture yet) — silently ignore
  }
}
