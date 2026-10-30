<script setup lang="ts">
import AppButton from '../atoms/AppButton.vue'
defineProps<{ error?: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="state" role="status">
    <template v-if="error">
      <p>{{ $t('state.error') }}</p>
      <AppButton @click="$emit('retry')">{{ $t('state.retry') }}</AppButton>
    </template>
    <template v-else>
      <span class="spin" aria-hidden="true" />
      <p class="muted">{{ $t('state.loading') }}</p>
    </template>
  </div>
</template>

<style scoped>
.state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; min-height:calc(100vh - 130px); min-height:calc(100dvh - 130px); padding:24px; text-align:center; }
.spin { width:36px; height:36px; border:4px solid var(--line); border-top-color:var(--yellow); border-radius:50%; animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
p { margin:0; }
</style>
