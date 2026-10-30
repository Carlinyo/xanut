<script setup lang="ts">
import { formatSlot, money } from '../../utils/format'
import { discountLabel } from '../../utils/segments'
import type { Order } from '../../types'

defineProps<{ orders: Order[] }>()
</script>

<template>
  <ul v-reveal.stagger class="orders">
    <li v-for="o in orders" :key="o.id">
      <div class="orders__top"><b>{{ new Date(o.createdAt).toLocaleString('en-GB') }}</b><span>{{ money(o.total) }}</span></div>
      <small class="orders__status">{{ $t('orderStatus.' + o.status) }}</small>
      <small>{{ o.items.map((i) => i.name + ' × ' + i.qty).join(', ') }}</small>
      <small v-if="o.delivery === 'pickup'">🏪 {{ $t('cart.pickup') }}</small>
      <small v-else>📍 {{ o.address }}</small>
      <small v-if="o.time">🕘 {{ formatSlot(o.time) }}</small>
      <small v-if="o.discount" class="orders__disc">🏷 {{ discountLabel(o.segment) }}՝ −{{ money(o.discount) }}</small>
      <small v-if="o.bonus && (o.bonus.earned || o.bonus.spent)" class="orders__bonus" :class="`is-${o.bonus.state}`">
        <span v-if="o.bonus.earned">⭐ {{ $t('bonus.earned', { n: o.bonus.earned.toLocaleString('en-US') }) }} {{ $t('bonus.unit') }} · {{ $t('bonus.state.' + o.bonus.state) }}</span>
        <span v-if="o.bonus.spent">🎁 {{ $t('bonus.spent', { n: o.bonus.spent.toLocaleString('en-US') }) }} {{ $t('bonus.unit') }}</span>
      </small>
    </li>
  </ul>
</template>

<style scoped>
.orders { display:flex; flex-direction:column; gap:12px; margin:0; padding:0; list-style:none; }
li { display:flex; flex-direction:column; gap:4px; padding:14px 16px; border:1px solid var(--line); border-radius:var(--r-lg); transition:border-color .25s, box-shadow .25s; }
li:hover { border-color:var(--yellow); box-shadow:var(--shadow-sm); }
.orders__top { display:flex; justify-content:space-between; gap:12px; }
small { color:var(--muted); overflow-wrap:anywhere; }
.orders__status { color:var(--yellow-lo); font-weight:700; }
.orders__disc { color:var(--green); font-weight:600; }
.orders__bonus { display:flex; flex-wrap:wrap; gap:4px 14px; color:#8a5f00; font-weight:600; }
.orders__bonus.is-available { color:var(--green); }
.orders__bonus.is-cancelled { text-decoration:line-through; opacity:.7; }
</style>
