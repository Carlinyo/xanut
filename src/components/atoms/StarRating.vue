<script setup lang="ts">
withDefaults(defineProps<{ value?: number; count?: number }>(), { value: 5 })
</script>

<template>
  <p class="stars" :aria-label="`${value} / 5`">
    <span aria-hidden="true">{{ '★'.repeat(value) }}{{ '☆'.repeat(5 - value) }}</span>
    <small v-if="count">({{ count }})</small>
  </p>
</template>

<style scoped>
.stars { margin:0; color:var(--yellow); letter-spacing:1px; font-size:14px; }
small { color:var(--muted); letter-spacing:0; margin-left:4px; }
</style>
