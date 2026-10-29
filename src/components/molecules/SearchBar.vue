<script setup lang="ts">
defineProps<{ modelValue?: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="search">
    <span aria-hidden="true">🔍</span>
    <input type="search" :value="modelValue" :placeholder="$t('search.placeholder')" :aria-label="$t('search.placeholder')"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
  </div>
</template>

<style scoped>
.search { display:flex; align-items:center; gap:10px; padding:0 18px; border:1.5px solid transparent; border-radius:var(--pill); background:var(--dark-2); color:#9fb0ad; transition:border-color .25s, background .25s, box-shadow .25s; }
.search:focus-within { border-color:var(--yellow); background:var(--dark-3); box-shadow:0 0 0 4px rgb(246 178 26 / .18); }
input { flex:1; min-width:0; padding:12px 0; border:0; background:none; color:#fff; font:inherit; appearance:none; }
input:focus { outline:none; }
input::placeholder { color:#9fb0ad; }
@media (max-width:700px) { input { font-size:16px; } }
</style>
