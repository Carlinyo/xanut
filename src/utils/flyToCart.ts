// «Полёт в корзину»: копия картинки товара улетает по дуге к значку корзины, затем значок подпрыгивает.
export function flyToCart(source: HTMLElement | null) {
  if (!source || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-target]'))
  const target = targets.find((t) => t.offsetParent !== null) // видимый: кнопка в шапке или плавающая на телефоне
  if (!target) return
  const a = source.getBoundingClientRect(), b = target.getBoundingClientRect()
  const ghost = source.cloneNode(true) as HTMLElement
  Object.assign(ghost.style, {
    position: 'fixed', left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`,
    margin: '0', zIndex: '9999', pointerEvents: 'none', borderRadius: '50%', willChange: 'transform, opacity',
  })
  document.body.appendChild(ghost)
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2)
  const anim = ghost.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 120}px) scale(.55) rotate(-12deg)`, opacity: 0.95, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.12) rotate(-24deg)`, opacity: 0.4 },
  ], { duration: 750, easing: 'cubic-bezier(.5,0,.3,1)' })
  anim.onfinish = () => {
    ghost.remove()
    target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25) rotate(-8deg)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' })
  }
}
