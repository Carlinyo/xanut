import type { Directive } from 'vue'

// v-reveal                 — плавное появление при прокрутке (снизу вверх)
// v-reveal="'left'"        — варианты: up | down | left | right | zoom | blur | flip
// v-reveal.stagger="'zoom'"— дочерние элементы появляются по очереди
// v-reveal.once=false не нужен: элемент анимируется один раз, затем наблюдение снимается
export type RevealVariant = 'up' | 'down' | 'left' | 'right' | 'zoom' | 'blur' | 'flip'

const io: IntersectionObserver | null = typeof IntersectionObserver === 'undefined' ? null
  : new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io?.unobserve(e.target) }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })

function indexChildren(el: HTMLElement) {
  Array.from(el.children).forEach((c, i) => (c as HTMLElement).style.setProperty('--i', String(i)))
}

const reveal: Directive<HTMLElement, RevealVariant | undefined> = {
  mounted(el, { modifiers, value }) {
    el.dataset.reveal = value ?? 'up'
    if (modifiers.stagger) { el.classList.add('stagger'); indexChildren(el) }
    else el.classList.add('reveal')
    if (io) io.observe(el); else el.classList.add('in')
  },
  // в сетках товары могут добавляться и удаляться — пересчитываем порядок для задержек
  updated(el, { modifiers }) { if (modifiers.stagger) indexChildren(el) },
  unmounted(el) { io?.unobserve(el) },
}
export default reveal
