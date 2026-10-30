<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { t } from '../../i18n'
import { commonErrorKey } from '../../api'
import { useAdmin } from '../../stores/admin'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import { useConfirm } from '../../stores/confirm'
import { useCatalog } from '../../stores/catalog'
import { money } from '../../utils/format'
import type { AdminProduct } from '../../types'
import RewardForm from '../molecules/RewardForm.vue'
import ProductArt from '../atoms/ProductArt.vue'
import AppButton from '../atoms/AppButton.vue'

const admin = useAdmin(), catalog = useCatalog(), authError = useAuthRedirect(), confirm = useConfirm()
const loading = ref(false)
const error = ref('')
/** null — форма закрыта, 'new' — новый товар, иначе — изменяемый товар. */
const editing = ref<AdminProduct | 'new' | null>(null)
const busyId = ref<number | null>(null)
const formBox = ref<HTMLElement | null>(null)

const percent = computed(() => catalog.config.bonus?.percent ?? 2)
const per = computed(() => Math.round(1 / (catalog.config.bonus?.rate ?? 0.02)))
const nf = (n: number) => n.toLocaleString('en-US')

async function load() {
  loading.value = true
  error.value = ''
  try { await admin.loadProducts() } catch (e) { if (!authError(e)) error.value = t(commonErrorKey(e)) } finally { loading.value = false }
}
onMounted(load)

async function open(p: AdminProduct | 'new') {
  editing.value = p
  await nextTick()
  formBox.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
async function saved() {
  editing.value = null
  void catalog.load(true) // сайт сразу показывает новые баллы и товары
}
async function remove(p: AdminProduct) {
  const ok = await confirm.ask(p.bonusOnly
    ? { icon: '🗑️', title: t('admin.confirm.remove.title'), text: t('admin.confirm.remove.text', { name: p.name }), yes: t('admin.confirm.remove.yes'), tone: 'danger' }
    : { icon: '🎁', title: t('admin.confirm.unbonus.title'), text: t('admin.confirm.unbonus.text', { name: p.name }), yes: t('admin.confirm.unbonus.yes'), tone: 'danger' })
  if (!ok) return
  busyId.value = p.id
  error.value = ''
  try {
    if (p.bonusOnly) await admin.removeReward(p.id)
    else await admin.updateProduct(p.id, { bonusPoints: null })
    void catalog.load(true)
  } catch (e) {
    if (!authError(e)) error.value = t(commonErrorKey(e))
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <section class="ar">
    <div class="ar__top">
      <p class="ar__lead">{{ $t('admin.rewards.lead', { percent, per }) }}</p>
      <AppButton v-if="editing === null" @click="open('new')">+ {{ $t('admin.rewards.add') }}</AppButton>
    </div>

    <div v-if="editing !== null" ref="formBox" class="ar__form">
      <RewardForm :key="editing === 'new' ? 'new' : editing.id" :product="editing === 'new' ? null : editing" @done="saved" @cancel="editing = null" />
    </div>

    <p v-if="error" class="ar__error" role="alert">{{ error }}</p>
    <p v-if="loading && !admin.productsLoaded" class="muted">{{ $t('state.loading') }}</p>
    <p v-else-if="admin.productsLoaded && !admin.rewards.length" class="ar__empty">{{ $t('admin.rewards.empty') }}</p>
    <ul v-else class="ar__list">
      <li v-for="p in admin.rewards" :key="p.id" class="rw" :class="{ 'is-editing': editing !== 'new' && editing?.id === p.id }">
        <span class="rw__art"><ProductArt :kind="p.art" :src="p.image || undefined" :alt="p.name" /></span>
        <div class="rw__body">
          <b class="rw__name">{{ p.name }}</b>
          <span class="rw__pts">🎁 {{ $t('admin.rewards.points', { n: nf(p.bonusPoints ?? 0) }) }}</span>
          <small v-if="p.price" class="muted">{{ $t('admin.rewards.value', { price: money(p.price) }) }}</small>
          <span class="rw__tags">
            <span class="rw__tag" :class="p.bonusOnly ? 'is-only' : 'is-cat'">{{ p.bonusOnly ? $t('admin.rewards.bonusOnly') : $t('admin.rewards.catalog') }}</span>
            <span v-if="!p.active" class="rw__tag is-hidden">{{ $t('admin.rewards.hidden') }}</span>
          </span>
        </div>
        <div class="rw__btns">
          <AppButton size="sm" variant="light" @click="open(p)">{{ $t('admin.rewards.edit') }}</AppButton>
          <button type="button" class="rw__link" :disabled="busyId === p.id" @click="remove(p)">{{ p.bonusOnly ? $t('admin.rewards.remove') : $t('admin.rewards.unbonus') }}</button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.ar__top { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px 20px; margin-bottom:18px; }
.ar__lead { flex:1 1 380px; max-width:70ch; margin:0; color:var(--muted); font-size:14px; line-height:1.55; }
.ar__form { margin-bottom:20px; scroll-margin-top:140px; }
.ar__error { padding:10px 14px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:14px; }
.ar__empty { padding:28px 18px; border:1.5px dashed var(--line); border-radius:var(--r-lg); color:var(--muted); text-align:center; }
.ar__list { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(300px, 100%), 1fr)); gap:12px; margin:0; padding:0; list-style:none; }
.rw { display:grid; grid-template-columns:72px 1fr; grid-template-areas:'art body' 'btns btns'; gap:10px 14px; padding:14px; border:1px solid var(--line); border-radius:var(--r-lg); background:#fff; transition:border-color .2s; }
.rw.is-editing { border-color:var(--yellow); }
.rw__art { grid-area:art; display:block; width:72px; height:72px; padding:8px; border-radius:var(--r-md); background:radial-gradient(circle at 50% 40%, #fff, var(--cream)); }
.rw__body { grid-area:body; display:flex; flex-direction:column; align-items:flex-start; gap:3px; min-width:0; }
.rw__name { font-size:15px; line-height:1.35; }
.rw__pts { color:#8a5f00; font-size:16px; font-weight:800; }
.rw__tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
.rw__tag { padding:2px 9px; border-radius:var(--pill); font-size:12px; font-weight:600; }
.rw__tag.is-cat { background:var(--bg); color:var(--muted); }
.rw__tag.is-only { background:var(--cream); color:#7a5600; }
.rw__tag.is-hidden { background:#fdecea; color:var(--red); }
.rw__btns { grid-area:btns; display:flex; flex-wrap:wrap; align-items:center; gap:8px 14px; }
.rw__link { padding:4px 0; border:0; background:none; color:var(--muted); font-size:13px; font-weight:600; text-decoration:underline; text-underline-offset:3px; }
.rw__link:hover { color:var(--red); }
.rw__link:disabled { opacity:.5; cursor:progress; }
</style>
