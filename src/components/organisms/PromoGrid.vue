<script setup lang="ts">
import { t } from '../../i18n'
import PromoBanner from '../molecules/PromoBanner.vue'

const promos = t('promos') as { title: string; text: string; cat: number; art: string; image?: string }[]
// не больше трёх в ряд (на планшете — двух): два баннера стоят парой, шесть — двумя рядами по три
const cols = { '--cols': Math.min(promos.length, 3), '--cols-md': Math.min(promos.length, 2) }
</script>

<template>
  <div v-reveal.stagger="'right'" class="promos" :style="cols">
    <PromoBanner v-for="p in promos" :key="p.title" :title="p.title" :text="p.text" :art="p.art" :image="p.image" :to="{ path: '/products', query: { cat: p.cat } }" />
  </div>
</template>

<style scoped>
.promos { display:grid; grid-template-columns:repeat(var(--cols), 1fr); gap:16px; }
@media (max-width:1100px) { .promos { grid-template-columns:repeat(var(--cols-md), 1fr); } }
@media (max-width:640px) { .promos { grid-template-columns:1fr; } }
</style>
