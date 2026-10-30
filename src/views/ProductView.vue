<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { t } from '../i18n'
import { useCatalog } from '../stores/catalog'
import Breadcrumbs from '../components/molecules/Breadcrumbs.vue'
import SectionTitle from '../components/molecules/SectionTitle.vue'
import ProductDetail from '../components/organisms/ProductDetail.vue'
import ProductGrid from '../components/organisms/ProductGrid.vue'
import AppButton from '../components/atoms/AppButton.vue'

const route = useRoute(), catalog = useCatalog()
const p = computed(() => catalog.products.find((x) => x.id === Number(route.params.id)))
const similar = computed(() => (p.value?.bonusOnly ? [] : catalog.shopProducts.filter((x) => p.value && x.categoryId === p.value.categoryId && x.id !== p.value.id).slice(0, 5)))
const crumbs = computed(() => {
  const prod = p.value
  if (!prod) return []
  const c = catalog.categories.find((x) => x.id === prod.categoryId)
  return [
    { label: t('nav.home'), to: '/' },
    ...(prod.bonusOnly ? [{ label: t('bonus.title'), to: '/bonus' }] : c ? [{ label: c.name, to: { path: '/products', query: { cat: c.id } } }] : []),
    { label: prod.name },
  ]
})
</script>

<template>
  <div class="wrap page">
    <template v-if="p">
      <Breadcrumbs :items="crumbs" />
      <ProductDetail :key="p.id" :product="p" />
      <section v-if="similar.length" class="section">
        <SectionTitle>{{ $t('sections.similar') }}</SectionTitle>
        <ProductGrid :products="similar" scroll />
      </section>
    </template>
    <template v-else>
      <p class="muted">{{ $t('product.notFound') }}</p>
      <AppButton to="/products">{{ $t('product.back') }}</AppButton>
    </template>
  </div>
</template>
