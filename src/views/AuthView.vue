<script setup lang="ts">
import AuthForm from '../components/organisms/AuthForm.vue'
import ResetForm from '../components/organisms/ResetForm.vue'
defineProps<{ mode: 'login' | 'register' | 'reset' }>()
</script>

<template>
  <div class="wrap page">
    <ResetForm v-if="mode === 'reset'" />
    <AuthForm v-else :mode="mode" />
  </div>
</template>
