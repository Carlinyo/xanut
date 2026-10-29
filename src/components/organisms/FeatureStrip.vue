<script setup lang="ts">
import FeatureItem from '../molecules/FeatureItem.vue'
</script>

<template>
  <div v-reveal.stagger="'flip'" class="feats">
    <FeatureItem v-for="f in $t('features')" :key="f.title" v-bind="f" />
  </div>
</template>

<style scoped>
.feats { display:grid; grid-template-columns:repeat(4, 1fr); border-radius:var(--r-lg); background:var(--bg); }
.feats > :not(:first-child) { border-left:1px solid var(--line); }
@media (max-width:900px) { .feats { grid-template-columns:1fr 1fr; } .feats > :nth-child(odd) { border-left:0; } .feats > :nth-child(n + 3) { border-top:1px solid var(--line); } }
@media (max-width:360px) { .feats { grid-template-columns:1fr; } .feats > * { border-left:0 !important; } .feats > :not(:first-child) { border-top:1px solid var(--line); } }
</style>
