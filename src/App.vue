<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainLayout from './templates/MainLayout.vue'
import BareLayout from './templates/BareLayout.vue'

// Страница с meta.bare (раздел работников) — без сайта вокруг. Пока первый переход не закончился (ждём вход),
// route ещё пуст: решаем по адресу в строке браузера, иначе на миг откроется весь сайт и начнёт грузить каталог.
const route = useRoute(), router = useRouter()
const start = router.resolve(location.pathname + location.search)
const bare = computed(() => (route.matched.length ? route.meta.bare : start.meta.bare) === true)
</script>

<template><BareLayout v-if="bare" /><MainLayout v-else /></template>
