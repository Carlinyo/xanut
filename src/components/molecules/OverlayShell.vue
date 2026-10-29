<script lang="ts">
// блокировка прокрутки страницы — со счётчиком: закрытие одного окна не должно снимать её, пока открыто другое
let scrollLocks = 0
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
</script>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
withDefaults(defineProps<{ side?: 'right' | 'center'; label?: string }>(), { side: 'center' })
const emit = defineEmits<{ close: [] }>()
const sheet = ref<HTMLElement | null>(null)
let returnFocus: HTMLElement | null = null

// Escape закрывает окно; Tab ходит по кругу внутри окна, а не по странице под затемнением
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') { emit('close'); return }
  const box = sheet.value
  if (e.key !== 'Tab' || !box) return
  const list = Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
  if (!list.length) { e.preventDefault(); return }
  const first = list[0], last = list[list.length - 1], active = document.activeElement
  if (e.shiftKey && (active === first || !box.contains(active))) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && (active === last || !box.contains(active))) { e.preventDefault(); first.focus() }
}

onMounted(() => {
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.addEventListener('keydown', onKey)
  if (scrollLocks++ === 0) document.body.style.overflow = 'hidden'
  sheet.value?.focus({ preventScroll: true }) // экранный диктор сразу читает заголовок окна
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  if (--scrollLocks === 0) document.body.style.overflow = ''
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }) // фокус — обратно на кнопку, открывшую окно
})
</script>

<template>
  <div class="overlay" :class="`overlay--${side}`" @click.self="emit('close')">
    <div ref="sheet" class="sheet" role="dialog" aria-modal="true" :aria-label="label" tabindex="-1"><slot /></div>
  </div>
</template>

<style scoped>
.overlay { position:fixed; inset:0; z-index:60; display:flex; background:rgb(11 20 19 / .62); backdrop-filter:blur(4px); }
.overlay--right { justify-content:flex-end; }
.overlay--center { align-items:center; justify-content:center; }
.sheet { background:#fff; overflow:auto; overscroll-behavior:contain; }
.sheet:focus { outline:none; }
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
