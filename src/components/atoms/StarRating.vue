<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{ value?: number; count?: number }>(), { value: 5 })
// рейтинг из базы может быть дробным или вне 0–5: repeat() с отрицательным числом бросает ошибку и ломает страницу
const full = computed(() => Math.min(5, Math.max(0, Math.round(Number(props.value) || 0))))
</script>

<template>
  <p class="stars" :aria-label="`${full} / 5`">
    <span aria-hidden="true">{{ '★'.repeat(full) }}{{ '☆'.repeat(5 - full) }}</span>
    <small v-if="count">({{ count }})</small>
  </p>
</template>

<style scoped>
.stars { margin:0; color:var(--yellow); letter-spacing:1px; font-size:14px; }
small { color:var(--muted); letter-spacing:0; margin-left:4px; }
</style>
