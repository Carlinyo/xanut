<script setup lang="ts">
// Декоративные травы и специи у края секции (картинка — public/img/bg/decor.webp, рендер tools/render-backgrounds.mjs).
// Родительская секция должна иметь класс has-decor. На узких экранах скрыто, чтобы не мешать содержимому.
// top или bottom — отступ от верхнего или нижнего края секции (по умолчанию сверху)
withDefaults(defineProps<{ side?: 'left' | 'right'; top?: string; bottom?: string; size?: string; speed?: number }>(), {
  side: 'left', size: 'clamp(200px, 21vw, 340px)', speed: 0.12,
})
</script>

<template>
  <div class="decor" :class="`decor--${side}`" :style="{ top: bottom ? undefined : (top ?? '-60px'), bottom, width: size }" aria-hidden="true">
    <img v-parallax="speed" src="/img/bg/decor.webp" alt="" width="900" height="900" loading="lazy" decoding="async" />
  </div>
</template>

<style scoped>
.decor { position:absolute; z-index:-1; pointer-events:none; opacity:.92; }
.decor--left { left:max(-130px, calc((100vw - var(--wrap)) / -2 + 10px)); transform:rotate(-6deg); }
.decor--right { right:max(-130px, calc((100vw - var(--wrap)) / -2 + 10px)); transform:scaleX(-1) rotate(-8deg); }
img { display:block; width:100%; height:auto; }
@media (max-width:900px) { .decor { display:none; } }
</style>
