<script setup lang="ts">
// Полоса на главной → страница бонусов. Не загадка, а конкретика, от которой хочется кликнуть: настоящие подарки
// из каталога с ценой в баллах (самый доступный, средний и самый ценный) и личная строка — сколько баллов уже есть
// и до какого подарка осталось. Подарков нет или каталог ещё грузится — только текст и кнопка.
import { computed } from 'vue'
import { t } from '../../i18n'
import { useAuth } from '../../stores/auth'
import { useBonus } from '../../stores/bonus'
import { useCatalog } from '../../stores/catalog'
import { money } from '../../utils/format'
import ProductArt from '../atoms/ProductArt.vue'
import type { Product } from '../../types'

const auth = useAuth(), bonus = useBonus(), catalog = useCatalog()
const nf = (n: number) => n.toLocaleString('en-US')
const pts = (p: Product) => p.bonusPoints ?? 0

/** Подарки в наличии, дешёвые первыми. */
const gifts = computed(() => bonus.rewards.filter((p) => p.inStock !== false))
/** На полосе — до трёх: с чего начать, середина и к чему идти. */
const shown = computed(() => {
  const g = gifts.value
  return g.length <= 3 ? g : [g[0], g[Math.floor(g.length / 2)], g[g.length - 1]]
})

/** Личная строка: гостю — подарок за регистрацию; покупателю — какой подарок уже по карману или сколько до ближайшего. */
type Line = { kind: 'welcome' | 'first' | 'ready' | 'lack'; text: string; goal?: number; pct?: number }
const line = computed<Line | null>(() => {
  if (!auth.isAuth) {
    const w = catalog.config.bonus?.welcome ?? 0
    return w > 0 ? { kind: 'welcome', text: t('bonus.guestWelcome', { n: nf(w) }) } : null
  }
  const cheapest = gifts.value[0]
  if (!bonus.loaded || !cheapest) return null
  if (!bonus.canRedeem) return { kind: 'first', text: t('bonus.teaserFirst') }
  const have = Math.max(0, bonus.available)
  const best = [...gifts.value].reverse().find((p) => pts(p) <= have) // самый ценный из тех, на что баллов уже хватает
  if (best) return { kind: 'ready', text: t('bonus.teaserReady', { n: nf(have), name: best.name }), goal: best.id }
  return {
    kind: 'lack', goal: cheapest.id,
    text: t('bonus.teaserLack', { n: nf(pts(cheapest) - have), name: cheapest.name }),
    pct: Math.max(4, Math.round((have / pts(cheapest)) * 100)),
  }
})

const kicker = computed(() => (gifts.value.length ? t('bonus.teaserCount', { n: gifts.value.length }) : t('bonus.title')))
const cta = computed(() => t(line.value?.kind === 'ready' ? 'bonus.teaserCtaReady' : 'bonus.teaserCta'))
</script>

<template>
  <RouterLink v-reveal="'zoom'" to="/bonus" class="bt" :class="{ 'has-gifts': shown.length }">
    <div class="bt__txt">
      <span class="bt__kicker">{{ kicker }}</span>
      <h3>{{ $t('bonus.teaserTitle') }}</h3>
      <p>{{ $t('bonus.teaserText', { percent: bonus.percent }) }}</p>
      <div v-if="line" class="bt__me" :class="`is-${line.kind}`">
        <span>{{ line.text }}</span>
        <span v-if="line.pct != null" class="bt__bar" aria-hidden="true"><i :style="{ width: `${line.pct}%` }" /></span>
      </div>
    </div>

    <!-- подробности о каждом подарке — на странице бонусов; здесь картинки для глаза, читалке хватает текста слева -->
    <ul v-if="shown.length" class="bt__gifts" aria-hidden="true">
      <li v-for="p in shown" :key="p.id" class="bt__gift" :class="{ 'is-goal': p.id === line?.goal, 'is-ready': p.id === line?.goal && line?.kind === 'ready' }">
        <span class="bt__art"><ProductArt :kind="p.art" :src="p.image" /></span>
        <b class="bt__name">{{ p.name }}</b>
        <s v-if="p.price && p.unit !== 'kg'" class="bt__was">{{ money(p.price) }}</s>
        <span class="bt__pts">⭐ {{ nf(pts(p)) }}</span>
      </li>
    </ul>
    <span v-else class="bt__icon" aria-hidden="true">🎁</span>

    <span class="bt__cta">{{ cta }} →</span>
  </RouterLink>
</template>

<style scoped>
.bt { position:relative; display:grid; grid-template-columns:1fr auto; grid-template-areas:'txt side' 'cta side'; align-items:center; gap:14px clamp(16px, 3vw, 40px);
  padding:clamp(18px, 2.6vw, 28px) clamp(18px, 3vw, 34px); border-radius:var(--r-lg); color:#1b1500; overflow:hidden;
  background:radial-gradient(300px 160px at 12% 40%, rgb(255 255 255 / .5), transparent 70%), linear-gradient(100deg, var(--yellow-hi), var(--yellow) 55%, #e9a300);
  box-shadow:0 18px 34px -24px rgb(120 80 0 / .8); transition:transform var(--t) var(--ease), box-shadow var(--t); }
/* свет — за веером подарков */
.bt.has-gifts { background:radial-gradient(300px 200px at 84% 50%, rgb(255 255 255 / .6), transparent 70%), linear-gradient(100deg, var(--yellow-hi), var(--yellow) 55%, #e9a300); }

.bt__txt { grid-area:txt; display:flex; flex-direction:column; align-items:flex-start; min-width:0; }
.bt__kicker { margin-bottom:8px; padding:4px 11px; border-radius:var(--pill); background:rgb(27 21 0 / .1); font-size:12.5px; font-weight:800; }
h3 { margin:0 0 6px; font-size:clamp(20px, 2.5vw, 28px); line-height:1.2; }
p { max-width:60ch; margin:0; color:#4a3700; font-size:14.5px; line-height:1.5; }

/* личная строка: что уже по карману или сколько осталось до ближайшего подарка */
.bt__me { display:flex; flex-direction:column; gap:7px; max-width:460px; margin-top:12px; padding:9px 14px; border-radius:var(--r-md); background:rgb(255 255 255 / .6); font-size:14px; font-weight:700; line-height:1.4; }
.bt__me.is-ready { background:#fff; box-shadow:0 0 0 2px var(--dark); }
.bt__bar { display:block; height:8px; border-radius:var(--pill); background:rgb(27 21 0 / .12); overflow:hidden; }
.bt__bar i { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg, #3a4b47, var(--dark)); animation:bt-fill 1.2s .3s var(--ease) backwards; }
@keyframes bt-fill { from { width:0; } }

.bt__cta { grid-area:cta; justify-self:start; padding:10px 20px; border-radius:var(--pill); background:var(--dark); color:#fff; font-size:14px; font-weight:700; transition:padding .3s var(--ease); }

/* веер из настоящих подарков */
.bt__gifts { grid-area:side; display:flex; justify-content:center; margin:0; padding:10px 6px 6px; list-style:none; pointer-events:none; }
.bt__gift { position:relative; flex:0 1 136px; min-width:0; display:flex; flex-direction:column; align-items:center; gap:3px; padding:9px 9px 11px; border-radius:var(--r-md); background:#fff; text-align:center;
  box-shadow:0 16px 26px -16px rgb(90 60 0 / .6); transition:transform .5s var(--ease), box-shadow .3s; animation:bt-bob 5s ease-in-out infinite; }
.bt__gift + .bt__gift { margin-left:-4px; }
.bt__gift:nth-child(1) { transform:rotate(-6deg) translateY(8px); }
.bt__gift:nth-child(2) { z-index:1; transform:translateY(-6px); animation-delay:.6s; }
.bt__gift:nth-child(3) { transform:rotate(6deg) translateY(8px); animation-delay:1.2s; }
.bt__gift:only-child { transform:rotate(-3deg); }
.bt__gift.is-goal { z-index:2; box-shadow:0 0 0 3px var(--dark), 0 16px 26px -14px rgb(90 60 0 / .7); }
.bt__gift.is-ready::after { content:'✓'; position:absolute; top:-9px; right:-9px; display:grid; place-items:center; width:26px; height:26px; border:2px solid #fff; border-radius:50%; background:var(--green); color:#fff; font-size:14px; font-weight:800; }
@keyframes bt-bob { 50% { translate:0 -5px; } }

.bt__art { display:flex; align-items:center; justify-content:center; width:100%; height:clamp(66px, 7vw, 86px); padding:6px; border-radius:10px; background:radial-gradient(circle at 50% 40%, #fff, var(--cream)); }
.bt__art > * { width:auto; max-width:88%; height:100%; } /* картинка вписана в рамку по высоте: в широкой карточке не налезает на название */
.bt__name { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; min-height:2.7em; margin-top:3px; overflow:hidden; font-size:12.5px; font-weight:600; line-height:1.35; }
.bt__was { color:var(--muted); font-size:11.5px; }
.bt__pts { margin-top:2px; padding:3px 10px; border-radius:var(--pill); background:var(--dark); color:var(--yellow); font-size:13px; font-weight:800; white-space:nowrap; }

/* подарков нет — просто значок */
.bt__icon { grid-area:side; display:grid; place-items:center; width:64px; height:64px; border-radius:50%; background:#fff; font-size:32px; box-shadow:0 8px 18px -10px rgb(0 0 0 / .4); animation:float 6s ease-in-out infinite; }

@media (hover:hover) {
  .bt:hover { transform:translateY(-3px); box-shadow:0 24px 40px -24px rgb(120 80 0 / .9); }
  .bt:hover .bt__cta { padding-inline:26px; }
  /* веер раскрывается */
  .bt:hover .bt__gift:nth-child(1) { transform:rotate(-11deg) translate(-10px, 6px); }
  .bt:hover .bt__gift:nth-child(2) { transform:translateY(-12px) scale(1.05); }
  .bt:hover .bt__gift:nth-child(3) { transform:rotate(11deg) translate(10px, 6px); }
}
@media (prefers-reduced-motion:reduce) { .bt__gift, .bt__icon, .bt__bar i { animation:none; } }

/* узко: текст, под ним веер, внизу кнопка на всю ширину */
@media (max-width:860px) {
  .bt.has-gifts { grid-template-columns:1fr; grid-template-areas:'txt' 'side' 'cta'; }
  .bt.has-gifts .bt__cta { justify-self:stretch; text-align:center; }
  .bt__gifts { padding-top:14px; }
  .bt__art { height:clamp(70px, 14vw, 100px); }
}
@media (max-width:560px) {
  .bt:not(.has-gifts) { grid-template-areas:'txt side' 'cta cta'; }
  .bt__icon { width:50px; height:50px; font-size:26px; align-self:start; }
  .bt__gift { padding:7px 7px 9px; }
  .bt__gift + .bt__gift { margin-left:-8px; }
  .bt__gift:nth-child(1) { transform:rotate(-5deg) translateY(6px); }
  .bt__gift:nth-child(3) { transform:rotate(5deg) translateY(6px); }
  .bt__name { font-size:11.5px; }
  .bt__pts { padding:2px 8px; font-size:12px; }
}
</style>
