import type { Directive } from 'vue'

// v-tilt — лёгкий 3D-наклон карточки за курсором и блик (только мышь/тачпад, не на сенсорных экранах).
const canTilt = () => typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches
type El = HTMLElement & { _tilt?: { move: (e: PointerEvent) => void; leave: () => void } }

const tilt: Directive<El, number | undefined> = {
  mounted(el, { value }) {
    if (!canTilt()) return
    const max = value ?? 7
    let frame = 0
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
        el.style.setProperty('--rx', `${((0.5 - y) * max).toFixed(2)}deg`)
        el.style.setProperty('--ry', `${((x - 0.5) * max).toFixed(2)}deg`)
        el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`)
        el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`)
        el.classList.add('is-tilting')
      })
    }
    const leave = () => {
      cancelAnimationFrame(frame)
      el.classList.remove('is-tilting')
      el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg')
    }
    el.classList.add('tilt')
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    el._tilt = { move, leave }
  },
  unmounted(el) {
    if (!el._tilt) return
    el.removeEventListener('pointermove', el._tilt.move)
    el.removeEventListener('pointerleave', el._tilt.leave)
  },
}
export default tilt
