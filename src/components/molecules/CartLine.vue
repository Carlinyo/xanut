<script setup lang="ts">
import ProductArt from '../atoms/ProductArt.vue'
import QuantityStepper from './QuantityStepper.vue'
import { money } from '../../utils/format'
import { useCart } from '../../stores/cart'
import type { CartItem } from '../../types'

defineProps<{ item: CartItem }>()
defineEmits<{ change: [delta: number] }>()
const cart = useCart()
</script>

<template>
  <li class="line">
    <span class="line__art"><ProductArt :kind="item.art" :src="item.image" :alt="item.name" /></span>
    <div class="line__body">
      <b>{{ item.name }}</b>
      <small v-if="item.note">{{ item.note }}</small>
      <!-- рыба, кролик на развес: цена мяса — после взвешивания (у шашлыка сразу видны только добавки) -->
      <em v-if="item.weighed" class="line__weigh">
        <template v-if="item.price">{{ money(item.price) }} + </template>{{ $t('weigh.cartPrice', { price: (item.perKg ?? 0).toLocaleString('en-US') }) }}
      </em>
      <em v-else>{{ money(item.price) }}</em>
    </div>
    <QuantityStepper :value="item.qty" :max="cart.maxQty(item)" @change="$emit('change', $event)" />
  </li>
</template>

<style scoped>
.line { display:flex; align-items:center; gap:12px; padding-bottom:14px; border-bottom:1px solid var(--line); }
.line__art { display:grid; place-items:center; flex:none; width:52px; height:52px; border-radius:var(--r-md); background:var(--bg); }
.line__art > * { width:80%; height:80%; }
.line__body { flex:1; min-width:0; display:flex; flex-direction:column; font-size:14px; overflow-wrap:anywhere; }
small { color:var(--muted); font-size:12px; }
em { margin-top:2px; font-style:normal; font-weight:800; }
.line__weigh { color:#7a5600; font-size:13px; font-weight:700; }
@media (max-width:480px) { .line__art { width:44px; height:44px; } .line { gap:8px; } }
</style>
