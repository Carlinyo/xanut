<script setup lang="ts">
import ProductArt from '../atoms/ProductArt.vue'
defineProps<{ art: string; title: string; text: string }>()
</script>

<template>
  <div class="info">
    <ProductArt :kind="art" :alt="title" class="info__art" />
    <h3>{{ title }}</h3>
    <p>{{ text }}</p>
  </div>
</template>

<style scoped>
.info { padding:24px; border-radius:var(--r-lg); background:var(--bg); text-align:center; transition:transform var(--t) var(--ease), box-shadow var(--t); }
.info__art { width:110px; height:110px; margin:0 auto 8px; }
h3 { margin:0 0 6px; }
p { margin:0; color:var(--muted); font-size:14px; }
@media (hover:hover) { .info:hover { transform:translateY(-4px); box-shadow:var(--shadow-md); } }
</style>
