<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCart } from '../stores/cart'
import { useUI } from '../stores/ui'
import { useCatalog } from '../stores/catalog'
import { useAuth } from '../stores/auth'
import { useBonus } from '../stores/bonus'
import { useFeedback } from '../stores/feedback'
import SiteHeader from '../components/organisms/SiteHeader.vue'
import SiteFooter from '../components/organisms/SiteFooter.vue'
import CartDrawer from '../components/organisms/CartDrawer.vue'
import KebabOrderModal from '../components/organisms/KebabOrderModal.vue'
import MeatOrderModal from '../components/organisms/MeatOrderModal.vue'
import CartFab from '../components/molecules/CartFab.vue'
import LoadingState from '../components/molecules/LoadingState.vue'
import ScrollProgress from '../components/atoms/ScrollProgress.vue'
import BackToTop from '../components/molecules/BackToTop.vue'
import ConfirmDialog from '../components/molecules/ConfirmDialog.vue'
import FeedbackDialog from '../components/organisms/FeedbackDialog.vue'
import LevelNoticeBar from '../components/molecules/LevelNoticeBar.vue'

const cart = useCart(), ui = useUI(), catalog = useCatalog(), auth = useAuth(), bonus = useBonus(), feedback = useFeedback(), route = useRoute()
catalog.load()
// корзина из браузера могла устареть: убрать недоступное и обновить цены, как только пришёл каталог
watch(() => catalog.ready, (ready) => { if (ready) cart.sync() }, { immediate: true })
// баллы: подгружаем после входа, сбрасываем после выхода
watch(() => auth.user?.id, (id) => (id ? bonus.load() : bonus.reset()), { immediate: true })

/** «Перейти к содержимому» для клавиатуры и экранных дикторов: фокус сразу в main, мимо меню.
 *  Без перехода по #main: адрес не меняется, и роутер не прокручивает страницу наверх. */
function skipToMain() {
  const main = document.getElementById('main')
  main?.focus({ preventScroll: true })
  main?.scrollIntoView({ block: 'start' })
}
</script>

<template>
  <a class="skip" href="#main" @click.prevent="skipToMain">{{ $t('common.skip') }}</a>
  <ScrollProgress />
  <SiteHeader />
  <LevelNoticeBar />
  <main id="main" tabindex="-1">
    <LoadingState v-if="route.meta.catalog && !catalog.ready" :error="catalog.error" @retry="catalog.load()" />
    <RouterView v-else v-slot="{ Component }">
      <Transition name="page" mode="out-in"><component :is="Component" /></Transition>
    </RouterView>
  </main>
  <SiteFooter />
  <BackToTop />
  <CartFab v-if="cart.count && !ui.cartOpen" :count="cart.count" @click="ui.cartOpen = true" />
  <Transition name="overlay"><CartDrawer v-if="ui.cartOpen" @close="ui.cartOpen = false" /></Transition>
  <Transition name="overlay"><KebabOrderModal v-if="ui.kebabOpen && catalog.ready" @close="ui.kebabOpen = false" /></Transition>
  <Transition name="overlay"><MeatOrderModal v-if="ui.meatOpen && catalog.ready" @close="ui.meatOpen = false" /></Transition>
  <Transition name="overlay"><FeedbackDialog v-if="feedback.visible" @close="feedback.close()" /></Transition>
  <ConfirmDialog />
</template>
