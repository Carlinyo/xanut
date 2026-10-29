<script setup lang="ts">
import type { LinkTo } from '../../types'

defineProps<{ link?: { to: LinkTo; label: string } }>()
</script>

<template>
  <div v-reveal="'left'" class="st">
    <h2><slot /></h2>
    <RouterLink v-if="link" :to="link.to" class="st__more">{{ link.label }}</RouterLink>
  </div>
</template>

<style scoped>
.st { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:clamp(14px, 2vw, 20px); }
h2 { display:flex; align-items:center; gap:12px; margin:0; font-size:clamp(19px, 2.2vw, 26px); font-weight:800; }
h2::before { content:''; width:5px; height:1.1em; border-radius:3px; background:linear-gradient(var(--yellow), #ff7a1a); transform-origin:50% 100%; }
.st.in h2::before { animation:grow .7s cubic-bezier(.16,1,.3,1) .25s backwards; }
@keyframes grow { from { transform:scaleY(0); } }
.st__more { padding:6px 14px; border-radius:var(--pill); background:var(--cream); color:var(--yellow-lo); font-size:14px; font-weight:700; transition:background .25s, transform .25s var(--ease); }
.st__more:hover { background:var(--yellow); color:#1b1500; transform:translateX(3px); }
</style>
