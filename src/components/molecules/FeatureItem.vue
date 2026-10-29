<script setup lang="ts">
defineProps<{ icon: string; title: string; text: string }>()
</script>

<template>
  <div class="feat">
    <span class="feat__icon" aria-hidden="true">{{ icon }}</span>
    <b>{{ title }}</b>
    <small>{{ text }}</small>
  </div>
</template>

<style scoped>
.feat { display:flex; flex-direction:column; align-items:center; gap:4px; padding:22px 14px; text-align:center; }
.feat__icon { display:grid; place-items:center; width:52px; height:52px; margin-bottom:6px; border-radius:50%; background:#fff; font-size:24px; box-shadow:var(--shadow-sm); transition:transform .5s var(--ease); }
.feat:hover .feat__icon { transform:translateY(-4px) rotate(-8deg); }
b { font-size:15px; }
small { color:var(--muted); font-size:13px; }
</style>
