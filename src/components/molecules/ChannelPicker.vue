<script setup lang="ts">
import type { Channel } from '../../types'
defineProps<{ modelValue: Channel; channels: Channel[]; label: string }>()
defineEmits<{ 'update:modelValue': [value: Channel] }>()
const icon: Record<Channel, string> = { email: '✉️', phone: '📱' }
</script>

<template>
  <fieldset class="cp">
    <legend>{{ label }}</legend>
    <div class="cp__opts" role="radiogroup" :aria-label="label">
      <button
        v-for="c in channels" :key="c" type="button" role="radio" class="cp__opt" :class="{ on: modelValue === c }"
        :aria-checked="modelValue === c" @click="$emit('update:modelValue', c)"
      >
        <span aria-hidden="true">{{ icon[c] }}</span>{{ $t('otp.via.' + c) }}
      </button>
    </div>
  </fieldset>
</template>

<style scoped>
.cp { margin:0; padding:0; border:0; min-width:0; font-size:14px; }
legend { padding:0 0 8px; font-weight:600; }
.cp__opts { display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; }
.cp__opt { display:flex; align-items:center; justify-content:center; gap:8px; padding:12px; border:1.5px solid var(--line); border-radius:var(--r-md); background:#fff; font-size:14px; font-weight:600; transition:border-color .2s, background .2s; }
.cp__opt:hover { border-color:var(--yellow); }
.cp__opt.on { border-color:var(--yellow-lo); background:var(--cream); }
</style>
