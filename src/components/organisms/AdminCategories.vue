<script setup lang="ts">
// Разделы каталога: плитки «Տեսականի» на главной и разделы в каталоге идут в этом порядке.
// Добавить, переименовать, сменить рисунок и «можно заказать», поднять или опустить, удалить пустой раздел.
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { t } from '../../i18n'
import { ApiError, commonErrorKey } from '../../api'
import { useAdmin } from '../../stores/admin'
import { useConfirm } from '../../stores/confirm'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import { categorySketchUrl } from '../../utils/art'
import type { AdminCategory } from '../../types'
import CategoryForm from '../molecules/CategoryForm.vue'
import ProductArt from '../atoms/ProductArt.vue'
import AppButton from '../atoms/AppButton.vue'

const admin = useAdmin(), confirm = useConfirm(), authError = useAuthRedirect()
const loading = ref(false)
const error = ref('')
/** Идёт перестановка или удаление — кнопки списка ждут. */
const busy = ref(false)
/** null — форма закрыта, 'new' — новый раздел, иначе — изменяемый. */
const editing = ref<AdminCategory | 'new' | null>(null)
const formBox = ref<HTMLElement | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try { await admin.loadCategories() } catch (e) { if (!authError(e)) error.value = t(commonErrorKey(e)) } finally { loading.value = false }
}
onMounted(load)

const notice = ref<{ tone: 'ok' | 'bad'; text: string } | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | undefined
function say(tone: 'ok' | 'bad', text: string) {
  notice.value = { tone, text }
  clearTimeout(noticeTimer)
  if (tone === 'ok') noticeTimer = setTimeout(() => (notice.value = null), 5000)
}
onUnmounted(() => clearTimeout(noticeTimer))

async function open(c: AdminCategory | 'new') {
  editing.value = c
  await nextTick()
  formBox.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function saved(c: AdminCategory, created: boolean) {
  editing.value = null
  say('ok', t(created ? 'admin.categories.created' : 'admin.categories.saved', { name: c.name }))
}

/** Поменять местами с соседом сверху (-1) или снизу (1). */
async function move(c: AdminCategory, dir: -1 | 1) {
  const ids = admin.categories.map((x) => x.id)
  const i = ids.indexOf(c.id), j = i + dir
  if (busy.value || i < 0 || j < 0 || j >= ids.length) return
  ;[ids[i], ids[j]] = [ids[j], ids[i]]
  busy.value = true
  try {
    await admin.reorderCategories(ids)
  } catch (e) {
    if (authError(e)) return
    say('bad', t(commonErrorKey(e)))
    void load() // разделы могли поменять в другой вкладке — показываем, как есть на сервере
  } finally {
    busy.value = false
  }
}

async function remove(c: AdminCategory) {
  if (busy.value) return
  // раздел с товарами и хоровац не удаляются — объясняем сразу, не спрашивая
  if (c.kebab) return say('bad', t('admin.categories.errors.kebab'))
  if (c.products) return say('bad', t('admin.categories.errors.notEmpty', { name: c.name, n: c.products }))
  const ok = await confirm.ask({ icon: '🗑️', title: t('admin.categories.confirmRemove.title', { name: c.name }), text: t('admin.categories.confirmRemove.text'),
    yes: t('admin.categories.confirmRemove.yes'), tone: 'danger' })
  if (!ok) return
  busy.value = true
  try {
    await admin.removeCategory(c.id)
    if (editing.value !== null && editing.value !== 'new' && editing.value.id === c.id) editing.value = null
    say('ok', t('admin.categories.removed', { name: c.name }))
  } catch (e) {
    if (authError(e)) return
    const err = e instanceof ApiError ? e : null
    if (err?.code === 'CATEGORY_NOT_EMPTY') say('bad', t('admin.categories.errors.notEmpty', { name: c.name, n: Number(err.details.count ?? 0) }))
    else if (err?.code === 'KEBAB_CATEGORY') say('bad', t('admin.categories.errors.kebab'))
    else say('bad', `${c.name}: ${t(commonErrorKey(e))}`)
    void load() // свежие числа товаров
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="ct">
    <p class="ct__lead">{{ $t('admin.categories.lead') }}</p>
    <div class="ct__bar">
      <AppButton v-if="editing === null" size="sm" @click="open('new')">+ {{ $t('admin.categories.add') }}</AppButton>
      <AppButton size="sm" variant="light" :disabled="loading" @click="load">🔄 {{ $t('admin.refresh') }}</AppButton>
    </div>

    <div v-if="editing !== null" ref="formBox" class="ct__form">
      <CategoryForm :key="editing === 'new' ? 'new' : editing.id" :category="editing === 'new' ? null : editing" @done="saved" @cancel="editing = null" />
    </div>

    <Transition name="nt">
      <div v-if="notice" class="ct__notice" :class="`is-${notice.tone}`" role="status">
        <span>{{ notice.tone === 'ok' ? '✓' : '⚠' }} {{ notice.text }}</span>
        <button type="button" class="ct__x" :aria-label="$t('common.close')" @click="notice = null">×</button>
      </div>
    </Transition>
    <p v-if="error" class="ct__error" role="alert">{{ error }}</p>
    <p v-if="loading && !admin.categoriesLoaded" class="muted">{{ $t('state.loading') }}</p>
    <p v-else-if="admin.categoriesLoaded && !admin.categories.length" class="ct__empty">{{ $t('admin.categories.empty') }}</p>

    <TransitionGroup tag="ol" name="cat" class="ct__list" :aria-busy="busy || undefined">
      <li
        v-for="(c, i) in admin.categories" :key="c.id" class="cat"
        :class="{ 'is-editing': editing !== null && editing !== 'new' && editing.id === c.id }"
      >
        <span class="cat__pos" aria-hidden="true">{{ i + 1 }}</span>
        <span class="cat__art"><ProductArt :kind="c.art" :src="categorySketchUrl(c.art)" alt="" /></span>
        <div class="cat__body">
          <b class="cat__name">{{ c.name }}</b>
          <span class="cat__tags">
            <span class="tag" :class="{ 'is-hot': c.orderable }">{{ c.orderable ? $t('admin.catalog.orderable') : $t('admin.catalog.showcase') }}</span>
            <span v-if="c.kebab" class="tag is-kebab">🔥 {{ $t('admin.categories.kebab') }}</span>
            <span class="tag is-count">{{ $t('admin.categories.products', { n: c.products }) }}</span>
          </span>
        </div>
        <div class="cat__move">
          <button type="button" class="cat__btn" :disabled="busy || i === 0" :aria-label="$t('admin.categories.up', { name: c.name })" :title="$t('admin.categories.up', { name: c.name })" @click="move(c, -1)">↑</button>
          <button type="button" class="cat__btn" :disabled="busy || i === admin.categories.length - 1" :aria-label="$t('admin.categories.down', { name: c.name })" :title="$t('admin.categories.down', { name: c.name })" @click="move(c, 1)">↓</button>
        </div>
        <div class="cat__act">
          <AppButton size="sm" variant="light" @click="open(c)">✏️ {{ $t('admin.categories.edit') }}</AppButton>
          <button type="button" class="cat__del" :disabled="busy" @click="remove(c)">🗑 {{ $t('admin.categories.remove') }}</button>
        </div>
      </li>
    </TransitionGroup>
  </section>
</template>

<style scoped>
.ct__lead { max-width:76ch; margin:0 0 14px; color:var(--muted); font-size:14px; line-height:1.55; }
.ct__bar { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; }
.ct__form { margin-bottom:20px; scroll-margin-top:140px; }
.ct__notice { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px; padding:12px 14px 12px 16px; border-radius:var(--r-md); font-size:14px; font-weight:600; line-height:1.45; }
.ct__notice.is-ok { background:#e6f4ea; color:var(--green); }
.ct__notice.is-bad { background:#fdecea; color:var(--red); }
.ct__x { flex:none; width:28px; height:28px; margin:-4px -6px 0 0; border:0; border-radius:50%; background:none; color:inherit; font-size:20px; line-height:1; }
.ct__x:hover { background:rgb(0 0 0 / .06); }
.nt-enter-active, .nt-leave-active { transition:opacity .3s, transform .3s var(--ease); }
.nt-enter-from, .nt-leave-to { opacity:0; transform:translateY(-6px); }
.ct__error { padding:10px 14px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:14px; }
.ct__empty { padding:28px 18px; border:1.5px dashed var(--line); border-radius:var(--r-lg); color:var(--muted); text-align:center; }
.ct__list { display:flex; flex-direction:column; gap:8px; margin:0; padding:0; list-style:none; }
.ct__list[aria-busy] .cat__btn, .ct__list[aria-busy] .cat__del { cursor:progress; }
.cat-move { transition:transform .35s var(--ease); }

.cat { display:grid; grid-template-columns:28px 64px minmax(0, 1fr) auto auto; align-items:center; gap:10px 14px; padding:10px 14px; border:1px solid var(--line); border-radius:var(--r-md); background:#fff; transition:border-color .2s; }
.cat.is-editing { border-color:var(--yellow); }
.cat__pos { color:var(--muted); font-size:13px; font-weight:800; text-align:center; font-variant-numeric:tabular-nums; }
.cat__art { display:grid; place-items:center; width:64px; height:64px; border-radius:50%; background:#fff; box-shadow:inset 0 0 0 1px var(--line); }
.cat__art > * { width:82%; height:82%; }
.cat__body { display:flex; flex-direction:column; gap:4px; min-width:0; }
.cat__name { font-size:15px; line-height:1.35; overflow-wrap:anywhere; }
.cat__tags { display:flex; flex-wrap:wrap; gap:4px 6px; }
.tag { padding:1px 8px; border-radius:var(--pill); background:var(--bg); color:var(--muted); font-size:11.5px; font-weight:700; }
.tag.is-hot { background:var(--cream); color:#8a5f00; }
.tag.is-kebab { background:var(--dark); color:var(--yellow); }
.cat__move { display:flex; gap:4px; }
.cat__btn { width:36px; height:36px; border:1.5px solid var(--line); border-radius:var(--r-sm); background:#fff; font-size:16px; font-weight:800; line-height:1; transition:border-color .2s, background .2s; }
.cat__btn:hover:not(:disabled) { border-color:var(--yellow); background:var(--cream); }
.cat__btn:disabled { opacity:.35; cursor:not-allowed; }
.cat__act { display:flex; align-items:center; gap:12px; }
.cat__del { padding:4px 0; border:0; background:none; color:var(--muted); font-size:13px; font-weight:600; text-decoration:underline; text-underline-offset:3px; white-space:nowrap; }
.cat__del:hover:not(:disabled) { color:var(--red); }
.cat__del:disabled { opacity:.5; cursor:progress; }
@media (max-width:760px) {
  .cat { grid-template-columns:24px 52px minmax(0, 1fr); }
  .cat__art { width:52px; height:52px; }
  .cat__move { grid-column:1 / 3; }
  .cat__act { grid-column:3; justify-content:flex-end; }
}
</style>
