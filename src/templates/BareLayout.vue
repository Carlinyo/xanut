<script setup lang="ts">
// Оболочка без сайта вокруг (meta.bare — раздел работников): ни шапки, ни подвала, ни корзины, каталог не грузится —
// только сама страница и окно «Вы уверены?». Так она открывается и работает быстрее.
import ConfirmDialog from '../components/molecules/ConfirmDialog.vue'
</script>

<template>
  <main id="main" tabindex="-1"><RouterView /></main>
  <ConfirmDialog />
</template>
