<script setup lang="ts">
// Категория (раздел каталога): название, карандашный рисунок для плитки на главной и «можно заказать на сайте».
// У категории хоровца «можно заказать» не выключается: на ней держатся часовые окна и конструктор шашлыка.
import { reactive, ref, watch } from 'vue'
import { t } from '../../i18n'
import { ApiError, commonErrorKey } from '../../api'
import { useAdmin } from '../../stores/admin'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import { CATEGORY_ARTS, categorySketchUrl } from '../../utils/art'
import type { AdminCategory } from '../../types'
import FormField from './FormField.vue'
import AppToggle from '../atoms/AppToggle.vue'
import AppButton from '../atoms/AppButton.vue'

const props = defineProps<{ category?: AdminCategory | null }>()
const emit = defineEmits<{ done: [category: AdminCategory, created: boolean]; cancel: [] }>()
const admin = useAdmin(), authError = useAuthRedirect()
const c = props.category ?? null
const form = reactive({
  name: c?.name ?? '',
  art: c && CATEGORY_ARTS.includes(c.art) ? c.art : 'veg',
  orderable: c?.orderable ?? false,
})
const errors = reactive({ name: '', form: '' })
watch(() => form.name, () => (errors.name = ''))
const saving = ref(false)

async function save() {
  if (saving.value) return
  errors.form = ''
  const name = form.name.trim()
  if (name.length < 2 || name.length > 60) { errors.name = t('admin.categories.errors.name'); return }
  saving.value = true
  try {
    const d = { name, art: form.art, orderable: c?.kebab ? true : form.orderable }
    if (c) emit('done', await admin.updateCategory(c.id, d), false)
    else emit('done', await admin.createCategory(d), true)
  } catch (e) {
    if (authError(e)) return
    const err = e instanceof ApiError ? e : null
    if (err?.code === 'NAME_TAKEN') errors.name = t('admin.categories.errors.nameTaken')
    else if (err?.issues?.[0]?.path === 'name') errors.name = t('admin.categories.errors.name')
    else errors.form = t(commonErrorKey(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="cf" novalidate @submit.prevent="save">
    <h2>{{ c ? $t('admin.categories.form.titleEdit') : $t('admin.categories.form.titleNew') }}</h2>
    <FormField
      v-model="form.name" :label="$t('admin.categories.form.name')" :placeholder="$t('admin.categories.form.namePlaceholder')"
      :error="errors.name" maxlength="60" autocomplete="off"
    />

    <fieldset class="cf__set">
      <legend>{{ $t('admin.categories.form.art') }}</legend>
      <div class="cf__arts" role="radiogroup" :aria-label="$t('admin.categories.form.art')">
        <button
          v-for="a in CATEGORY_ARTS" :key="a" type="button" role="radio" class="cf__art" :class="{ on: form.art === a }"
          :aria-checked="form.art === a" @click="form.art = a"
        >
          <img :src="categorySketchUrl(a)" alt="" width="64" height="64" loading="lazy" />
          <small>{{ $t('admin.categories.arts.' + a) }}</small>
        </button>
      </div>
      <small class="cf__hint">{{ $t('admin.categories.form.artHint') }}</small>
    </fieldset>

    <div class="cf__toggles">
      <p v-if="c?.kebab" class="cf__note">🔥 {{ $t('admin.categories.form.kebabNote') }}</p>
      <AppToggle v-else v-model="form.orderable"><b>{{ $t('admin.categories.form.orderable') }}</b> — {{ $t('admin.categories.form.orderableHint') }}</AppToggle>
    </div>

    <p v-if="errors.form" class="cf__err" role="alert">{{ errors.form }}</p>
    <div class="cf__btns">
      <AppButton type="submit" :disabled="saving">{{ saving ? $t('common.sending') : $t('admin.categories.form.save') }}</AppButton>
      <AppButton variant="light" :disabled="saving" @click="emit('cancel')">{{ $t('admin.categories.form.cancel') }}</AppButton>
    </div>
  </form>
</template>

<style scoped>
.cf { display:flex; flex-direction:column; gap:16px; padding:clamp(16px, 3vw, 24px); border:1.5px solid var(--yellow); border-radius:var(--r-lg); background:#fff; box-shadow:0 18px 34px -24px rgb(217 151 0 / .55); }
.cf h2 { margin:0; font-size:20px; }
.cf__set { min-width:0; margin:0; padding:0; border:0; }
.cf__set legend { padding:0 0 8px; font-size:14px; font-weight:600; }
.cf__arts { display:grid; grid-template-columns:repeat(auto-fill, minmax(92px, 1fr)); gap:8px; }
.cf__art { display:flex; flex-direction:column; align-items:center; gap:4px; padding:8px 6px; border:1.5px solid var(--line); border-radius:var(--r-md); background:#fff; transition:border-color .2s, background .2s, transform .2s var(--ease); }
.cf__art:hover { border-color:var(--yellow); transform:translateY(-2px); }
.cf__art.on { border-color:var(--yellow-lo); background:var(--cream); box-shadow:inset 0 0 0 1px var(--yellow-lo); }
.cf__art img { width:64px; height:64px; object-fit:contain; }
.cf__art small { color:var(--muted); font-size:11.5px; line-height:1.25; text-align:center; }
.cf__art.on small { color:#7a5600; font-weight:700; }
.cf__hint { display:block; margin-top:6px; color:var(--muted); font-size:12.5px; line-height:1.4; }
.cf__toggles { padding:12px 14px; border-radius:var(--r-md); background:var(--bg); }
.cf__note { margin:0; font-size:13px; line-height:1.45; }
.cf__err { margin:0; padding:10px 12px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:14px; }
.cf__btns { display:flex; flex-wrap:wrap; align-items:center; gap:10px; }
</style>
