<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
const show = ref(false)
const onScroll = () => (show.value = window.scrollY > 700)
onMounted(() => { onScroll(); window.addEventListener('scroll', onScroll, { passive: true }) })
onUnmounted(() => window.removeEventListener('scroll', onScroll))
const up = () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
</script>

<template>
  <Transition name="btt">
    <button v-if="show" class="btt" type="button" :aria-label="$t('common.toTop')" @click="up">↑</button>
  </Transition>
</template>

<style scoped>
.btt { position:fixed; left:16px; bottom:max(16px, env(safe-area-inset-bottom)); z-index:44; width:46px; height:46px; border:0; border-radius:50%; background:var(--dark); color:var(--yellow); font-size:20px; font-weight:800; box-shadow:0 10px 24px -8px rgb(0 0 0 / .5); transition:transform .3s var(--ease), background .3s; }
.btt:hover { transform:translateY(-4px); background:var(--dark-3); }
.btt-enter-active, .btt-leave-active { transition:opacity .35s var(--ease), transform .35s var(--ease); }
.btt-enter-from, .btt-leave-to { opacity:0; transform:translateY(20px) scale(.8); }
</style>
