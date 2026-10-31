<script setup lang="ts">
import { computed, reactive } from 'vue'
import { t } from '../../i18n'
import { money } from '../../utils/format'
import { uuid } from '../../utils/id'
import { KEBAB_COMMENT_MAX, KEBAB_KG, isValidKg, kebabPrice } from '../../utils/kebab'
import { useCart } from '../../stores/cart'
import { useCatalog } from '../../stores/catalog'
import { useUI } from '../../stores/ui'
import OverlayShell from '../molecules/OverlayShell.vue'
import FormField from '../molecules/FormField.vue'
import AppCheckbox from '../atoms/AppCheckbox.vue'
import AppButton from '../atoms/AppButton.vue'

const emit = defineEmits<{ close: [] }>()
const cart = useCart(), catalog = useCatalog(), ui = useUI()
// меню шашлыка приходит с сервера: мясо — хоровац «за кг» из каталога (цену и наличие меняют в админке)
const kebab = computed(() => catalog.kebab)
// открыли с карточки товара — сразу этот хоровац, иначе первый из меню
const defaultMeat = kebab.value.meats.find((m) => m.id === ui.kebabMeat)?.id ?? kebab.value.meats[0]?.id ?? ''
const form = reactive({ meat: defaultMeat, kg: 1, marinade: kebab.value.marinades[0] ?? '', extras: [] as string[], comment: '' })
const meat = computed(() => kebab.value.meats.find((m) => m.id === form.meat))
const product = computed(() => catalog.products.find((p) => String(p.id) === form.meat))
const chosen = computed(() => kebab.value.extras.filter((e) => form.extras.includes(e.id)))
const selection = computed(() => ({ meat: form.meat, kg: form.kg, marinade: form.marinade, extras: [...form.extras], comment: form.comment.trim() || undefined }))
// та же формула, что на сервере; null — выбор неполный или вне ограничений (такой заказ сервер не примет)
const price = computed(() => kebabPrice(kebab.value, selection.value))
const kgError = computed(() => (isValidKg(form.kg) ? '' : t('kebab.weightError', { min: KEBAB_KG.min, max: KEBAB_KG.max, step: KEBAB_KG.step })))

function add() {
  if (price.value === null || !meat.value) return
  cart.add({
    id: 'kebab-' + uuid(),
    name: t('kebab.itemName', { meat: meat.value.name, kg: form.kg }),
    price: price.value,
    art: product.value?.art ?? 'kebab',
    image: product.value?.image,
    selection: selection.value,
    note: [form.marinade, chosen.value.map((e) => e.name).join(', '), selection.value.comment].filter(Boolean).join(' · '),
  })
  emit('close')
}
</script>

<template>
  <OverlayShell side="center" :label="$t('kebab.title')" @close="emit('close')">
    <form class="kb" @submit.prevent="add">
      <header class="kb__head">
        <h2>🍢 {{ $t('kebab.title') }}</h2>
        <AppButton variant="close" :aria-label="$t('common.close')" @click="emit('close')">✕</AppButton>
      </header>

      <template v-if="kebab.meats.length">
        <FormField v-model="form.meat" as="select" :label="$t('kebab.meat')">
          <option v-for="m in kebab.meats" :key="m.id" :value="m.id">{{ m.name }} — {{ $t('kebab.perKg', { price: m.perKg.toLocaleString('en-US') }) }}</option>
        </FormField>
        <FormField
          v-model="form.kg" type="number" inputmode="decimal" :min="KEBAB_KG.min" :max="KEBAB_KG.max" :step="KEBAB_KG.step"
          :label="$t('kebab.weight')" :error="kgError"
        />
        <FormField v-model="form.marinade" as="select" :label="$t('kebab.marinade')">
          <option v-for="m in kebab.marinades" :key="m">{{ m }}</option>
        </FormField>
        <fieldset class="kb__extras">
          <legend>{{ $t('kebab.extras') }}</legend>
          <AppCheckbox v-for="e in kebab.extras" :key="e.id" v-model="form.extras" :value="e.id">
            {{ e.name }} ({{ $t('kebab.plus', { price: e.price.toLocaleString('en-US') }) }})
            <small v-if="e.note" class="kb__note">{{ e.note }}</small>
          </AppCheckbox>
        </fieldset>
        <FormField v-model="form.comment" as="textarea" rows="2" :maxlength="KEBAB_COMMENT_MAX" :label="$t('kebab.comment')" />

        <AppButton type="submit" size="lg" block :disabled="price === null">
          {{ $t('kebab.add') }} — <Transition name="num" mode="out-in"><span :key="price ?? 'none'">{{ price === null ? '—' : money(price) }}</span></Transition>
        </AppButton>
      </template>
      <template v-else>
        <p class="kb__empty">{{ $t('kebab.empty') }}</p>
        <AppButton variant="light" block @click="emit('close')">{{ $t('common.close') }}</AppButton>
      </template>
    </form>
  </OverlayShell>
</template>

<style scoped>
.kb { display:flex; flex-direction:column; gap:14px; padding:clamp(18px, 3vw, 26px); }
.kb__head { display:flex; align-items:center; justify-content:space-between; }
h2 { margin:0; font-size:22px; }
.kb__extras { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:0; padding:0; border:0; }
legend { margin-bottom:8px; padding:0; font-size:14px; font-weight:600; }
.kb__note { display:block; margin-top:2px; color:var(--muted); font-size:12px; line-height:1.4; }
.kb__empty { margin:0; padding:14px 16px; border-radius:var(--r-md); background:var(--bg); color:var(--muted); line-height:1.5; }
.num-enter-active, .num-leave-active { transition:opacity .15s, transform .2s var(--ease); }
.num-enter-from { opacity:0; transform:translateY(6px); }
.num-leave-to { opacity:0; transform:translateY(-6px); }
@media (max-width:480px) { .kb__extras { grid-template-columns:1fr; } }
</style>
