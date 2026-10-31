<script setup lang="ts">
import { money } from '../../utils/format'
import type { ProductUnit } from '../../types'
// unit: kg — цена за 1 кг (подпись «/կգ»); за штуку подписи нет — цена за штуку и так подразумевается
withDefaults(defineProps<{ price: number; old?: number; size?: 'md' | 'lg'; unit?: ProductUnit }>(), { size: 'md' })
</script>

<template>
  <p class="price" :class="`price--${size}`">
    <s v-if="old">{{ money(old) }}</s><b>{{ money(price) }}<small v-if="unit === 'kg'" class="price__unit">/{{ $t('units.kg') }}</small></b>
  </p>
</template>

<style scoped>
.price { margin:0; display:flex; align-items:baseline; flex-wrap:wrap; gap:2px 8px; }
s { color:#98a3a0; font-size:12px; }
b { font-size:19px; font-weight:800; }
.price__unit { margin-left:2px; color:var(--muted); font-size:.62em; font-weight:700; }
.price--lg b { font-size:clamp(26px, 3vw, 34px); }
.price--lg s { font-size:16px; }
@media (max-width:480px) { .price--md b { font-size:16px; } }
</style>
