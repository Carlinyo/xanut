<script setup lang="ts">
// Табличка «HOT» на фото спецпредложения (скидка или комбо — см. utils/offer.ts). Где стоять, задаёт родитель классом.
withDefaults(defineProps<{ size?: 'md' | 'lg' }>(), { size: 'md' })
</script>

<template>
  <span class="hot" :class="`hot--${size}`" role="img" :aria-label="$t('offer.label')" :title="$t('offer.label')">
    <span class="hot__fire" aria-hidden="true">🔥</span><span aria-hidden="true">{{ $t('offer.hot') }}</span>
  </span>
</template>

<style scoped>
.hot { display:inline-flex; align-items:center; gap:3px; padding:4px 9px 4px 7px; border-radius:6px;
  background:linear-gradient(135deg, #ff8a1f 0%, #ff4b2b 55%, #d81b45 100%); color:#fff;
  font-size:11.5px; font-weight:800; line-height:1; letter-spacing:.08em; text-transform:uppercase;
  box-shadow:0 6px 14px -6px rgb(216 27 69 / .75), inset 0 1px 0 rgb(255 255 255 / .35); transform:rotate(3deg); }
.hot--lg { gap:4px; padding:6px 12px 6px 10px; border-radius:8px; font-size:14px; }
.hot__fire { display:inline-block; transform-origin:50% 90%; animation:flicker 1.6s ease-in-out infinite; }
@keyframes flicker { 0%, 100% { transform:scale(1) rotate(-5deg); } 50% { transform:scale(1.15) rotate(5deg); } }
@media (prefers-reduced-motion:reduce) { .hot__fire { animation:none; } }
</style>
