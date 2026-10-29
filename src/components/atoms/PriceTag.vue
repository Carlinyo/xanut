<script setup lang="ts">
import { money } from '../../utils/format'
withDefaults(defineProps<{ price: number; old?: number; size?: 'md' | 'lg' }>(), { size: 'md' })
</script>

<template>
  <p class="price" :class="`price--${size}`">
    <s v-if="old">{{ money(old) }}</s><b>{{ money(price) }}</b>
  </p>
</template>

<style scoped>
.price { margin:0; display:flex; align-items:baseline; flex-wrap:wrap; gap:2px 8px; }
s { color:#98a3a0; font-size:12px; }
b { font-size:19px; font-weight:800; }
.price--lg b { font-size:clamp(26px, 3vw, 34px); }
.price--lg s { font-size:16px; }
@media (max-width:480px) { .price--md b { font-size:16px; } }
</style>
