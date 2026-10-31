<script setup lang="ts">
// Товар каталога: название, раздел, цена за кг или за штуку, скидка, описание, картинка, наличие и видимость на сайте.
import { computed, reactive, ref, watch } from 'vue'
import { t } from '../../i18n'
import { ApiError, commonErrorKey } from '../../api'
import { useAdmin, type ProductDraft } from '../../stores/admin'
import { useCatalog } from '../../stores/catalog'
import { useConfirm } from '../../stores/confirm'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import type { AdminProduct, ProductUnit } from '../../types'
import FormField from './FormField.vue'
import ChoiceToggle from './ChoiceToggle.vue'
import ImagePicker from './ImagePicker.vue'
import AppToggle from '../atoms/AppToggle.vue'
import AppButton from '../atoms/AppButton.vue'

const props = defineProps<{ product?: AdminProduct | null; categoryId?: number }>()
const emit = defineEmits<{ done: [product: AdminProduct, created: boolean]; removed: [product: AdminProduct]; cancel: [] }>()
const admin = useAdmin(), catalog = useCatalog(), confirm = useConfirm(), authError = useAuthRedirect()
const p = props.product ?? null
// числа — строками: поле можно очистить и набрать заново, не воюя с «0» (проверяем при сохранении)
const form = reactive({
  name: p?.name ?? '',
  categoryId: p?.categoryId ?? props.categoryId ?? 0,
  unit: (p?.unit ?? 'kg') as ProductUnit,
  price: p?.price ? String(p.price) : '',
  oldPrice: p?.oldPrice ? String(p.oldPrice) : '',
  description: p?.description ?? '',
  art: p?.art ?? 'steak',
  image: p?.image ?? '',
  inStock: p?.inStock ?? true,
  active: p?.active ?? true,
})
const int = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN)
const errors = reactive({ name: '', categoryId: '', price: '', oldPrice: '', form: '' })
// исправили поле — его ошибка больше не нужна
watch(() => form.name, () => (errors.name = ''))
watch(() => form.categoryId, () => (errors.categoryId = ''))
watch(() => form.price, () => { errors.price = ''; errors.oldPrice = '' })
watch(() => form.oldPrice, () => (errors.oldPrice = ''))
const saving = ref(false)

const category = computed(() => catalog.categories.find((c) => c.id === form.categoryId))
const units = computed(() => [
  { value: 'kg' as ProductUnit, label: t('admin.catalog.form.perKg'), icon: '⚖️' },
  { value: 'pc' as ProductUnit, label: t('admin.catalog.form.perPc'), icon: '🔢' },
])
// как этот товар будут заказывать на сайте
const unitHint = computed(() => (!category.value ? ''
  : !category.value.orderable ? t('admin.catalog.form.unitHintShowcase')
  : t(form.unit === 'kg' ? 'admin.catalog.form.unitHintKg' : 'admin.catalog.form.unitHintPc')))

function validate(): boolean {
  Object.assign(errors, { name: '', categoryId: '', price: '', oldPrice: '', form: '' })
  if (form.name.trim().length < 2) errors.name = t('admin.catalog.errors.name')
  if (!form.categoryId) errors.categoryId = t('admin.catalog.errors.category')
  if (!(int(form.price) >= 1)) errors.price = t('admin.catalog.errors.price')
  if (form.oldPrice.trim() && !(int(form.oldPrice) > int(form.price))) errors.oldPrice = t('admin.catalog.errors.oldPrice')
  return !errors.name && !errors.categoryId && !errors.price && !errors.oldPrice
}
const draft = (): ProductDraft => ({
  name: form.name.trim(), categoryId: form.categoryId, price: int(form.price), oldPrice: form.oldPrice.trim() ? int(form.oldPrice) : null,
  unit: form.unit, description: form.description.trim(), art: form.art, image: form.image, inStock: form.inStock, active: form.active,
})

async function save() {
  if (saving.value || !validate()) return
  saving.value = true
  try {
    const d = draft()
    if (p) emit('done', await admin.updateProduct(p.id, d), false) // image: '' — убрать фото
    else emit('done', await admin.createProduct({ ...d, image: d.image || undefined }), true)
  } catch (e) {
    if (authError(e)) return
    const err = e instanceof ApiError ? e : null
    const field = err?.issues?.[0]?.path
    if (err?.code === 'OLD_PRICE' || field === 'oldPrice') errors.oldPrice = t('admin.catalog.errors.oldPrice')
    else if (err?.code === 'PRICE_REQUIRED' || field === 'price') errors.price = t('admin.catalog.errors.price')
    else if (err?.code === 'INVALID_CATEGORY' || field === 'categoryId') errors.categoryId = t('admin.catalog.errors.category')
    else if (field === 'name') errors.name = t('admin.catalog.errors.name')
    else errors.form = t(commonErrorKey(e))
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!p || saving.value) return
  const ok = await confirm.ask({ icon: '🗑️', title: t('admin.catalog.confirmRemove.title'), text: t('admin.catalog.confirmRemove.text', { name: p.name }),
    yes: t('admin.catalog.confirmRemove.yes'), tone: 'danger' })
  if (!ok) return
  saving.value = true
  try {
    await admin.removeProduct(p.id)
    emit('removed', p)
  } catch (e) {
    if (!authError(e)) errors.form = t(commonErrorKey(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="pf" novalidate @submit.prevent="save">
    <h2>{{ p ? $t('admin.catalog.form.titleEdit') : $t('admin.catalog.form.titleNew') }}</h2>
    <div class="pf__grid">
      <FormField v-model="form.name" :label="$t('admin.catalog.form.name')" :error="errors.name" maxlength="80" autocomplete="off" />
      <FormField
        :model-value="form.categoryId" as="select" :label="$t('admin.catalog.form.category')" :error="errors.categoryId"
        @update:model-value="form.categoryId = Number($event)"
      >
        <option :value="0" disabled>{{ $t('admin.catalog.form.chooseCategory') }}</option>
        <option v-for="c in catalog.categories" :key="c.id" :value="c.id">{{ c.name }}{{ c.orderable ? ' 🔥' : '' }}</option>
      </FormField>
    </div>

    <div>
      <ChoiceToggle v-model="form.unit" :options="units" :label="$t('admin.catalog.form.unit')" />
      <small v-if="unitHint" class="pf__hint">{{ unitHint }}</small>
    </div>

    <div class="pf__grid">
      <FormField
        v-model="form.price" inputmode="numeric" maxlength="8" autocomplete="off" :error="errors.price"
        :label="$t(form.unit === 'kg' ? 'admin.catalog.form.priceKg' : 'admin.catalog.form.pricePc')"
      />
      <div>
        <FormField v-model="form.oldPrice" inputmode="numeric" maxlength="8" autocomplete="off" :label="$t('admin.catalog.form.oldPrice')" :error="errors.oldPrice" />
        <small v-if="!errors.oldPrice" class="pf__hint">{{ $t('admin.catalog.form.oldPriceHint') }}</small>
      </div>
    </div>

    <div>
      <FormField v-model="form.description" as="textarea" rows="3" maxlength="500" :label="$t('admin.catalog.form.description')" />
      <small class="pf__hint">{{ $t('admin.catalog.form.descriptionHint') }}</small>
    </div>

    <ImagePicker v-model:image="form.image" v-model:art="form.art" />

    <div class="pf__toggles">
      <AppToggle v-model="form.inStock"><b>{{ $t('admin.catalog.form.inStock') }}</b> — {{ $t('admin.catalog.form.inStockHint') }}</AppToggle>
      <AppToggle v-model="form.active"><b>{{ $t('admin.catalog.form.visible') }}</b> — {{ $t('admin.catalog.form.visibleHint') }}</AppToggle>
    </div>

    <p v-if="errors.form" class="pf__err" role="alert">{{ errors.form }}</p>
    <div class="pf__btns">
      <AppButton type="submit" :disabled="saving">{{ saving ? $t('common.sending') : $t('admin.catalog.form.save') }}</AppButton>
      <AppButton variant="light" :disabled="saving" @click="emit('cancel')">{{ $t('admin.catalog.form.cancel') }}</AppButton>
      <button v-if="p" type="button" class="pf__del" :disabled="saving" @click="remove">🗑 {{ $t('admin.catalog.form.remove') }}</button>
    </div>
  </form>
</template>

<style scoped>
.pf { display:flex; flex-direction:column; gap:16px; padding:clamp(16px, 3vw, 24px); border:1.5px solid var(--yellow); border-radius:var(--r-lg); background:#fff; box-shadow:0 18px 34px -24px rgb(217 151 0 / .55); }
.pf h2 { margin:0; font-size:20px; }
.pf__grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:14px; }
.pf__hint { display:block; margin-top:6px; color:var(--muted); font-size:12.5px; line-height:1.4; }
.pf__toggles { display:flex; flex-direction:column; gap:10px; padding:12px 14px; border-radius:var(--r-md); background:var(--bg); }
.pf__err { margin:0; padding:10px 12px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:14px; }
.pf__btns { display:flex; flex-wrap:wrap; align-items:center; gap:10px; }
.pf__del { margin-left:auto; padding:6px 0; border:0; background:none; color:var(--muted); font-size:13px; font-weight:600; text-decoration:underline; text-underline-offset:3px; }
.pf__del:hover { color:var(--red); }
.pf__del:disabled { opacity:.5; cursor:progress; }
</style>
