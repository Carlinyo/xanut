<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <section class="panel-box">
    <h3 v-if="title">{{ title }}</h3>
    <slot />
  </section>
</template>

<style scoped>
.panel-box { display:flex; flex-direction:column; align-items:flex-start; gap:12px; padding:clamp(18px, 3vw, 28px); border-radius:var(--r-lg); background:var(--bg); }
h3 { margin:0; font-size:20px; }
.panel-box :slotted(p) { margin:0; }
.panel-box :slotted(a) { color:var(--yellow-lo); font-weight:700; }
</style>
