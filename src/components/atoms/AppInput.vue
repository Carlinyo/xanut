<script setup lang="ts" generic="T extends string | number">
import { useAttrs } from 'vue'

withDefaults(defineProps<{ modelValue?: T; as?: 'input' | 'select' | 'textarea'; invalid?: boolean }>(), { as: 'input' })
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
const attrs = useAttrs()
function onInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  emit('update:modelValue', (attrs.type === 'number' ? Number(v) : v) as T)
}
</script>

<template>
  <component :is="as" class="field" :class="{ 'is-invalid': invalid }" :value="modelValue"
    :aria-invalid="invalid || undefined" @input="onInput">
    <slot />
  </component>
</template>

<style scoped>
.field { width:100%; padding:12px 14px; border:1.5px solid var(--line); border-radius:var(--r-md); background:#fff; font:inherit; color:inherit; transition:border-color .2s, box-shadow .2s; }
.field:focus { outline:none; border-color:var(--yellow); box-shadow:0 0 0 4px rgb(246 178 26 / .22); }
.is-invalid { border-color:var(--red); }
.is-invalid:focus { box-shadow:0 0 0 4px rgb(229 52 43 / .15); }
textarea.field { resize:vertical; }
@media (max-width:700px) { .field { font-size:16px; } }
</style>
