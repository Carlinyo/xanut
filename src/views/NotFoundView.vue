<script setup lang="ts">
// Неизвестный адрес: понятное «не найдено» и пути дальше. Сайт отдаёт эту страницу с кодом 200 (так устроены
// одностраничные сайты на Vercel), поэтому просим поисковики её не индексировать.
import { onMounted, onUnmounted } from 'vue'
import AppButton from '../components/atoms/AppButton.vue'
import ProductArt from '../components/atoms/ProductArt.vue'

let robots: HTMLMetaElement | null = null
onMounted(() => {
  robots = document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'noindex'
  document.head.appendChild(robots)
})
onUnmounted(() => robots?.remove())
</script>

<template>
  <div class="wrap page nf">
    <div class="nf__art" aria-hidden="true"><ProductArt kind="kebab" /></div>
    <p class="nf__code" aria-hidden="true">404</p>
    <h1>{{ $t('notFound.title') }}</h1>
    <p class="muted nf__text">{{ $t('notFound.text') }}</p>
    <div class="nf__actions">
      <AppButton to="/" size="lg">{{ $t('notFound.home') }}</AppButton>
      <AppButton to="/products" size="lg" variant="light">🛒 {{ $t('nav.products') }}</AppButton>
    </div>
  </div>
</template>

<style scoped>
.nf { display:flex; flex-direction:column; align-items:center; gap:12px; padding-block:clamp(28px, 8vw, 72px); text-align:center; }
.nf__art { width:clamp(110px, 26vw, 160px); aspect-ratio:1; animation:rise .7s var(--ease) backwards; }
.nf__code { margin:0; font-size:clamp(56px, 14vw, 96px); font-weight:800; line-height:1; letter-spacing:.04em;
  background:linear-gradient(180deg, var(--yellow-hi), var(--yellow-lo)); -webkit-background-clip:text; background-clip:text; color:transparent; }
h1 { margin:0; }
.nf__text { max-width:420px; margin:0; line-height:1.5; }
.nf__actions { display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:8px; }
@media (prefers-reduced-motion:reduce) { .nf__art { animation:none; } }
</style>
