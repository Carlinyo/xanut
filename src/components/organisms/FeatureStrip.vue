<script setup lang="ts">
import { t } from '../../i18n'
import FeatureItem from '../molecules/FeatureItem.vue'

const features = t('features') as { icon: string; title: string; text: string }[]
</script>

<template>
  <!-- сколько пунктов в hy.json → features, столько колонок; на телефоне — столбиком -->
  <div v-reveal.stagger="'flip'" class="feats" :style="{ '--n': features.length }">
    <FeatureItem v-for="f in features" :key="f.title" v-bind="f" />
  </div>
</template>

<style scoped>
.feats { display:grid; grid-template-columns:repeat(var(--n), 1fr); border-radius:var(--r-lg); background:var(--bg); }
.feats > :not(:first-child) { border-left:1px solid var(--line); }
@media (max-width:560px) { .feats { grid-template-columns:1fr; } .feats > * { border-left:0 !important; } .feats > :not(:first-child) { border-top:1px solid var(--line); } }
</style>
