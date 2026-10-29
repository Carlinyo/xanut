<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
withDefaults(defineProps<{ side?: 'right' | 'center'; label?: string }>(), { side: 'center' })
const emit = defineEmits<{ close: [] }>()
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close') }
onMounted(() => { document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden' })
onUnmounted(() => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' })
</script>

<template>
  <div class="overlay" :class="`overlay--${side}`" @click.self="emit('close')">
    <div class="sheet" role="dialog" aria-modal="true" :aria-label="label"><slot /></div>
  </div>
</template>

<style scoped>
.overlay { position:fixed; inset:0; z-index:60; display:flex; background:rgb(11 20 19 / .62); backdrop-filter:blur(4px); }
.overlay--right { justify-content:flex-end; }
.overlay--center { align-items:center; justify-content:center; }
.sheet { background:#fff; overflow:auto; overscroll-behavior:contain; }
.overlay--right .sheet { width:min(440px, 100vw); height:100%; }
.overlay--center .sheet { width:min(480px, 92vw); max-height:92vh; border-radius:var(--r-lg); }
.overlay-enter-active, .overlay-leave-active { transition:opacity .3s var(--ease); }
.overlay-enter-active .sheet, .overlay-leave-active .sheet { transition:transform .45s var(--ease); }
.overlay-enter-from, .overlay-leave-to { opacity:0; }
.overlay-enter-from.overlay--right .sheet, .overlay-leave-to.overlay--right .sheet { transform:translateX(100%); }
.overlay-enter-from.overlay--center .sheet, .overlay-leave-to.overlay--center .sheet { transform:translateY(28px) scale(.97); }
@media (max-width:700px) {
  .overlay--center { align-items:flex-end; }
  .overlay--center .sheet { width:100%; max-height:94vh; border-radius:var(--r-lg) var(--r-lg) 0 0; }
  .overlay-enter-from.overlay--center .sheet, .overlay-leave-to.overlay--center .sheet { transform:translateY(100%); }
}
</style>
