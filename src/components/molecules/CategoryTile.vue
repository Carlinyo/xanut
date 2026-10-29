<script setup lang="ts">
import ProductArt from '../atoms/ProductArt.vue'
import type { LinkTo } from '../../types'

defineProps<{ name: string; art: string; to: LinkTo; orderable?: boolean }>()
</script>

<template>
  <RouterLink :to="to" class="tile" :class="{ 'tile--hot': orderable }">
    <span class="tile__art"><ProductArt :kind="art" :alt="name" /></span>
    <span class="tile__name">{{ name }}</span>
    <span v-if="orderable" class="tile__tag">🔥 {{ $t('showcase.orderable') }}</span>
  </RouterLink>
</template>

<style scoped>
.tile { display:flex; flex-direction:column; align-items:center; gap:10px; padding:16px 8px 14px; border:1.5px solid transparent; border-radius:var(--r-lg); background:var(--bg); text-align:center; font-weight:600; font-size:13px; line-height:1.3; transition:background .3s, border-color .3s, box-shadow .3s, transform .4s var(--ease); }
.tile__art { display:grid; place-items:center; width:clamp(60px, 7vw, 84px); aspect-ratio:1; border-radius:50%; background:#fff; box-shadow:inset 0 0 0 1px var(--line); transition:transform .5s var(--ease); }
.tile__art > * { width:72%; height:72%; }
@media (hover:hover) {
  .tile:hover { background:var(--cream); border-color:var(--yellow); box-shadow:var(--shadow-sm); transform:translateY(-4px); }
  .tile:hover .tile__art { transform:scale(1.1) rotate(-6deg); }
}
@media (max-width:700px) { .tile { padding:12px 6px; font-size:12px; } }
.tile { position:relative; }
.tile__tag { padding:2px 8px; border-radius:var(--pill); background:var(--yellow); color:#1b1500; font-size:10.5px; font-weight:800; }
.tile--hot { background:var(--cream); }
</style>
