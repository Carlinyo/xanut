<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { t } from '../i18n'
import { useCatalog } from '../stores/catalog'
import { useUI } from '../stores/ui'
import CatalogSidebar from '../components/organisms/CatalogSidebar.vue'
import ProductGrid from '../components/organisms/ProductGrid.vue'
import AppInput from '../components/atoms/AppInput.vue'

type SortKey = 'default' | 'asc' | 'desc' | 'disc'
const props = defineProps<{ offersOnly?: boolean }>()
const route = useRoute(), ui = useUI(), catalog = useCatalog()
const categories = computed(() => catalog.categories)
const sort = ref<SortKey>('default')
const base = computed(() => (props.offersOnly ? '/offers' : '/products'))
const cat = computed(() => (route.query.cat === undefined ? null : Number(route.query.cat))) // id категории
const title = computed(() =>
  props.offersOnly ? t('sections.offers')
    : cat.value === null ? t('catalog.title')
    : categories.value.find((c) => c.id === cat.value)?.name ?? t('catalog.title'))
const list = computed(() => {
  const q = ui.query.toLowerCase()
  const l = catalog.products.filter((p) => (cat.value === null || p.categoryId === cat.value) && (!props.offersOnly || p.discount) && p.name.toLowerCase().includes(q))
  if (sort.value === 'asc') return l.sort((a, b) => a.price - b.price)
  if (sort.value === 'desc') return l.sort((a, b) => b.price - a.price)
  if (sort.value === 'disc') return l.sort((a, b) => b.discount - a.discount)
  return l
})
// ключ заставляет сетку анимированно «перестроиться» при смене фильтра
const gridKey = computed(() => [base.value, cat.value, sort.value, ui.query, list.value.length].join('|'))
</script>

<template>
  <div class="wrap page catalog">
    <CatalogSidebar :categories="categories" :active="cat" :base="base" />
    <div class="catalog__main">
      <div class="catalog__head">
        <h1>{{ title }} <small>({{ list.length }})</small></h1>
        <AppInput v-model="sort" as="select" class="catalog__sort" :aria-label="$t('catalog.sortLabel')">
          <option v-for="k in ['default', 'asc', 'desc', 'disc']" :key="k" :value="k">{{ $t('catalog.sort.' + k) }}</option>
        </AppInput>
      </div>
      <ProductGrid v-if="list.length" :key="gridKey" :products="list" four />
      <p v-else class="muted">{{ $t('catalog.empty') }}</p>
    </div>
  </div>
</template>

<style scoped>
.catalog { display:grid; grid-template-columns:240px 1fr; gap:clamp(16px, 2.5vw, 32px); align-items:start; }
.catalog > * { min-width:0; }
.catalog__head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px; }
.catalog__head h1 { margin:0; }
small { color:var(--muted); font-size:.6em; font-weight:400; }
.catalog__sort { width:auto; }
@media (max-width:1100px) { .catalog { grid-template-columns:200px 1fr; } }
@media (max-width:900px) { .catalog { grid-template-columns:1fr; } }
@media (max-width:480px) { .catalog__head { flex-wrap:wrap; } .catalog__sort { width:100%; } }
</style>
