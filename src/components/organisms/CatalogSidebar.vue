<script setup lang="ts">
import type { Category } from '../../types'

withDefaults(defineProps<{ categories: Category[]; active?: number | null; base?: string }>(), { active: null, base: '/products' })
</script>

<template>
  <aside class="side">
    <RouterLink :to="{ path: base }" :class="{ on: active === null }">{{ $t('common.all') }}</RouterLink>
    <RouterLink v-for="c in categories" :key="c.id" :to="{ path: base, query: { cat: c.id } }" :class="{ on: active === c.id }">{{ c.name }}<span v-if="c.orderable" class="side__hot" :title="$t('showcase.orderable')"> 🔥</span></RouterLink>
  </aside>
</template>

<style scoped>
.side { position:sticky; top:130px; display:flex; flex-direction:column; gap:2px; padding:8px; border-radius:var(--r-lg); background:var(--bg); }
a { padding:10px 14px; border-radius:var(--r-md); font-size:14px; transition:background .25s, transform .3s var(--ease), font-weight .2s; }
a:hover { background:#fff; transform:translateX(4px); }
a.on { background:var(--yellow); font-weight:700; }
@media (max-width:900px) {
  .side { position:static; flex-direction:row; gap:6px; overflow-x:auto; scrollbar-width:none; }
  a { flex:none; white-space:nowrap; background:#fff; }
  a:hover { transform:none; }
}
</style>
