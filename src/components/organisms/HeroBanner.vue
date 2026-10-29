<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { t } from '../../i18n'
import AppButton from '../atoms/AppButton.vue'
defineEmits<{ kebab: [] }>()

// заголовок появляется по словам
const words = computed(() => String(t('hero.title')).split(' '))

// искры от мангала: позиции и скорости фиксированы (псевдослучайно), чтобы не «прыгали» между рендерами
const sparks = Array.from({ length: 26 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
  return { left: `${(r(1) * 100).toFixed(1)}%`, size: `${(2 + r(2) * 4).toFixed(1)}px`, dur: `${(5 + r(3) * 7).toFixed(2)}s`, delay: `${(-r(4) * 12).toFixed(2)}s`, drift: `${((r(5) - 0.5) * 120).toFixed(0)}px` }
})

// прокрутка: текст уходит вверх и тает, фоновая сцена смещается медленнее (глубина); мышь — лёгкий сдвиг сцены
const root = ref<HTMLElement | null>(null)
let frame = 0
const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
function onScroll() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const el = root.value
    if (!el) return
    const p = Math.min(1, Math.max(0, window.scrollY / el.offsetHeight))
    el.style.setProperty('--sp', p.toFixed(3))
  })
}
function onPointer(e: PointerEvent) {
  const el = root.value
  if (!el || e.pointerType !== 'mouse') return
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
  el.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
}
onMounted(() => { if (!reduced) { onScroll(); window.addEventListener('scroll', onScroll, { passive: true }) } })
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <section ref="root" class="hero" @pointermove="!reduced && onPointer($event)">
    <div class="hero__bg" aria-hidden="true" />
    <div class="hero__shade" aria-hidden="true" />
    <div class="hero__glow" aria-hidden="true" />
    <div class="hero__sparks" aria-hidden="true">
      <i v-for="(s, i) in sparks" :key="i" :style="{ left: s.left, width: s.size, height: s.size, '--dur': s.dur, '--delay': s.delay, '--drift': s.drift }" />
    </div>

    <div class="wrap hero__in">
      <div class="hero__copy">
        <p class="hero__eyebrow"><span class="hero__dot" />{{ $t('hero.eyebrow') }}</p>
        <h1>
          <span v-for="(w, i) in words" :key="i" class="hero__word" :style="{ '--w': i }">{{ w }}&nbsp;</span>
          <em class="hero__accent" :style="{ '--w': words.length }">{{ $t('hero.accent') }}</em>
        </h1>
        <p class="hero__sub">{{ $t('hero.sub') }}</p>
        <div class="hero__cta">
          <AppButton to="/products" size="lg">🛒 {{ $t('hero.start') }}</AppButton>
          <AppButton variant="ghost" size="lg" @click="$emit('kebab')">🍢 {{ $t('hero.kebab') }}</AppButton>
        </div>
      </div>

    </div>
    <div class="hero__fade" aria-hidden="true" />
  </section>
</template>

<style scoped>
.hero { --sp:0; --mx:0; --my:0; position:relative; overflow:hidden; color:#fff; isolation:isolate; background:#0b100f; }
/* фоновая сцена: мангал с шампурами над углями (public/img/bg/hero.webp) */
.hero__bg { position:absolute; inset:-6% -3%; z-index:-3; background:url(/img/bg/hero.webp) right bottom / cover no-repeat;
  transform:translate3d(calc(var(--mx) * -18px), calc(var(--sp) * 140px + var(--my) * -10px), 0) scale(1.06);
  transition:transform .3s ease-out; will-change:transform; animation:bgIn 1.6s cubic-bezier(.16,1,.3,1) backwards; }
@keyframes bgIn { from { opacity:0; transform:scale(1.14); } }
/* затемнение слева — чтобы текст хорошо читался поверх сцены */
.hero__shade { position:absolute; inset:0; z-index:-2; background:linear-gradient(90deg, rgb(9 14 13 / .95) 0%, rgb(9 14 13 / .86) 34%, rgb(9 14 13 / .5) 52%, rgb(9 14 13 / .08) 74%, rgb(9 14 13 / 0) 86%), linear-gradient(0deg, rgb(9 14 13 / .5), transparent 32%); }
.hero__glow { position:absolute; inset:auto -10% -40% 30%; height:70%; z-index:-1; background:radial-gradient(60% 60% at 70% 100%, rgb(255 120 30 / .3), transparent 70%); animation:breathe 5s ease-in-out infinite; mix-blend-mode:screen; }
@keyframes breathe { 50% { opacity:.55; transform:scale(1.05); } }

/* искры */
.hero__sparks { position:absolute; inset:0; z-index:-1; pointer-events:none; }
.hero__sparks i { position:absolute; bottom:-10px; border-radius:50%; background:radial-gradient(circle, #fff3c4, #ffb02e 45%, #ff5a1a 70%, transparent 72%); box-shadow:0 0 8px 2px rgb(255 140 40 / .7); opacity:0; animation:spark var(--dur) linear var(--delay) infinite; }
@keyframes spark {
  0% { transform:translate(0, 0) scale(1); opacity:0; }
  8% { opacity:1; }
  70% { opacity:.8; }
  100% { transform:translate(var(--drift), -110vh) scale(.3); opacity:0; }
}

.hero__in { position:relative; display:flex; align-items:center; gap:24px; min-height:clamp(400px, 42vw, 620px); padding-block:clamp(32px, 5vw, 72px); }
.hero__copy { max-width:640px; transform:translateY(calc(var(--sp) * 90px)); opacity:calc(1 - var(--sp) * 1.1); }
.hero__eyebrow { display:inline-flex; align-items:center; gap:10px; margin:0; padding:6px 14px; border:1px solid rgb(246 178 26 / .35); border-radius:var(--pill); background:rgb(246 178 26 / .08); color:var(--yellow); font-weight:600; font-size:14px; animation:rise .8s var(--ease) backwards; }
.hero__dot { width:8px; height:8px; border-radius:50%; background:#ff7a1a; box-shadow:0 0 0 0 rgb(255 122 26 / .7); animation:pulse 1.8s ease-out infinite; }
@keyframes pulse { 70% { box-shadow:0 0 0 10px rgb(255 122 26 / 0); } 100% { box-shadow:0 0 0 0 rgb(255 122 26 / 0); } }

h1 { margin:14px 0 14px; font-size:clamp(30px, 4.6vw, 62px); font-weight:800; letter-spacing:-.025em; line-height:1.08; }
.hero__word { display:inline-block; animation:word .9s cubic-bezier(.16,1,.3,1) backwards; animation-delay:calc(.15s + var(--w) * .08s); }
@keyframes word { from { opacity:0; transform:translateY(.6em) rotate(4deg); filter:blur(8px); } }
.hero__accent { display:block; font-style:normal; background:linear-gradient(90deg, #ffd85a, #ff9a2a 30%, #fff1b0 50%, #ff9a2a 70%, #ffd85a); background-size:200% auto; -webkit-background-clip:text; background-clip:text; color:transparent;
  animation:word .9s cubic-bezier(.16,1,.3,1) backwards, shimmer 5s linear 1.2s infinite; animation-delay:calc(.15s + var(--w) * .08s), 1.2s; }
.hero__sub { margin:0; color:#d9e3e1; animation:rise .9s var(--ease) .55s backwards; }
.hero__cta { display:flex; flex-wrap:wrap; gap:12px; margin-top:26px; animation:rise .9s var(--ease) .7s backwards; }

.hero__fade { position:absolute; inset:auto 0 0; height:60px; background:linear-gradient(transparent, rgb(14 26 25 / .35)); pointer-events:none; }

@media (max-width:700px) {
  .hero__bg { background-position:74% bottom; }
  /* на телефоне мангал виден под кнопками, а не за ними */
  .hero__shade { background:linear-gradient(180deg, rgb(9 14 13 / .93) 0%, rgb(9 14 13 / .84) 52%, rgb(9 14 13 / .3) 80%, rgb(9 14 13 / .08) 100%); }
  .hero__in { min-height:0; padding-bottom:clamp(150px, 42vw, 210px); }
  .hero__cta > * { flex:1 1 220px; }
}
@media (prefers-reduced-motion:reduce) { .hero__bg { transform:none; } }
</style>
