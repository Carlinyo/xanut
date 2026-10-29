<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

// Шесть ячеек для кода: ввод по одной цифре, вставка всего кода из буфера, Backspace и стрелки.
const props = withDefaults(defineProps<{ modelValue: string; length?: number; invalid?: boolean; disabled?: boolean; label: string }>(), { length: 6 })
const emit = defineEmits<{ 'update:modelValue': [value: string]; complete: [value: string] }>()
const cells = ref<HTMLInputElement[]>([])

function set(value: string) {
  const v = value.replace(/\D/g, '').slice(0, props.length)
  emit('update:modelValue', v)
  if (v.length === props.length) emit('complete', v)
  nextTick(() => cells.value[Math.min(v.length, props.length - 1)]?.focus())
}
function onInput(i: number, e: Event) {
  const el = e.target as HTMLInputElement
  const digits = el.value.replace(/\D/g, '')
  el.value = props.modelValue[i] ?? ''
  if (!digits) return
  // при автозаполнении из SMS или вставке в одну ячейку приходит сразу несколько цифр
  set(props.modelValue.slice(0, i) + digits + props.modelValue.slice(i + digits.length))
}
function onKey(i: number, e: KeyboardEvent) {
  if (e.key === 'Backspace') {
    e.preventDefault()
    const at = props.modelValue[i] ? i : i - 1
    if (at >= 0) set(props.modelValue.slice(0, at) + props.modelValue.slice(at + 1))
  } else if (e.key === 'ArrowLeft' && i > 0) cells.value[i - 1]?.focus()
  else if (e.key === 'ArrowRight' && i < props.length - 1) cells.value[i + 1]?.focus()
}
function onPaste(e: ClipboardEvent) {
  e.preventDefault()
  set(e.clipboardData?.getData('text') ?? '')
}
onMounted(() => cells.value[0]?.focus())
</script>

<template>
  <div class="otp" :class="{ 'is-invalid': invalid }" role="group" :aria-label="label">
    <input
      v-for="i in length" :key="i" :ref="(el) => (cells[i - 1] = el as HTMLInputElement)"
      class="otp__cell" :class="{ filled: !!modelValue[i - 1] }" :value="modelValue[i - 1] ?? ''" :disabled="disabled"
      inputmode="numeric" pattern="[0-9]*" maxlength="6" :autocomplete="i === 1 ? 'one-time-code' : 'off'"
      :aria-label="`${label} ${i}`" @input="onInput(i - 1, $event)" @keydown="onKey(i - 1, $event)" @paste="onPaste" @focus="($event.target as HTMLInputElement).select()"
    />
  </div>
</template>

<style scoped>
.otp { display:grid; grid-template-columns:repeat(6, minmax(0, 1fr)); gap:clamp(6px, 2vw, 10px); }
.otp__cell { width:100%; aspect-ratio:1 / 1.15; max-height:64px; padding:0; border:1.5px solid var(--line); border-radius:var(--r-md); background:#fff; font:800 clamp(20px, 5vw, 26px) / 1 var(--font); text-align:center; color:var(--ink); transition:border-color .2s, box-shadow .2s, transform .2s var(--ease); }
.otp__cell:focus { outline:none; border-color:var(--yellow); box-shadow:0 0 0 4px rgb(246 178 26 / .22); transform:translateY(-2px); }
.otp__cell.filled { border-color:var(--yellow-lo); background:var(--cream); }
.is-invalid .otp__cell { border-color:var(--red); animation:shake .4s; }
@keyframes shake { 25% { transform:translateX(-4px); } 75% { transform:translateX(4px); } }
</style>
