<script setup lang="ts">
// Каталог: все товары по разделам. «Առկա է» — есть в наличии (нет — товар виден на сайте, но заказать его нельзя),
// «Կայքում» — товар виден на сайте. Новый товар и правка — в форме над списком.
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { t } from '../../i18n'
import { ApiError, commonErrorKey } from '../../api'
import { useAdmin } from '../../stores/admin'
import { useCatalog } from '../../stores/catalog'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import { money } from '../../utils/format'
import type { AdminProduct } from '../../types'
import ProductForm from '../molecules/ProductForm.vue'
import ProductArt from '../atoms/ProductArt.vue'
import AppToggle from '../atoms/AppToggle.vue'
import AppButton from '../atoms/AppButton.vue'
import AppInput from '../atoms/AppInput.vue'

type Filter = 'all' | 'out' | 'hidden' | number
const admin = useAdmin(), catalog = useCatalog(), authError = useAuthRedirect()
const loading = ref(false)
const error = ref('')
const query = ref('')
const filter = ref<Filter>('all')
/** null — форма закрыта, 'new' — новый товар, иначе — изменяемый товар. */
const editing = ref<AdminProduct | 'new' | null>(null)
const formBox = ref<HTMLElement | null>(null)
const busy = ref(new Set<number>())
/** Сбой переключателя: перерисовать его, чтобы галочка вернулась в прежнее положение. */
const redraw = ref(0)

async function load() {
  loading.value = true
  error.value = ''
  try { await Promise.all([admin.loadProducts(), catalog.load()]) } catch (e) { if (!authError(e)) error.value = t(commonErrorKey(e)) } finally { loading.value = false }
}
onMounted(load)

// итог действия — сообщением над списком
const notice = ref<{ tone: 'ok' | 'bad'; text: string } | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | undefined
function say(tone: 'ok' | 'bad', text: string) {
  notice.value = { tone, text }
  clearTimeout(noticeTimer)
  if (tone === 'ok') noticeTimer = setTimeout(() => (notice.value = null), 5000)
}
onUnmounted(() => clearTimeout(noticeTimer))

// товары только за баллы живут в разделе «Բոնուսային ապրանքներ»
const items = computed(() => admin.products.filter((p) => !p.bonusOnly))
const counts = computed(() => ({ all: items.value.length, out: items.value.filter((p) => !p.inStock).length, hidden: items.value.filter((p) => !p.active).length }))
const inCategory = (id: number) => items.value.filter((p) => p.categoryId === id).length
const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  const f = filter.value
  return items.value.filter((p) => (f === 'all' || (f === 'out' ? !p.inStock : f === 'hidden' ? !p.active : p.categoryId === f))
    && (!q || p.name.toLowerCase().includes(q)))
})
// по разделам в порядке сайта; товар без существующего раздела — в конце
const groups = computed(() => {
  const known = new Set(catalog.categories.map((c) => c.id))
  const named = catalog.categories.map((c) => ({ id: c.id, name: c.name, orderable: c.orderable, items: shown.value.filter((p) => p.categoryId === c.id) }))
  const rest = shown.value.filter((p) => !known.has(p.categoryId))
  return [...named, ...(rest.length ? [{ id: 0, name: '—', orderable: false, items: rest }] : [])].filter((g) => g.items.length)
})
const filterValue = computed({
  get: () => String(filter.value),
  set: (v: string) => { filter.value = /^\d+$/.test(v) ? Number(v) : (v as Filter) },
})

async function open(p: AdminProduct | 'new') {
  editing.value = p
  await nextTick()
  formBox.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
const refreshSite = () => { void catalog.load(true) } // сайт в этой же вкладке сразу показывает изменения
function saved(p: AdminProduct, created: boolean) {
  editing.value = null
  say('ok', t(created ? 'admin.catalog.created' : 'admin.catalog.saved', { name: p.name }))
  refreshSite()
}
function removed(p: AdminProduct) {
  editing.value = null
  say('ok', t('admin.catalog.removed', { name: p.name }))
  refreshSite()
}
async function toggle(p: AdminProduct, field: 'inStock' | 'active', value: boolean) {
  if (busy.value.has(p.id)) { redraw.value++; return }
  busy.value.add(p.id)
  try {
    const r = await admin.updateProduct(p.id, { [field]: value })
    const key = field === 'inStock' ? (value ? 'stockOn' : 'stockOff') : value ? 'shown' : 'hiddenNow'
    say('ok', t(`admin.catalog.${key}`, { name: r.name }))
    refreshSite()
  } catch (e) {
    redraw.value++
    if (authError(e)) return
    say('bad', e instanceof ApiError && e.code === 'PRICE_REQUIRED' ? t('admin.catalog.errors.priceRequired', { name: p.name }) : `${p.name}: ${t(commonErrorKey(e))}`)
  } finally {
    busy.value.delete(p.id)
  }
}
</script>

<template>
  <section class="cg">
    <p class="cg__lead">{{ $t('admin.catalog.lead') }}</p>
    <div class="cg__bar">
      <AppInput v-model="query" class="cg__search" type="search" :placeholder="$t('admin.catalog.search')" :aria-label="$t('admin.catalog.search')" />
      <AppInput v-model="filterValue" as="select" class="cg__filter" :aria-label="$t('admin.catalog.filterLabel')">
        <option value="all">{{ $t('admin.catalog.filter.all') }} ({{ counts.all }})</option>
        <option value="out">{{ $t('admin.catalog.filter.out') }} ({{ counts.out }})</option>
        <option value="hidden">{{ $t('admin.catalog.filter.hidden') }} ({{ counts.hidden }})</option>
        <optgroup :label="$t('admin.catalog.sections')">
          <option v-for="c in catalog.categories" :key="c.id" :value="String(c.id)">{{ c.name }} ({{ inCategory(c.id) }})</option>
        </optgroup>
      </AppInput>
      <div class="cg__tools">
        <AppButton v-if="editing === null" size="sm" @click="open('new')">+ {{ $t('admin.catalog.add') }}</AppButton>
        <AppButton size="sm" variant="light" :disabled="loading" @click="load">🔄 {{ $t('admin.refresh') }}</AppButton>
      </div>
    </div>

    <div v-if="editing !== null" ref="formBox" class="cg__form">
      <ProductForm
        :key="editing === 'new' ? 'new' : editing.id" :product="editing === 'new' ? null : editing"
        :category-id="typeof filter === 'number' ? filter : undefined"
        @done="saved" @removed="removed" @cancel="editing = null"
      />
    </div>

    <Transition name="nt">
      <div v-if="notice" class="cg__notice" :class="`is-${notice.tone}`" role="status">
        <span>{{ notice.tone === 'ok' ? '✓' : '⚠' }} {{ notice.text }}</span>
        <button type="button" class="cg__x" :aria-label="$t('common.close')" @click="notice = null">×</button>
      </div>
    </Transition>
    <p v-if="error" class="cg__error" role="alert">{{ error }}</p>
    <p v-if="loading && !admin.productsLoaded" class="muted">{{ $t('state.loading') }}</p>
    <p v-else-if="admin.productsLoaded && !groups.length" class="cg__empty">{{ $t('admin.catalog.empty') }}</p>

    <section v-for="g in groups" :key="g.id" class="cg__group">
      <h3 class="cg__gtitle">
        {{ g.name }} <small class="cg__gnum">{{ g.items.length }}</small>
        <span class="cg__gtag" :class="{ 'is-hot': g.orderable }">{{ g.orderable ? $t('admin.catalog.orderable') : $t('admin.catalog.showcase') }}</span>
      </h3>
      <ul class="cg__list">
        <li
          v-for="p in g.items" :key="p.id" class="row"
          :class="{ 'is-hidden': !p.active, 'is-out': !p.inStock, 'is-editing': editing !== null && editing !== 'new' && editing.id === p.id }"
        >
          <span class="row__art"><ProductArt :kind="p.art" :src="p.image || undefined" :alt="p.name" /></span>
          <div class="row__body">
            <b class="row__name">{{ p.name }}</b>
            <span class="row__price">
              <s v-if="p.oldPrice">{{ money(p.oldPrice) }}</s>
              {{ p.price ? money(p.price) : $t('admin.catalog.noPrice') }}<small v-if="p.unit === 'kg'"> / {{ $t('units.kg') }}</small><small v-else> / {{ $t('units.pc') }}</small>
            </span>
            <span class="row__tags">
              <span v-if="!p.active" class="tag is-hidden">{{ $t('admin.catalog.tagHidden') }}</span>
              <span v-if="!p.inStock" class="tag is-out">{{ $t('stock.out') }}</span>
              <span v-if="p.reviews" class="tag is-rating">★ {{ p.rating.toFixed(1) }} ({{ p.reviews }})</span>
              <span v-if="p.bonusPoints" class="tag is-bonus">🎁 {{ p.bonusPoints.toLocaleString('en-US') }}</span>
            </span>
          </div>
          <div class="row__toggles" :aria-busy="busy.has(p.id) || undefined">
            <AppToggle :key="`s${p.id}-${p.inStock}-${redraw}`" :model-value="p.inStock" @update:model-value="toggle(p, 'inStock', $event)">{{ $t('admin.catalog.inStock') }}</AppToggle>
            <AppToggle :key="`a${p.id}-${p.active}-${redraw}`" :model-value="p.active" @update:model-value="toggle(p, 'active', $event)">{{ $t('admin.catalog.visible') }}</AppToggle>
          </div>
          <AppButton size="sm" variant="light" class="row__edit" @click="open(p)">✏️ {{ $t('admin.catalog.edit') }}</AppButton>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.cg__lead { max-width:76ch; margin:0 0 14px; color:var(--muted); font-size:14px; line-height:1.55; }
.cg__bar { display:flex; flex-wrap:wrap; align-items:center; gap:10px 12px; margin-bottom:16px; }
.cg__search { flex:1 1 220px; max-width:340px; padding:9px 14px; }
.cg__filter { flex:0 1 260px; width:auto; padding:9px 12px; }
.cg__tools { display:flex; gap:8px; margin-left:auto; }
.cg__form { margin-bottom:20px; scroll-margin-top:140px; }
.cg__notice { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px; padding:12px 14px 12px 16px; border-radius:var(--r-md); font-size:14px; font-weight:600; line-height:1.45; }
.cg__notice.is-ok { background:#e6f4ea; color:var(--green); }
.cg__notice.is-bad { background:#fdecea; color:var(--red); }
.cg__x { flex:none; width:28px; height:28px; margin:-4px -6px 0 0; border:0; border-radius:50%; background:none; color:inherit; font-size:20px; line-height:1; }
.cg__x:hover { background:rgb(0 0 0 / .06); }
.nt-enter-active, .nt-leave-active { transition:opacity .3s, transform .3s var(--ease); }
.nt-enter-from, .nt-leave-to { opacity:0; transform:translateY(-6px); }
.cg__error { padding:10px 14px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:14px; }
.cg__empty { padding:28px 18px; border:1.5px dashed var(--line); border-radius:var(--r-lg); color:var(--muted); text-align:center; }
.cg__group + .cg__group { margin-top:22px; }
.cg__gtitle { display:flex; flex-wrap:wrap; align-items:center; gap:6px 10px; margin:0 0 10px; font-size:17px; }
.cg__gnum { min-width:24px; padding:1px 8px; border-radius:var(--pill); background:var(--bg); color:var(--muted); font-size:12px; text-align:center; }
.cg__gtag { padding:2px 10px; border-radius:var(--pill); background:var(--bg); color:var(--muted); font-size:12px; font-weight:600; }
.cg__gtag.is-hot { background:var(--cream); color:#8a5f00; }
.cg__list { display:flex; flex-direction:column; gap:8px; margin:0; padding:0; list-style:none; }
.row { display:grid; grid-template-columns:56px minmax(0, 1fr) auto auto; align-items:center; gap:10px 14px; padding:10px 14px; border:1px solid var(--line); border-radius:var(--r-md); background:#fff; transition:border-color .2s; }
.row.is-editing { border-color:var(--yellow); }
.row.is-hidden { background:#f6f7f6; }
.row.is-hidden .row__art, .row.is-out .row__art { filter:grayscale(.7); opacity:.7; }
.row__art { display:block; width:56px; height:56px; padding:6px; border-radius:var(--r-md); background:radial-gradient(circle at 50% 40%, #fff, var(--cream)); }
.row__body { display:flex; flex-direction:column; gap:2px; min-width:0; }
.row__name { font-size:15px; line-height:1.35; overflow-wrap:anywhere; }
.row__price { font-weight:800; }
.row__price s { margin-right:6px; color:#98a3a0; font-size:12px; font-weight:400; }
.row__price small { color:var(--muted); font-weight:600; }
.row__tags { display:flex; flex-wrap:wrap; gap:4px 6px; }
.tag { padding:1px 8px; border-radius:var(--pill); font-size:11.5px; font-weight:700; }
.tag.is-hidden { background:#eceeed; color:var(--muted); }
.tag.is-out { background:var(--dark); color:#fff; }
.tag.is-rating { background:var(--cream); color:#8a5f00; }
.tag.is-bonus { background:var(--cream); color:#7a5600; }
.row__toggles { display:flex; flex-direction:column; gap:6px; min-width:110px; }
.row__toggles[aria-busy] { opacity:.6; pointer-events:none; }
@media (max-width:760px) {
  .row { grid-template-columns:48px minmax(0, 1fr); }
  .row__art { width:48px; height:48px; }
  .row__toggles { grid-column:1 / -1; flex-direction:row; flex-wrap:wrap; gap:8px 18px; }
  .row__edit { grid-column:1 / -1; }
  .cg__search { max-width:none; }
  .cg__filter { flex:1 1 200px; }
  .cg__tools { width:100%; margin-left:0; }
  .cg__tools > * { flex:1; }
}
</style>
