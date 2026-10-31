<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { t } from '../i18n'
import { useCatalog } from '../stores/catalog'
import { useUI } from '../stores/ui'
import { isKindFilter, KIND_FILTERS, KIND_ICON, kindOf, kindRank } from '../utils/kinds'
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
const category = computed(() => categories.value.find((c) => c.id === cat.value) ?? null)
const title = computed(() =>
  props.offersOnly ? t('sections.offers')
    : cat.value === null ? t('catalog.title')
    : category.value?.name ?? t('catalog.title'))

// товары раздела с учётом поиска — до выбора вида мяса
const found = computed(() => {
  const q = ui.query.trim().toLowerCase() // «стейк » с пробелом в конце тоже должен находиться
  return catalog.shopProducts.filter((p) => (cat.value === null || p.categoryId === cat.value) && (!props.offersOnly || p.discount) && p.name.toLowerCase().includes(q))
})
// хоровац: кнопки «Խոզ / Տավար / Հավ…» (вид — в адресе: ?cat=6&kind=pork) и показ по видам
const isKebab = computed(() => !props.offersOnly && category.value?.kebab === true)
const kinds = computed(() => (isKebab.value
  ? KIND_FILTERS.map((k) => ({ k, n: found.value.filter((p) => kindOf(p) === k).length })).filter((x) => x.n)
  : []))
const kind = computed(() => (isKebab.value && isKindFilter(route.query.kind) ? route.query.kind : null))
const list = computed(() => {
  const l = kind.value ? found.value.filter((p) => kindOf(p) === kind.value) : [...found.value]
  if (sort.value === 'asc') return l.sort((a, b) => a.price - b.price)
  if (sort.value === 'desc') return l.sort((a, b) => b.price - a.price)
  if (sort.value === 'disc') return l.sort((a, b) => b.discount - a.discount)
  // то, чего нет в наличии, — в конце; хоровац — по видам: свинина, говядина, баранина, курица, индейка, рыба…
  const out = (p: (typeof l)[number]) => Number(p.inStock === false)
  return l.sort((a, b) => out(a) - out(b) || (isKebab.value ? kindRank(a) - kindRank(b) : 0))
})
// ключ заставляет сетку анимированно «перестроиться» при смене фильтра
const gridKey = computed(() => [base.value, cat.value, kind.value, sort.value, ui.query.trim(), list.value.length].join('|'))
const kindLink = (k: string | null) => ({ path: base.value, query: { ...(cat.value !== null ? { cat: cat.value } : {}), ...(k ? { kind: k } : {}) } })
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
      <nav v-if="kinds.length > 1" class="kinds" :aria-label="$t('catalog.kindsLabel')">
        <RouterLink :to="kindLink(null)" class="kinds__chip" :class="{ on: !kind }" :aria-current="!kind ? 'true' : undefined">
          {{ $t('catalog.kinds.all') }} <span class="kinds__n">{{ found.length }}</span>
        </RouterLink>
        <RouterLink
          v-for="x in kinds" :key="x.k" :to="kindLink(x.k)" class="kinds__chip" :class="{ on: kind === x.k }"
          :aria-current="kind === x.k ? 'true' : undefined"
        >
          <span aria-hidden="true">{{ KIND_ICON[x.k] }}</span> {{ $t('catalog.kinds.' + x.k) }} <span class="kinds__n">{{ x.n }}</span>
        </RouterLink>
      </nav>
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
.kinds { display:flex; flex-wrap:wrap; gap:8px; margin:-4px 0 16px; }
.kinds__chip { display:inline-flex; align-items:center; gap:6px; padding:7px 13px; border:1.5px solid var(--line); border-radius:var(--pill); background:#fff; font-size:14px; font-weight:600; white-space:nowrap; transition:border-color .2s, background .2s; }
.kinds__chip:hover { border-color:var(--yellow); }
.kinds__chip.on { border-color:var(--yellow); background:var(--yellow); color:#1b1500; }
.kinds__n { min-width:20px; padding:0 6px; border-radius:var(--pill); background:var(--bg); color:var(--muted); font-size:12px; font-weight:700; text-align:center; }
.kinds__chip.on .kinds__n { background:rgb(255 255 255 / .6); color:#1b1500; }
@media (max-width:1100px) { .catalog { grid-template-columns:200px 1fr; } }
@media (max-width:900px) { .catalog { grid-template-columns:1fr; } }
@media (max-width:700px) {
  .kinds { flex-wrap:nowrap; overflow-x:auto; margin-inline:calc(var(--gutter) * -1); padding:2px var(--gutter) 6px; scrollbar-width:none; }
  .kinds::-webkit-scrollbar { display:none; }
}
@media (max-width:480px) { .catalog__head { flex-wrap:wrap; } .catalog__sort { width:100%; } }
</style>
