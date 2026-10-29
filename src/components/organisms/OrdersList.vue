<script setup lang="ts">
import { formatSlot, money } from '../../utils/format'
import type { Order } from '../../types'

defineProps<{ orders: Order[] }>()
</script>

<template>
  <ul v-reveal.stagger class="orders">
    <li v-for="o in orders" :key="o.id">
      <div class="orders__top"><b>{{ new Date(o.createdAt).toLocaleString('en-GB') }}</b><span>{{ money(o.total) }}</span></div>
      <small class="orders__status">{{ $t('orderStatus.' + o.status) }}</small>
      <small>{{ o.items.map((i) => i.name + ' × ' + i.qty).join(', ') }}</small>
      <small>📍 {{ o.address }}</small>
      <small v-if="o.time">🕘 {{ formatSlot(o.time) }}</small>
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
</style>
