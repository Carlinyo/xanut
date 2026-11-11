<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { t } from '../../i18n'
import { money } from '../../utils/format'
import { uuid } from '../../utils/id'
import { KEBAB_COMMENT_MAX, KEBAB_KG, isKebab, isValidKg, kebabPrice } from '../../utils/kebab'
import { KIND_FILTERS, KIND_ICON, kindOf, type KindFilter } from '../../utils/kinds'
import { WEIGH_DEFAULT, isValidPortions } from '../../utils/weigh'
import { comboFarNote } from '../../utils/offer'
import { MAX_QTY, portionsName, useCart } from '../../stores/cart'
import { useCatalog } from '../../stores/catalog'
import { useUI } from '../../stores/ui'
import type { Product } from '../../types'
import OverlayShell from '../molecules/OverlayShell.vue'
import FormField from '../molecules/FormField.vue'
import AppCheckbox from '../atoms/AppCheckbox.vue'
import AppButton from '../atoms/AppButton.vue'

const emit = defineEmits<{ close: [] }>()
const cart = useCart(), catalog = useCatalog(), ui = useUI()
// меню шашлыка приходит с сервера: мясо — хоровац «за кг» из каталога (цену и наличие меняют в админке)
const kebab = computed(() => catalog.kebab)

/** Позиция меню: kg — порция с весом, маринадом и добавками; pc — штучный хоровац из каталога (քաբաբ, իքի բիր…),
 *  он кладётся в корзину как обычный товар. kind — вид мяса из карточки товара (нет — «прочее»). */
interface MenuItem { id: string; name: string; price: number; unit: 'kg' | 'pc'; kind: KindFilter; product?: Product }
const menu = computed<MenuItem[]>(() => {
  const byId = new Map(catalog.products.map((p) => [String(p.id), p]))
  const kg = kebab.value.meats.map((m): MenuItem => {
    const p = byId.get(m.id)
    return { id: m.id, name: m.name, price: m.perKg, unit: 'kg', kind: p ? kindOf(p) : 'other', product: p }
  })
  const pc = catalog.shopProducts
    .filter((p) => p.orderable && p.inStock !== false && isKebab(p) && p.unit !== 'kg')
    .map((p): MenuItem => ({ id: String(p.id), name: p.name, price: p.price, unit: 'pc', kind: kindOf(p), product: p }))
  // по видам, как в каталоге: свинина, говядина, баранина, курица…; внутри вида — сначала «за кг», потом штучные
  return [...kg, ...pc].sort((a, b) => KIND_FILTERS.indexOf(a.kind) - KIND_FILTERS.indexOf(b.kind))
})

// кнопки «Խոզ / Տավար / Հավ…» — только виды, которые сейчас есть в меню
const kind = ref<KindFilter | null>(null)
const kinds = computed(() => KIND_FILTERS.map((k) => ({ k, n: menu.value.filter((i) => i.kind === k).length })).filter((x) => x.n))
const shown = computed(() => (kind.value ? menu.value.filter((i) => i.kind === kind.value) : menu.value))
const groups = computed(() => kinds.value.map(({ k }) => ({ k, items: shown.value.filter((i) => i.kind === k) })).filter((g) => g.items.length))
/** Первая позиция списка — лучше порция «за кг»: окно прежде всего для неё. */
const firstOf = (list: MenuItem[]) => (list.find((i) => i.unit === 'kg') ?? list[0])?.id ?? ''

// открыли с карточки товара — сразу эта позиция, иначе первая из меню
const form = reactive({
  item: menu.value.find((i) => i.id === ui.kebabMeat)?.id ?? firstOf(menu.value),
  kg: 1, qty: 1, portions: 1, marinade: kebab.value.marinades[0] ?? '', extras: [] as string[], comment: '',
})
const item = computed(() => menu.value.find((i) => i.id === form.item))
const perPiece = computed(() => item.value?.unit === 'pc')
// рыба, кролик на развес: порции вместо веса — вес и цену мяса пришлёт работник, покупатель подтвердит чек
const weighed = computed(() => !perPiece.value && kebab.value.meats.find((m) => m.id === form.item)?.weighed === true)
const maxPortions = computed(() => catalog.config.weigh?.maxPortions ?? WEIGH_DEFAULT.maxPortions)
const chosen = computed(() => kebab.value.extras.filter((e) => form.extras.includes(e.id)))
const selection = computed(() => ({
  meat: form.item, ...(weighed.value ? { portions: form.portions } : { kg: form.kg }),
  marinade: form.marinade, extras: [...form.extras], comment: form.comment.trim() || undefined,
}))
const qtyOk = computed(() => Number.isInteger(form.qty) && form.qty >= 1 && form.qty <= MAX_QTY)
// порция — та же формула, что на сервере; null — выбор неполный или вне ограничений (такой заказ сервер не примет)
// (у рыбы и кролика — только добавки: мясо посчитают после взвешивания)
const price = computed(() => {
  const it = item.value
  if (!it) return null
  if (it.unit === 'pc') return qtyOk.value ? it.price * form.qty : null
  return kebabPrice(kebab.value, selection.value, maxPortions.value)
})
const kgError = computed(() => (isValidKg(form.kg) ? '' : t('kebab.weightError', { min: KEBAB_KG.min, max: KEBAB_KG.max, step: KEBAB_KG.step })))
const portionsError = computed(() => (isValidPortions(form.portions, maxPortions.value) ? '' : t('weigh.portionsError', { max: maxPortions.value })))
const qtyError = computed(() => (qtyOk.value ? '' : t('kebab.qtyError', { max: MAX_QTY })))

function pick(k: KindFilter | null) {
  kind.value = k
  // выбранной позиции нет среди показанных — берём первую из них
  if (!shown.value.some((i) => i.id === form.item)) form.item = firstOf(shown.value)
}

function add() {
  const it = item.value
  if (!it || price.value === null) return
  if (it.unit === 'pc') {
    if (it.product) cart.add(it.product, form.qty)
  } else {
    cart.add({
      id: 'kebab-' + uuid(),
      name: weighed.value ? portionsName(it.name, form.portions) : t('kebab.itemName', { meat: it.name, kg: form.kg }),
      price: price.value,
      art: it.product?.art ?? 'kebab',
      image: it.product?.image,
      selection: selection.value,
      note: [form.marinade, chosen.value.map((e) => e.name).join(', '), selection.value.comment].filter(Boolean).join(' · '),
      ...(weighed.value ? { weighed: true, perKg: it.price } : {}),
    })
  }
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

      <template v-if="menu.length">
        <div v-if="kinds.length > 1" class="kb__kinds" role="group" :aria-label="$t('catalog.kindsLabel')">
          <button type="button" class="kb__chip" :class="{ on: !kind }" :aria-pressed="!kind" @click="pick(null)">
            {{ $t('catalog.kinds.all') }} <span class="kb__n">{{ menu.length }}</span>
          </button>
          <button
            v-for="x in kinds" :key="x.k" type="button" class="kb__chip" :class="{ on: kind === x.k }"
            :aria-pressed="kind === x.k" @click="pick(x.k)"
          >
            <span aria-hidden="true">{{ KIND_ICON[x.k] }}</span> {{ $t('catalog.kinds.' + x.k) }} <span class="kb__n">{{ x.n }}</span>
          </button>
        </div>
        <FormField v-model="form.item" as="select" :label="$t('kebab.meat')">
          <optgroup v-for="g in groups" :key="g.k" :label="`${KIND_ICON[g.k]} ${$t('catalog.kinds.' + g.k)}`">
            <option v-for="i in g.items" :key="i.id" :value="i.id">
              {{ i.name }} — {{ $t(i.unit === 'pc' ? 'kebab.perPc' : 'kebab.perKg', { price: i.price.toLocaleString('en-US') }) }}
            </option>
          </optgroup>
        </FormField>

        <!-- комбо: что в него входит (доставка — бесплатно, дальняя — со скидкой) -->
        <p v-if="item?.product?.combo" class="kb__combo">🎁 {{ item.product.description || $t('combo.long') }} {{ comboFarNote(catalog.comboFar) }}</p>

        <template v-if="perPiece">
          <FormField
            v-model="form.qty" type="number" inputmode="numeric" min="1" :max="MAX_QTY" step="1"
            :label="$t('kebab.qty')" :error="qtyError"
          />
          <p class="kb__hint">{{ $t('kebab.pcHint') }}</p>
        </template>
        <template v-else>
          <template v-if="weighed">
            <FormField
              v-model="form.portions" type="number" inputmode="numeric" min="1" :max="maxPortions" step="1"
              :label="$t('weigh.portions')" :error="portionsError"
            />
            <p class="kb__combo">⚖️ {{ $t('weigh.perKgNote', { price: (item?.price ?? 0).toLocaleString('en-US') }) }}</p>
          </template>
          <FormField
            v-else v-model="form.kg" type="number" inputmode="decimal" :min="KEBAB_KG.min" :max="KEBAB_KG.max" :step="KEBAB_KG.step"
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
          <p v-if="kebab.pack" class="kb__hint">🫓 {{ $t('kebab.packHint', { name: kebab.pack.name, price: kebab.pack.price.toLocaleString('en-US'), kg: kebab.pack.perKg }) }}</p>
          <FormField v-model="form.comment" as="textarea" rows="2" :maxlength="KEBAB_COMMENT_MAX" :label="$t('kebab.comment')" />
        </template>

        <AppButton v-if="weighed" type="submit" size="lg" block :disabled="price === null">
          {{ price ? $t('weigh.addKebabExtras', { price: money(price) }) : $t('weigh.addKebab') }}
        </AppButton>
        <AppButton v-else type="submit" size="lg" block :disabled="price === null">
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
.kb { --pad:clamp(18px, 3vw, 26px); display:flex; flex-direction:column; gap:14px; padding:var(--pad); }
.kb__head { display:flex; align-items:center; justify-content:space-between; }
h2 { margin:0; font-size:22px; }
.kb__kinds { display:flex; flex-wrap:wrap; gap:6px; }
.kb__chip { display:inline-flex; align-items:center; gap:6px; padding:6px 11px; border:1.5px solid var(--line); border-radius:var(--pill); background:#fff; font-size:13px; font-weight:600; white-space:nowrap; transition:border-color .2s, background .2s; }
.kb__chip:hover { border-color:var(--yellow); }
.kb__chip.on { border-color:var(--yellow); background:var(--yellow); color:#1b1500; }
.kb__n { min-width:20px; padding:0 6px; border-radius:var(--pill); background:var(--bg); color:var(--muted); font-size:12px; font-weight:700; text-align:center; }
.kb__chip.on .kb__n { background:rgb(255 255 255 / .6); color:#1b1500; }
.kb__extras { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:0; padding:0; border:0; }
legend { margin-bottom:8px; padding:0; font-size:14px; font-weight:600; }
.kb__note { display:block; margin-top:2px; color:var(--muted); font-size:12px; line-height:1.4; }
.kb__hint { margin:-6px 0 0; color:var(--muted); font-size:13px; line-height:1.5; }
.kb__combo { margin:-4px 0 0; padding:9px 12px; border-radius:var(--r-md); background:var(--cream); color:#7a5600; font-size:13px; font-weight:600; line-height:1.45; }
.kb__empty { margin:0; padding:14px 16px; border-radius:var(--r-md); background:var(--bg); color:var(--muted); line-height:1.5; }
.num-enter-active, .num-leave-active { transition:opacity .15s, transform .2s var(--ease); }
.num-enter-from { opacity:0; transform:translateY(6px); }
.num-leave-to { opacity:0; transform:translateY(-6px); }
@media (max-width:480px) {
  .kb__extras { grid-template-columns:1fr; }
  /* на телефоне виды — одной строкой с прокруткой, как в каталоге */
  .kb__kinds { flex-wrap:nowrap; overflow-x:auto; margin-inline:calc(var(--pad) * -1); padding:2px var(--pad) 4px; scrollbar-width:none; }
  .kb__kinds::-webkit-scrollbar { display:none; }
}
</style>
