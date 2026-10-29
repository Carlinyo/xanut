<script setup lang="ts">
import { computed, ref } from 'vue'
import { SHOP_LOCATION } from '../../shop'

// Карта OpenStreetMap (без ключа). Загружается, только когда блок появился на экране.
const { lat, lon, zoom } = SHOP_LOCATION
const span = 0.012 * Math.pow(2, 16 - zoom)
const src = computed(() =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${lon - span},${lat - span * 0.6},${lon + span},${lat + span * 0.6}&layer=mapnik&marker=${lat},${lon}`)
const google = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
const loaded = ref(false)
</script>

<template>
  <figure class="map" :class="{ loaded }">
    <div class="map__frame">
      <iframe :src="src" :title="$t('contact.mapTitle')" loading="lazy" referrerpolicy="no-referrer-when-downgrade" @load="loaded = true" />
      <div class="map__skeleton" aria-hidden="true"><span class="map__pin">📍</span></div>
    </div>
    <figcaption class="map__bar">
      <span class="map__addr"><span class="map__pulse" aria-hidden="true" />{{ $t('contact.address') }}</span>
      <a :href="google" target="_blank" rel="noopener">{{ $t('contact.openMap') }} ↗</a>
    </figcaption>
  </figure>
</template>

<style scoped>
.map { margin:0; overflow:hidden; border:1px solid var(--line); border-radius:var(--r-lg); background:#fff; box-shadow:var(--shadow-sm); }
.map__frame { position:relative; aspect-ratio:16 / 9; min-height:260px; background:var(--bg); }
iframe { position:absolute; inset:0; width:100%; height:100%; border:0; opacity:0; transition:opacity .6s ease; }
.loaded iframe { opacity:1; }
.map__skeleton { position:absolute; inset:0; display:grid; place-items:center; background:linear-gradient(110deg, var(--bg) 30%, #fff 50%, var(--bg) 70%); background-size:200% 100%; animation:shimmer 1.4s linear infinite; transition:opacity .5s; }
.loaded .map__skeleton { opacity:0; pointer-events:none; }
.map__pin { font-size:34px; animation:drop 1.2s cubic-bezier(.16,1,.3,1) infinite alternate; }
@keyframes drop { from { transform:translateY(-10px); } }
.map__bar { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; padding:14px 18px; font-size:14px; }
.map__addr { display:inline-flex; align-items:center; gap:10px; font-weight:600; }
.map__pulse { width:10px; height:10px; border-radius:50%; background:var(--red); animation:pulse 1.8s ease-out infinite; box-shadow:0 0 0 0 rgb(229 52 43 / .6); }
@keyframes pulse { 70% { box-shadow:0 0 0 10px rgb(229 52 43 / 0); } 100% { box-shadow:0 0 0 0 rgb(229 52 43 / 0); } }
a { color:var(--yellow-lo); font-weight:700; }
</style>
