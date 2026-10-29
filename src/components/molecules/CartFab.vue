<script setup lang="ts">
defineProps<{ count: number }>()
</script>

<template>
  <button class="fab" type="button" data-cart-target :aria-label="$t('common.cart')">🛒 <span :key="count">{{ count }}</span></button>
</template>

<style scoped>
.fab { position:fixed; right:14px; bottom:max(14px, env(safe-area-inset-bottom)); z-index:45; display:none; align-items:center; gap:6px; padding:13px 20px; border:0; border-radius:var(--pill); background:var(--yellow); color:#1b1500; font-weight:800; box-shadow:0 10px 24px -6px rgb(0 0 0 / .45); animation:rise .5s var(--ease); }
.fab span { animation:bump .45s var(--ease); }
@media (max-width:700px) { .fab { display:flex; } }
</style>
