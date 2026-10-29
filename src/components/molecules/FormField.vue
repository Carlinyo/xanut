<script setup lang="ts" generic="T extends string | number">
import AppInput from '../atoms/AppInput.vue'

defineOptions({ inheritAttrs: false })
defineProps<{ label?: string; modelValue?: T; error?: string; hint?: string; as?: 'input' | 'select' | 'textarea' }>()
defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
  <label class="ff">
    <span class="ff__label">{{ label }}</span>
    <AppInput v-bind="$attrs" :as="as" :model-value="modelValue" :invalid="!!error" @update:model-value="$emit('update:modelValue', $event)"><slot /></AppInput>
    <Transition name="err"><small v-if="error" class="ff__err" role="alert">{{ error }}</small></Transition>
    <small v-if="hint && !error" class="ff__hint">✓ {{ hint }}</small>
  </label>
</template>

<style scoped>
.ff { display:flex; flex-direction:column; gap:6px; font-size:14px; }
.ff__label { font-weight:600; }
.ff__err { color:var(--red); font-size:12px; }
.ff__hint { color:var(--green); font-size:12px; }
.err-enter-active, .err-leave-active { transition:opacity .25s, transform .25s var(--ease); }
.err-enter-from, .err-leave-to { opacity:0; transform:translateY(-4px); }
</style>
