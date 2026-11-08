<script setup lang="ts">
import { computed, reactive } from 'vue'
import { t } from '../../i18n'
import { money } from '../../utils/format'
import { KEBAB_KG, isMeat, isValidKg, weightPrice } from '../../utils/kebab'
import { WEIGH_DEFAULT, isValidPortions } from '../../utils/weigh'
import { useCart, weightName } from '../../stores/cart'
import { useCatalog } from '../../stores/catalog'
import { useUI } from '../../stores/ui'
import OverlayShell from '../molecules/OverlayShell.vue'
import FormField from '../molecules/FormField.vue'
import ProductArt from '../atoms/ProductArt.vue'
import AppButton from '../atoms/AppButton.vue'

const emit = defineEmits<{ close: [] }>()
const cart = useCart(), catalog = useCatalog(), ui = useUI()
// мясо «за кг», которое сейчас можно заказать (окно открыли с карточки или страницы товара)
const product = computed(() => catalog.products.find((p) => p.id === ui.meatProduct && p.unit === 'kg' && isMeat(p) && p.inStock !== false))
const form = reactive({ kg: 1, portions: 1 })
/** Частый вес — одним нажатием. */
const QUICK = [0.5, 1, 1.5, 2, 3]
// та же формула, что на сервере; null — вес вне ограничений (такой заказ сервер не примет)
const price = computed(() => (product.value && isValidKg(form.kg) ? weightPrice(product.value.price, form.kg) : null))
const kgError = computed(() => (isValidKg(form.kg) ? '' : t('kebab.weightError', { min: KEBAB_KG.min, max: KEBAB_KG.max, step: KEBAB_KG.step })))

// рыба, кролик на развес: покупатель выбирает порции, вес и цену пришлёт работник (покупатель подтвердит чек)
const weighed = computed(() => product.value?.weighed === true)
const maxPortions = computed(() => catalog.config.weigh?.maxPortions ?? WEIGH_DEFAULT.maxPortions)
const QUICK_PORTIONS = [1, 2, 3, 4]
const portionsOk = computed(() => isValidPortions(form.portions, maxPortions.value))
const portionsError = computed(() => (portionsOk.value ? '' : t('weigh.portionsError', { max: maxPortions.value })))

function add() {
  const p = product.value
  if (!p) return
  if (weighed.value) {
    if (!portionsOk.value) return
    // те же порции того же товара складываются в одну позицию: «Ձուկ իշխան — 3 բաժին»
    cart.add({ id: `weighed-${p.id}`, productId: p.id, weighed: true, perKg: p.price, name: p.name, price: 0, art: p.art, image: p.image }, form.portions)
    emit('close')
    return
  }
  if (price.value === null) return
  // тот же товар того же веса складывается в одну позицию: «× 2» — две упаковки
  cart.add({ id: `meat-${p.id}-${form.kg}`, productId: p.id, kg: form.kg, name: weightName(p.name, form.kg), price: price.value, art: p.art, image: p.image })
  emit('close')
}
</script>

<template>
  <OverlayShell side="center" :label="$t(weighed ? 'weigh.title' : 'meat.title')" @close="emit('close')">
    <form class="mt" @submit.prevent="add">
      <header class="mt__head">
        <h2>⚖️ {{ $t(weighed ? 'weigh.title' : 'meat.title') }}</h2>
        <AppButton variant="close" :aria-label="$t('common.close')" @click="emit('close')">✕</AppButton>
      </header>

      <template v-if="product">
        <div class="mt__product">
          <span class="mt__art"><ProductArt :kind="product.art" :src="product.image" :alt="product.name" /></span>
          <div class="mt__info">
            <b>{{ product.name }}</b>
            <small>{{ $t('kebab.perKg', { price: product.price.toLocaleString('en-US') }) }}</small>
          </div>
        </div>
        <!-- рыба, кролик: порции; вес и цену пришлёт работник, покупатель подтвердит чек -->
        <template v-if="weighed">
          <FormField
            v-model="form.portions" type="number" inputmode="numeric" min="1" :max="maxPortions" step="1"
            :label="$t('weigh.portions')" :error="portionsError"
          />
          <div class="mt__quick" role="group" :aria-label="$t('weigh.portions')">
            <button v-for="n in QUICK_PORTIONS" :key="n" type="button" class="mt__chip" :class="{ on: form.portions === n }" :aria-pressed="form.portions === n" @click="form.portions = n">
              {{ $t('weigh.quick', { n }) }}
            </button>
          </div>
          <p class="mt__weigh">⚖️ {{ $t('weigh.perKgNote', { price: product.price.toLocaleString('en-US') }) }}</p>
          <AppButton type="submit" size="lg" block :disabled="!portionsOk">{{ $t('weigh.add', { n: form.portions }) }}</AppButton>
        </template>
        <template v-else>
          <FormField
            v-model="form.kg" type="number" inputmode="decimal" :min="KEBAB_KG.min" :max="KEBAB_KG.max" :step="KEBAB_KG.step"
            :label="$t('kebab.weight')" :error="kgError"
          />
          <div class="mt__quick" role="group" :aria-label="$t('kebab.weight')">
            <button v-for="w in QUICK" :key="w" type="button" class="mt__chip" :class="{ on: form.kg === w }" :aria-pressed="form.kg === w" @click="form.kg = w">
              {{ w }} {{ $t('units.kg') }}
            </button>
          </div>

          <AppButton type="submit" size="lg" block :disabled="price === null">
            {{ $t('kebab.add') }} — <Transition name="num" mode="out-in"><span :key="price ?? 'none'">{{ price === null ? '—' : money(price) }}</span></Transition>
          </AppButton>
        </template>
      </template>
      <template v-else>
        <p class="mt__empty">{{ $t('meat.missing') }}</p>
        <AppButton variant="light" block @click="emit('close')">{{ $t('common.close') }}</AppButton>
      </template>
    </form>
  </OverlayShell>
</template>

<style scoped>
.mt { display:flex; flex-direction:column; gap:14px; padding:clamp(18px, 3vw, 26px); }
.mt__head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
h2 { margin:0; font-size:22px; }
.mt__product { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:var(--r-md); background:var(--bg); }
.mt__art { display:grid; place-items:center; flex:none; width:56px; height:56px; }
.mt__art > * { width:90%; height:90%; }
.mt__info { display:flex; flex-direction:column; gap:2px; min-width:0; overflow-wrap:anywhere; }
.mt__info small { color:var(--muted); font-size:13px; }
.mt__quick { display:flex; flex-wrap:wrap; gap:6px; margin-top:-4px; }
.mt__chip { padding:7px 12px; border:1.5px solid var(--line); border-radius:var(--pill); background:#fff; font-size:13px; font-weight:600; transition:border-color .2s, background .2s; }
.mt__chip:hover { border-color:var(--yellow); }
.mt__chip.on { border-color:var(--yellow-lo); background:var(--yellow); }
.mt__weigh { margin:-4px 0 0; padding:10px 12px; border-radius:var(--r-md); background:var(--cream); color:#7a5600; font-size:13px; font-weight:600; line-height:1.5; }
.mt__empty { margin:0; padding:14px 16px; border-radius:var(--r-md); background:var(--bg); color:var(--muted); line-height:1.5; }
.num-enter-active, .num-leave-active { transition:opacity .15s, transform .2s var(--ease); }
.num-enter-from { opacity:0; transform:translateY(6px); }
.num-leave-to { opacity:0; transform:translateY(-6px); }
</style>
