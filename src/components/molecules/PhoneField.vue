<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatNational, nationalDigits } from '../../utils/phone'

// Поле телефона: код страны +374 стоит отдельно, номер форматируется по мере ввода «91 123 456».
// Вставка и автозаполнение в любом виде (+374 91…, 091…, 374…) приводятся к 8 цифрам.
// v-model получает +37491123456 (или неполный номер, чтобы проверка могла сказать, чего не хватает).
const props = defineProps<{ modelValue: string; label: string; error?: string; valid?: boolean; hint?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; blur: [] }>()

const digits = ref(nationalDigits(props.modelValue))
watch(() => props.modelValue, (v) => { const d = nationalDigits(v); if (d !== digits.value) digits.value = d })
const display = computed(() => formatNational(digits.value))

function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  const atEnd = el.selectionStart === el.value.length
  const d = nationalDigits(el.value)
  digits.value = d
  emit('update:modelValue', d ? '+374' + d : '')
  el.value = formatNational(d)
  if (atEnd) el.setSelectionRange(el.value.length, el.value.length)
}
</script>

<template>
  <label class="pf">
    <span class="pf__label">{{ label }}</span>
    <span class="pf__box" :class="{ 'is-invalid': !!error, 'is-valid': valid && !error }">
      <span class="pf__cc" aria-hidden="true">+374</span>
      <input
        type="tel" inputmode="tel" autocomplete="tel" placeholder="91 123 456" maxlength="16"
        :value="display" :aria-invalid="!!error || undefined" :aria-label="`${label} (+374)`"
        @input="onInput" @blur="emit('blur')"
      />
      <Transition name="ok"><span v-if="valid && !error" class="pf__ok" aria-hidden="true">✓</span></Transition>
    </span>
    <Transition name="err"><small v-if="error" class="pf__err" role="alert">{{ error }}</small></Transition>
    <small v-if="hint && !error" class="pf__hint">{{ hint }}</small>
  </label>
</template>

<style scoped>
.pf { display:flex; flex-direction:column; gap:6px; font-size:14px; }
.pf__label { font-weight:600; }
.pf__box { display:flex; align-items:center; border:1.5px solid var(--line); border-radius:var(--r-md); background:#fff; overflow:hidden; transition:border-color .2s, box-shadow .2s; }
.pf__box:focus-within { border-color:var(--yellow); box-shadow:0 0 0 4px rgb(246 178 26 / .22); }
.pf__box.is-invalid { border-color:var(--red); }
.pf__box.is-invalid:focus-within { box-shadow:0 0 0 4px rgb(229 52 43 / .15); }
.pf__box.is-valid { border-color:#7cc49a; }
.pf__cc { align-self:stretch; display:flex; align-items:center; padding:0 12px; border-right:1.5px solid var(--line); background:var(--bg); color:var(--ink); font-weight:700; letter-spacing:.02em; }
input { flex:1; min-width:0; padding:12px 14px; border:0; background:none; font:inherit; color:inherit; letter-spacing:.04em; }
input:focus { outline:none; }
.pf__ok { margin-right:12px; color:var(--green); font-weight:800; }
.pf__err { color:var(--red); font-size:12px; }
.pf__hint { color:var(--muted); font-size:12px; }
.err-enter-active, .err-leave-active, .ok-enter-active, .ok-leave-active { transition:opacity .25s, transform .25s var(--ease); }
.err-enter-from, .err-leave-to { opacity:0; transform:translateY(-4px); }
.ok-enter-from, .ok-leave-to { opacity:0; transform:scale(.5); }
@media (max-width:700px) { input { font-size:16px; } }
</style>
