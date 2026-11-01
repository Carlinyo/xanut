<script setup lang="ts">
import PromoBanner from '../molecules/PromoBanner.vue'
</script>

<template>
  <div v-reveal.stagger="'right'" class="promos">
    <PromoBanner v-for="p in $t('promos')" :key="p.title" :title="p.title" :text="p.text" :art="p.art" :to="{ path: '/products', query: { cat: p.cat } }" />
  </div>
</template>

<style scoped>
/* сколько баннеров в promos (hy.json), столько равных колонок */
.promos { display:grid; grid-auto-flow:column; grid-auto-columns:1fr; gap:16px; }
@media (max-width:900px) { .promos { grid-auto-flow:row; } }
</style>
