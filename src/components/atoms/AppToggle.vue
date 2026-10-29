<script setup lang="ts">
defineProps<{ modelValue: boolean; invalid?: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="toggle" :class="{ 'is-invalid': invalid }">
    <input type="checkbox" :checked="modelValue" @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)" />
    <span><slot /></span>
  </label>
</template>

<style scoped>
.toggle { display:flex; align-items:flex-start; gap:10px; font-size:13px; line-height:1.45; cursor:pointer; }
input { flex:none; width:18px; height:18px; margin-top:1px; accent-color:var(--yellow-lo); }
.is-invalid input { outline:2px solid var(--red); outline-offset:1px; }
.toggle :slotted(a) { color:var(--yellow-lo); font-weight:700; text-decoration:underline; }
</style>
