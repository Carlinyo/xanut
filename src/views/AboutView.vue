<script setup lang="ts">
import InfoCard from '../components/molecules/InfoCard.vue'
import DecorSprite from '../components/atoms/DecorSprite.vue'
</script>

<template>
  <div class="wrap page has-decor">
    <DecorSprite side="right" top="-20px" />
    <h1>{{ $t('about.title') }}</h1>
    <p v-reveal="'blur'" class="lead">{{ $t('about.lead') }}</p>
    <div v-reveal.stagger="'zoom'" class="values">
      <InfoCard v-for="v in $t('about.values')" :key="v.title" v-bind="v" />
    </div>
  </div>
</template>

<style scoped>
.lead { max-width:720px; color:#3b4745; font-size:clamp(16px, 1.6vw, 19px); }
.values { display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; margin-top:28px; }
@media (max-width:700px) { .values { grid-template-columns:1fr; } }
</style>
