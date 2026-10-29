<script setup lang="ts">
defineProps<{ value: number; max?: number }>()
defineEmits<{ change: [delta: number] }>()
</script>

<template>
  <div class="qty">
    <button type="button" :aria-label="$t('common.decrease')" @click="$emit('change', -1)">−</button>
    <Transition name="pop" mode="out-in"><span :key="value">{{ value }}</span></Transition>
    <button type="button" :aria-label="$t('common.increase')" :disabled="max !== undefined && value >= max" @click="$emit('change', 1)">+</button>
  </div>
</template>

<style scoped>
.qty { display:flex; align-items:center; gap:8px; font-weight:700; }
button { width:32px; height:32px; border-radius:50%; border:1.5px solid var(--line); background:#fff; line-height:1; transition:background .2s, border-color .2s, transform .2s var(--ease); }
button:hover:not(:disabled) { background:var(--yellow); border-color:var(--yellow); }
button:active:not(:disabled) { transform:scale(.88); }
button:disabled { opacity:.4; cursor:not-allowed; }
span { min-width:18px; text-align:center; }
.pop-enter-active, .pop-leave-active { transition:transform .18s var(--ease), opacity .18s; }
.pop-enter-from { transform:translateY(8px); opacity:0; }
.pop-leave-to { transform:translateY(-8px); opacity:0; }
@media (max-width:700px) { button { width:36px; height:36px; } }
</style>
