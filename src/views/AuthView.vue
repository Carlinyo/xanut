<script setup lang="ts">
import AuthForm from '../components/organisms/AuthForm.vue'
defineProps<{ mode: 'login' | 'register' }>()
</script>

<template>
  <div class="wrap page"><AuthForm :mode="mode" /></div>
</template>
