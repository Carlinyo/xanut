<script setup lang="ts">
// Форма бонусного товара: товар из каталога (меняются только баллы) или новый товар только за баллы.
import { computed, reactive, ref, watch } from 'vue'
import { t } from '../../i18n'
import { ApiError, commonErrorKey } from '../../api'
import { useAdmin } from '../../stores/admin'
import { useCatalog } from '../../stores/catalog'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import { money } from '../../utils/format'
import type { AdminProduct } from '../../types'
import FormField from './FormField.vue'
import ChoiceToggle from './ChoiceToggle.vue'
import ImagePicker from './ImagePicker.vue'
import ProductArt from '../atoms/ProductArt.vue'
import AppButton from '../atoms/AppButton.vue'

const props = defineProps<{ product?: AdminProduct | null }>()
const emit = defineEmits<{ done: []; cancel: [] }>()
const admin = useAdmin(), catalog = useCatalog(), authError = useAuthRedirect()

type Kind = 'catalog' | 'new'
const editing = computed(() => !!props.product)
const kind = ref<Kind>(props.product ? (props.product.bonusOnly ? 'new' : 'catalog') : 'catalog')
// числа — строками: поле можно очистить и набрать заново, не воюя с «0» (проверяем при сохранении)
const form = reactive({
  productId: props.product && !props.product.bonusOnly ? props.product.id : 0,
  name: props.product?.name ?? '',
  points: props.product?.bonusPoints ? String(props.product.bonusPoints) : '',
  price: props.product?.bonusOnly && props.product.price ? String(props.product.price) : '',
  art: props.product?.art ?? 'grill',
  image: props.product?.image ?? '',
})
const int = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN)
const errors = reactive({ productId: '', name: '', points: '', price: '', form: '' })
// исправили поле — его ошибка больше не нужна
watch(() => form.name, () => (errors.name = ''))
watch(() => form.points, () => (errors.points = ''))
watch(() => form.price, () => (errors.price = ''))
const saving = ref(false)

// товары каталога по категориям; уже бонусные — недоступны (их меняют в списке)
const groups = computed(() => {
  const list = admin.products.filter((p) => !p.bonusOnly)
  const named = catalog.categories.map((c) => ({ label: c.name, items: list.filter((p) => p.categoryId === c.id) }))
  const rest = list.filter((p) => !catalog.categories.some((c) => c.id === p.categoryId))
  return [...named, ...(rest.length ? [{ label: '—', items: rest }] : [])].filter((g) => g.items.length)
})
const chosen = computed(() => admin.products.find((p) => p.id === form.productId) ?? null)
const rate = computed(() => catalog.config.bonus?.rate ?? 0.02)
const pointsHint = computed(() => (int(form.points) > 0 && rate.value > 0 ? t('admin.rewards.form.pointsHint', { sum: money(Math.ceil(int(form.points) / rate.value / 100) * 100) }) : ''))

function validate(): boolean {
  Object.assign(errors, { productId: '', name: '', points: '', price: '', form: '' })
  if (kind.value === 'catalog' && !form.productId) errors.productId = t('admin.rewards.errors.product')
  if (kind.value === 'new' && form.name.trim().length < 2) errors.name = t('admin.rewards.errors.name')
  if (!(int(form.points) >= 1)) errors.points = t('admin.rewards.errors.points')
  if (kind.value === 'new' && form.price.trim() && !(int(form.price) >= 0)) errors.price = t('admin.rewards.errors.price')
  return !errors.productId && !errors.name && !errors.points && !errors.price
}

async function save() {
  if (!validate()) return
  saving.value = true
  try {
    const bonusPoints = int(form.points), price = form.price.trim() ? int(form.price) : 0
    if (kind.value === 'catalog') await admin.updateProduct(form.productId, { bonusPoints })
    else if (props.product) await admin.updateProduct(props.product.id, { name: form.name.trim(), bonusPoints, price, art: form.art, image: form.image })
    else await admin.createReward({ name: form.name.trim(), bonusPoints, price, art: form.art, ...(form.image ? { image: form.image } : {}) })
    emit('done')
  } catch (e) {
    if (authError(e)) return
    const issue = e instanceof ApiError ? e.issues?.[0] : undefined
    if (issue?.path === 'name') errors.name = t('admin.rewards.errors.name')
    else if (issue?.path === 'bonusPoints') errors.points = t('admin.rewards.errors.points')
    else if (issue?.path === 'price') errors.price = t('admin.rewards.errors.price')
    else errors.form = t(commonErrorKey(e))
  } finally {
    saving.value = false
  }
}
const kinds = computed(() => [
  { value: 'catalog' as Kind, label: t('admin.rewards.form.fromCatalog'), icon: '📦' },
  { value: 'new' as Kind, label: t('admin.rewards.form.new'), icon: '✨' },
])
</script>

<template>
  <form class="rf" novalidate @submit.prevent="save">
    <h2>{{ editing ? $t('admin.rewards.form.titleEdit') : $t('admin.rewards.form.titleNew') }}</h2>
    <ChoiceToggle v-if="!editing" v-model="kind" :options="kinds" :label="$t('admin.rewards.form.kind')" />

    <template v-if="kind === 'catalog'">
      <div v-if="editing && chosen" class="rf__chosen">
        <span class="rf__thumb"><ProductArt :kind="chosen.art" :src="chosen.image || undefined" alt="" /></span>
        <span><b>{{ chosen.name }}</b><br /><small class="muted">{{ money(chosen.price) }}</small></span>
      </div>
      <FormField
        v-else :model-value="form.productId" as="select" :label="$t('admin.rewards.form.product')" :error="errors.productId"
        @update:model-value="form.productId = Number($event); errors.productId = ''"
      >
        <option :value="0" disabled>{{ $t('admin.rewards.form.choose') }}</option>
        <optgroup v-for="g in groups" :key="g.label" :label="g.label">
          <option v-for="p in g.items" :key="p.id" :value="p.id" :disabled="!!p.bonusPoints">
            {{ p.name }} — {{ money(p.price) }}{{ p.bonusPoints ? ' 🎁' : '' }}
          </option>
        </optgroup>
      </FormField>
      <p class="rf__note">{{ $t('admin.rewards.form.catalogNote') }}</p>
    </template>
    <template v-else>
      <FormField v-model="form.name" :label="$t('admin.rewards.form.name')" :error="errors.name" maxlength="80" autocomplete="off" />
    </template>

    <div class="rf__nums">
      <div>
        <FormField v-model="form.points" inputmode="numeric" maxlength="7" autocomplete="off" :placeholder="$t('admin.rewards.form.pointsExample')" :label="$t('admin.rewards.form.points')" :error="errors.points" />
        <small v-if="pointsHint && !errors.points" class="rf__hint">{{ pointsHint }}</small>
      </div>
      <div v-if="kind === 'new'">
        <FormField v-model="form.price" inputmode="numeric" maxlength="8" autocomplete="off" :label="$t('admin.rewards.form.price')" :error="errors.price" />
        <small v-if="!errors.price" class="rf__hint">{{ $t('admin.rewards.form.priceHint') }}</small>
      </div>
    </div>

    <ImagePicker v-if="kind === 'new'" v-model:image="form.image" v-model:art="form.art" />

    <p v-if="errors.form" class="rf__err" role="alert">{{ errors.form }}</p>
    <div class="rf__btns">
      <AppButton type="submit" :disabled="saving">{{ saving ? $t('common.sending') : $t('admin.rewards.form.save') }}</AppButton>
      <AppButton variant="light" :disabled="saving" @click="emit('cancel')">{{ $t('admin.rewards.form.cancel') }}</AppButton>
    </div>
  </form>
</template>

<style scoped>
.rf { display:flex; flex-direction:column; gap:16px; padding:clamp(16px, 3vw, 24px); border:1.5px solid var(--yellow); border-radius:var(--r-lg); background:#fff; box-shadow:0 18px 34px -24px rgb(217 151 0 / .55); }
.rf h2 { margin:0; font-size:20px; }
.rf__chosen { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:var(--r-md); background:var(--bg); }
.rf__thumb { flex:none; width:56px; height:56px; }
.rf__note { margin:-6px 0 0; color:var(--muted); font-size:13px; line-height:1.45; }
.rf__nums { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px; }
.rf__hint { display:block; margin-top:6px; color:var(--muted); font-size:12.5px; line-height:1.4; }
.rf__err { margin:0; padding:10px 12px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:14px; }
.rf__btns { display:flex; flex-wrap:wrap; gap:10px; }
</style>
