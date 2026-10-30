// Звук «новый заказ» синтезируется в браузере (Web Audio) — без звукового файла.
// Браузер разрешает звук только после нажатия на странице: unlockSound() вызывается на первое нажатие или клавишу.
let ctx: AudioContext | null = null

const Ctor = (): typeof AudioContext | undefined =>
  window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

export const soundSupported = (): boolean => !!Ctor()
/** Браузер уже разрешил звук. */
export const soundUnlocked = (): boolean => ctx?.state === 'running'

/** Включить звук. Без нажатия на странице браузер не разрешит — тогда false (попробуем снова при нажатии). */
export async function unlockSound(): Promise<boolean> {
  const C = Ctor()
  if (!C) return false
  try {
    ctx ??= new C()
    // без разрешения браузера resume() может не ответить вовсе — ждём недолго
    if (ctx.state !== 'running') await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 400))])
  } catch {
    return false
  }
  return ctx.state === 'running'
}

/** Звонок из трёх нот (около секунды). false — звук ещё не разрешён браузером. */
export function playChime(): boolean {
  const c = ctx
  if (!c || c.state !== 'running') return false
  const start = c.currentTime + 0.03
  const notes: [freq: number, at: number][] = [[987.77, 0], [1318.51, 0.17], [1975.53, 0.34]] // си, ми, си
  for (const [freq, at] of notes) {
    const t = start + at
    const osc = c.createOscillator(), gain = c.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    osc.connect(gain).connect(c.destination)
    osc.start(t)
    osc.stop(t + 0.65)
  }
  return true
}
