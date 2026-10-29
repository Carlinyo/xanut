<script setup lang="ts">
const props = withDefaults(defineProps<{ modelValue?: string[]; value: string }>(), { modelValue: () => [] })
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()
function toggle() {
  const s = new Set(props.modelValue)
  if (s.has(props.value)) s.delete(props.value)
  else s.add(props.value)
  emit('update:modelValue', [...s])
}
</script>

<template>
  <label class="check">
    <input type="checkbox" :checked="modelValue.includes(value)" @change="toggle" />
    <span><slot /></span>
  </label>
</template>

<style scoped>
.check { display:flex; align-items:center; gap:10px; padding:10px 12px; border:1.5px solid var(--line); border-radius:var(--r-md); font-size:14px; cursor:pointer; transition:border-color .2s, background .2s; }
.check:has(input:checked) { border-color:var(--yellow); background:var(--cream); }
input { accent-color:var(--yellow-lo); width:18px; height:18px; flex:none; }
</style>
