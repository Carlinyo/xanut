<script setup lang="ts">
import ProductArt from '../atoms/ProductArt.vue'
import type { LinkTo } from '../../types'

// sketch — карандашный рисунок раздела (public/img/cat), в белом круге, как на плитках «Տեսականի»;
// без него — рисунок art или фото image из public/img/art
defineProps<{ title: string; text: string; art: string; image?: string; sketch?: string; to: LinkTo }>()
</script>

<template>
  <RouterLink :to="to" class="promo">
    <div class="promo__txt">
      <h3>{{ title }}</h3>
      <p>{{ text }}</p>
      <span class="promo__cta">{{ $t('common.view') }}</span>
    </div>
    <span v-if="sketch" class="promo__art promo__disc" aria-hidden="true"><ProductArt :src="sketch" /></span>
    <ProductArt v-else :kind="art" :src="image" class="promo__art" aria-hidden="true" />
  </RouterLink>
</template>

<style scoped>
.promo { position:relative; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:clamp(16px, 2vw, 24px); border-radius:var(--r-lg); color:#fff; background:radial-gradient(240px 160px at 90% 50%, rgb(246 178 26 / .28), transparent 70%), linear-gradient(110deg, rgb(14 26 25 / .95) 30%, rgb(26 18 12 / .62)), url(/img/bg/coals.webp) center / cover, var(--dark); overflow:hidden; transition:transform var(--t) var(--ease), box-shadow var(--t); }
.promo h3 { margin:0 0 4px; font-size:clamp(18px, 2vw, 22px); white-space:nowrap; }
.promo p { margin:0 0 14px; color:#c9d6d3; font-size:13px; }
.promo__cta { display:inline-block; padding:7px 16px; border-radius:var(--pill); background:var(--yellow); color:#1b1500; font-size:13px; font-weight:700; transition:padding .3s var(--ease); }
/* заголовок в одну строку, место ему уступает картинка: «Նապաստակի միս» в узком баннере не переносится */
.promo__art { width:clamp(96px, 11vw, 140px); height:clamp(96px, 11vw, 140px); flex:0 1 auto; min-width:72px; transition:transform .6s var(--ease); }
/* круг остаётся кругом, когда баннер узкий и картинка сжимается по ширине */
.promo__disc { display:grid; place-items:center; height:auto; aspect-ratio:1; border-radius:50%; background:#fff; box-shadow:0 0 0 5px rgb(255 255 255 / .1), 0 10px 24px rgb(0 0 0 / .35); }
.promo__disc > * { width:80%; height:80%; } /* под эту долю вписаны рисунки public/img/cat (TILE в tools/render-sketches.mjs) */
@media (hover:hover) {
  .promo:hover { transform:translateY(-4px); box-shadow:var(--shadow-md); }
  .promo:hover .promo__art { transform:scale(1.12) rotate(-6deg); }
  .promo:hover .promo__cta { padding-inline:22px; }
}
</style>
