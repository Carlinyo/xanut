<script setup lang="ts">
// Оценка 1–5 звёздами: клик — выбрать, наведение — подсветить. Стрелки ←/→ меняют оценку с клавиатуры.
import { ref } from 'vue'
const model = defineModel<number>({ default: 0 })
defineProps<{ label: string }>()
const hover = ref(0)
function key(e: KeyboardEvent) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { model.value = Math.min(5, model.value + 1); e.preventDefault() }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { model.value = Math.max(1, model.value - 1); e.preventDefault() }
}
</script>

<template>
  <div class="si" role="radiogroup" :aria-label="label" @mouseleave="hover = 0" @keydown="key">
    <button
      v-for="n in 5" :key="n" type="button" role="radio" class="si__star" :class="{ on: n <= (hover || model) }"
      :aria-checked="model === n" :aria-label="`${n} / 5`" :tabindex="(model || 1) === n ? 0 : -1"
      @click="model = n" @mouseenter="hover = n"
    >★</button>
  </div>
</template>

<style scoped>
.si { display:inline-flex; gap:2px; }
.si__star { width:40px; height:40px; padding:0; border:0; border-radius:50%; background:none; color:#d9dedc; font-size:30px; line-height:1; transition:color .15s, transform .2s var(--ease); }
.si__star.on { color:var(--yellow); }
.si__star:hover { transform:scale(1.15); }
.si__star:focus-visible { outline:2px solid var(--yellow-lo); outline-offset:1px; }
@media (prefers-reduced-motion:reduce) { .si__star { transition:none; } .si__star:hover { transform:none; } }
</style>
