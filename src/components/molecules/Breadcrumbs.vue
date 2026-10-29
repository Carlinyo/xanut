<script setup lang="ts">
import type { LinkTo } from '../../types'

defineProps<{ items: { label: string; to?: LinkTo }[] }>()
</script>

<template>
  <nav class="crumbs" aria-label="breadcrumb">
    <template v-for="(i, n) in items" :key="n">
      <span v-if="n" aria-hidden="true">/</span>
      <RouterLink v-if="i.to" :to="i.to">{{ i.label }}</RouterLink>
      <span v-else class="crumbs__cur" aria-current="page">{{ i.label }}</span>
    </template>
  </nav>
</template>

<style scoped>
.crumbs { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px; color:var(--muted); font-size:13px; }
a:hover { color:var(--yellow-lo); }
.crumbs__cur { color:var(--ink); }
</style>
