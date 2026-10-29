<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
// Тонкая полоса сверху: показывает, сколько страницы прокручено.
const p = ref(0)
let frame = 0
const update = () => {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    p.value = max > 0 ? Math.min(1, window.scrollY / max) : 0
  })
}
onMounted(() => { update(); window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update) })
onUnmounted(() => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update) })
</script>

<template><div class="progress" :style="{ transform: `scaleX(${p})` }" aria-hidden="true" /></template>

<style scoped>
.progress { position:fixed; top:0; left:0; right:0; z-index:70; height:3px; transform-origin:0 50%; background:linear-gradient(90deg, #ffd85a, var(--yellow), #ff7a1a, #e2341c); box-shadow:0 0 10px rgb(255 138 30 / .7); pointer-events:none; }
</style>
