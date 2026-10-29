<script setup lang="ts">
import PromoBanner from '../molecules/PromoBanner.vue'
</script>

<template>
  <div v-reveal.stagger="'right'" class="promos">
    <PromoBanner v-for="p in $t('promos')" :key="p.title" :title="p.title" :text="p.text" :art="p.art" :to="{ path: '/products', query: { cat: p.cat } }" />
  </div>
</template>

<style scoped>
.promos { display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; }
@media (max-width:900px) { .promos { grid-template-columns:1fr; } }
</style>
