<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'sale' | 'count' }>(), { tone: 'sale' })
</script>

<template><span class="badge" :class="`badge--${tone}`"><slot /></span></template>

<style scoped>
.badge { display:inline-block; font-weight:800; line-height:1; border-radius:var(--pill); }
.badge--sale { background:var(--red); color:#fff; font-size:12px; padding:5px 9px; }
.badge--count { background:var(--yellow); color:#000; font-size:11px; min-width:20px; padding:4px 6px; text-align:center; animation:bump .45s var(--ease); }
</style>
