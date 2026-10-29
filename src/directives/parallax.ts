import type { Directive } from 'vue'

// v-parallax="0.2" — элемент сдвигается при прокрутке медленнее (или быстрее, если значение отрицательное) страницы.
// Один общий обработчик прокрутки с requestAnimationFrame; элементы вне экрана не пересчитываются.
const items = new Map<HTMLElement, number>()
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
let ticking = false

function update() {
  ticking = false
  const vh = window.innerHeight
  items.forEach((speed, el) => {
    const r = el.getBoundingClientRect()
    if (r.bottom < -200 || r.top > vh + 200) return
    const offset = (r.top + r.height / 2 - vh / 2) * speed
    el.style.setProperty('--py', `${(-offset).toFixed(1)}px`)
  })
}
const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }

const parallax: Directive<HTMLElement, number | undefined> = {
  mounted(el, { value }) {
    if (reduced()) return
    el.classList.add('parallax')
    if (!items.size) { window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll) }
    items.set(el, value ?? 0.15)
    onScroll()
  },
  unmounted(el) {
    items.delete(el)
    if (!items.size) { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  },
}
export default parallax
