<script setup lang="ts">
import { useCart } from '../../stores/cart'
import ProductCard from '../molecules/ProductCard.vue'
import type { Product } from '../../types'

defineProps<{ products: Product[]; scroll?: boolean; four?: boolean }>()
const cart = useCart()
</script>

<template>
  <div v-reveal.stagger class="grid" :class="{ 'grid--scroll': scroll, 'grid--four': four }">
    <ProductCard v-for="p in products" :key="p.id" :product="p" @add="cart.add" />
  </div>
</template>

<style scoped>
.grid { display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:clamp(10px, 1.5vw, 16px); }
.grid--four { grid-template-columns:repeat(4, minmax(0, 1fr)); }
@media (min-width:1600px) { .grid--four { grid-template-columns:repeat(5, minmax(0, 1fr)); } }
@media (min-width:2200px) { .grid, .grid--four { grid-template-columns:repeat(6, minmax(0, 1fr)); } }
@media (max-width:1100px) {
  .grid { grid-template-columns:repeat(4, minmax(0, 1fr)); }
  .grid--four { grid-template-columns:repeat(3, minmax(0, 1fr)); }
  .grid--scroll { display:flex; gap:12px; overflow-x:auto; scroll-snap-type:x mandatory; margin-inline:calc(var(--gutter) * -1); padding:6px var(--gutter) 14px; scrollbar-width:thin; }
  .grid--scroll > * { flex:0 0 clamp(170px, 30vw, 230px); scroll-snap-align:start; }
}
@media (max-width:700px) { .grid, .grid--four { grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; } }
@media (max-width:480px) { .grid--scroll > * { flex-basis:62vw; } }
</style>
