<script setup lang="ts" generic="T extends string">
// Выбор одного из вариантов (кнопки-переключатели): «Мои данные / Новые данные».
defineProps<{ modelValue: T; options: { value: T; label: string; icon?: string }[]; label: string }>()
defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
  <fieldset class="ct">
    <legend>{{ label }}</legend>
    <div class="ct__opts" role="radiogroup" :aria-label="label">
      <button
        v-for="o in options" :key="o.value" type="button" role="radio" class="ct__opt" :class="{ on: modelValue === o.value }"
        :aria-checked="modelValue === o.value" @click="$emit('update:modelValue', o.value)"
      >
        <span v-if="o.icon" aria-hidden="true">{{ o.icon }}</span>{{ o.label }}
      </button>
    </div>
  </fieldset>
</template>

<style scoped>
.ct { margin:0; padding:0; border:0; min-width:0; font-size:14px; }
legend { padding:0 0 8px; font-weight:600; }
.ct__opts { display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; }
.ct__opt { display:flex; align-items:center; justify-content:center; gap:8px; padding:11px 12px; border:1.5px solid var(--line); border-radius:var(--r-md); background:#fff; font-size:14px; font-weight:600; transition:border-color .2s, background .2s; }
.ct__opt:hover { border-color:var(--yellow); }
.ct__opt.on { border-color:var(--yellow-lo); background:var(--cream); }
</style>
