<script setup lang="ts">
import { watch } from 'vue'
import { useCart } from '../stores/cart'
import { useUI } from '../stores/ui'
import { useCatalog } from '../stores/catalog'
import SiteHeader from '../components/organisms/SiteHeader.vue'
import SiteFooter from '../components/organisms/SiteFooter.vue'
import CartDrawer from '../components/organisms/CartDrawer.vue'
import KebabOrderModal from '../components/organisms/KebabOrderModal.vue'
import CartFab from '../components/molecules/CartFab.vue'
import LoadingState from '../components/molecules/LoadingState.vue'
import ScrollProgress from '../components/atoms/ScrollProgress.vue'
import BackToTop from '../components/molecules/BackToTop.vue'

const cart = useCart(), ui = useUI(), catalog = useCatalog()
catalog.load()
watch(() => catalog.ready, (ready) => ready && cart.prune(new Set(catalog.products.filter((p) => p.orderable).map((p) => p.id))), { immediate: true })
</script>

<template>
  <ScrollProgress />
  <SiteHeader />
  <main>
    <LoadingState v-if="!catalog.ready" :error="catalog.error" @retry="catalog.load()" />
    <RouterView v-else v-slot="{ Component }">
      <Transition name="page" mode="out-in"><component :is="Component" /></Transition>
    </RouterView>
  </main>
  <SiteFooter />
  <BackToTop />
  <CartFab v-if="cart.count && !ui.cartOpen" :count="cart.count" @click="ui.cartOpen = true" />
  <Transition name="overlay"><CartDrawer v-if="ui.cartOpen" @close="ui.cartOpen = false" /></Transition>
  <Transition name="overlay"><KebabOrderModal v-if="ui.kebabOpen && catalog.ready" @close="ui.kebabOpen = false" /></Transition>
</template>
