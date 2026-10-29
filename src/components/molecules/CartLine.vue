<script setup lang="ts">
import ProductArt from '../atoms/ProductArt.vue'
import QuantityStepper from './QuantityStepper.vue'
import { money } from '../../utils/format'
import { MAX_QTY } from '../../stores/cart'
import type { CartItem } from '../../types'

defineProps<{ item: CartItem }>()
defineEmits<{ change: [delta: number] }>()
</script>

<template>
  <li class="line">
    <span class="line__art"><ProductArt :kind="item.art" :src="item.image" :alt="item.name" /></span>
    <div class="line__body">
      <b>{{ item.name }}</b>
      <small v-if="item.note">{{ item.note }}</small>
      <em>{{ money(item.price) }}</em>
    </div>
    <QuantityStepper :value="item.qty" :max="MAX_QTY" @change="$emit('change', $event)" />
  </li>
</template>

<style scoped>
.line { display:flex; align-items:center; gap:12px; padding-bottom:14px; border-bottom:1px solid var(--line); }
.line__art { display:grid; place-items:center; flex:none; width:52px; height:52px; border-radius:var(--r-md); background:var(--bg); }
.line__art > * { width:80%; height:80%; }
.line__body { flex:1; min-width:0; display:flex; flex-direction:column; font-size:14px; overflow-wrap:anywhere; }
small { color:var(--muted); font-size:12px; }
em { margin-top:2px; font-style:normal; font-weight:800; }
@media (max-width:480px) { .line__art { width:44px; height:44px; } .line { gap:8px; } }
</style>
