<script setup lang="ts">
import CategoryTile from '../molecules/CategoryTile.vue'
import type { Category } from '../../types'

defineProps<{ categories: Category[] }>()
</script>

<template>
  <div v-reveal.stagger="'zoom'" class="cats">
    <CategoryTile v-for="c in categories" :key="c.id" :name="c.name" :art="c.art" :orderable="c.orderable" :to="{ path: '/products', query: { cat: c.id } }" />
  </div>
</template>

<style scoped>
.cats { display:grid; grid-template-columns:repeat(6, 1fr); gap:clamp(10px, 1.5vw, 16px); }
@media (max-width:1100px) { .cats { grid-template-columns:repeat(4, 1fr); } }
@media (max-width:700px) { .cats { grid-template-columns:repeat(3, 1fr); } }
@media (max-width:360px) { .cats { grid-template-columns:repeat(2, 1fr); } }
</style>
