<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useCart } from '../../stores/cart'
import { useUI } from '../../stores/ui'
import { useCatalog } from '../../stores/catalog'
import ProductArt from '../atoms/ProductArt.vue'
import AppBadge from '../atoms/AppBadge.vue'
import HotTag from '../atoms/HotTag.vue'
import StarRating from '../atoms/StarRating.vue'
import PriceTag from '../atoms/PriceTag.vue'
import AppButton from '../atoms/AppButton.vue'
import { flyToCart } from '../../utils/flyToCart'
import { money } from '../../utils/format'
import { isKebab } from '../../utils/kebab'
import { comboFarNote, isOffer } from '../../utils/offer'

import type { Product } from '../../types'

const props = defineProps<{ product: Product }>()
const cart = useCart(), ui = useUI(), catalog = useCatalog()
const added = ref(false)
const imgBox = ref<HTMLElement | null>(null)
/** Есть в наличии (старый сервер поля не присылает — значит, есть). */
const available = computed(() => props.product.inStock !== false)
/** «За кг»: хоровац заказывают через окно шашлыка (вес, маринад, добавки), мясо — через окно выбора веса. */
const byWeight = computed(() => props.product.unit === 'kg')
const kebab = computed(() => isKebab(props.product))
/** Табличка HOT — у спецпредложения в наличии (у распроданного этот угол занимает «Առկա չէ»). */
const hot = computed(() => available.value && isOffer(props.product))
let timer: ReturnType<typeof setTimeout> | undefined
function add() {
  cart.add(props.product)
  flyToCart(imgBox.value?.querySelector('img') ?? null)
  added.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (added.value = false), 1300)
}
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <div class="pdp" :class="{ 'is-out': !available }">
    <div ref="imgBox" class="pdp__img">
      <AppBadge v-if="product.discount" class="pdp__badge">-{{ product.discount }}%</AppBadge>
      <span v-if="!available" class="pdp__out">{{ $t('stock.out') }}</span>
      <HotTag v-else-if="hot" class="pdp__hot" size="lg" />
      <ProductArt :kind="product.art" :src="product.image" :alt="product.name" full />
    </div>
    <div class="pdp__info">
      <h1>{{ product.name }}</h1>
      <template v-if="!product.bonusOnly">
        <StarRating v-if="product.reviews" :value="product.rating" :count="product.reviews" />
        <PriceTag :price="product.price" :old="product.old" :unit="product.unit" size="lg" />
        <small class="pdp__unit">{{ $t(byWeight ? 'product.perKg' : 'product.perPc') }}</small>
        <p class="pdp__desc" :class="{ muted: !product.description }">{{ product.description || $t('product.info') }}</p>
        <p v-if="product.combo" class="pdp__combo">🎁 {{ $t('combo.long') }} {{ comboFarNote(catalog.comboFar) }}</p>
        <!-- рыба, кролик: заказывают порциями, точную цену покупатель подтвердит после взвешивания -->
        <p v-if="product.weighed" class="pdp__combo">⚖️ {{ $t('weigh.perKgNote', { price: product.price.toLocaleString('en-US') }) }}</p>
      </template>
      <p v-else-if="product.price" class="muted">{{ $t('bonus.value', { price: money(product.price) }) }}</p>
      <template v-if="product.orderable">
        <p v-if="!available" class="pdp__display">⛔ {{ $t('stock.outLong') }}</p>
        <template v-else-if="byWeight && kebab">
          <AppButton size="lg" @click="ui.openKebab(String(product.id))">🍢 {{ $t('kebab.order') }}</AppButton>
          <small v-if="!product.weighed" class="pdp__unit">{{ $t('product.byWeight') }}</small>
        </template>
        <template v-else-if="byWeight">
          <AppButton size="lg" @click="ui.openMeat(product.id)">⚖️ {{ $t(product.weighed ? 'weigh.order' : 'meat.order') }}</AppButton>
          <small v-if="!product.weighed" class="pdp__unit">{{ $t('meat.hint') }}</small>
        </template>
        <AppButton v-else size="lg" :variant="added ? 'light' : 'primary'" @click="add">
          {{ added ? '✓ ' + $t('common.added') : '🛒 ' + $t('common.add') }}
        </AppButton>
      </template>
      <p v-else-if="!product.bonusPoints" class="pdp__display">👁 {{ $t('showcase.hint') }}</p>
      <div v-if="product.bonusPoints" class="pdp__bonus">
        <p>{{ $t('bonus.productHint', { n: product.bonusPoints.toLocaleString('en-US') }) }}</p>
        <!-- подарок не кладётся в корзину: на странице бонусов баллы обмениваются на код для продавца -->
        <AppButton variant="light" to="/bonus">🎁 {{ $t('bonus.getWithPoints') }}</AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* фото — не шире 460 px, описание сразу рядом: при колонках пополам между ними на широком экране была пустота */
.pdp { display:grid; grid-template-columns:minmax(0, 460px) minmax(0, 1fr); gap:clamp(20px, 4vw, 48px); align-items:center; }
.pdp > * { min-width:0; }
.pdp__img { position:relative; width:100%; max-width:460px; aspect-ratio:1; padding:clamp(22px, 4vw, 40px); border-radius:var(--r-lg); background:radial-gradient(circle at 50% 40%, #fff, var(--bg)); animation:rise .7s var(--ease) backwards; }
.pdp__img > :last-child { animation:float 8s ease-in-out infinite; filter:drop-shadow(0 18px 18px rgb(14 26 25 / .25)); }
.pdp__badge { position:absolute; top:18px; left:18px; z-index:1; }
.pdp__hot { position:absolute; top:18px; right:18px; z-index:1; }
.pdp__out { position:absolute; top:18px; right:18px; z-index:1; padding:5px 12px; border-radius:var(--pill); background:var(--dark); color:#fff; font-size:13px; font-weight:800; }
.pdp.is-out .pdp__img > :last-child { filter:grayscale(.6) drop-shadow(0 18px 18px rgb(14 26 25 / .2)); opacity:.75; }
.pdp__info { display:flex; flex-direction:column; align-items:flex-start; gap:14px; animation:rise .7s .12s var(--ease) backwards; }
h1 { margin:0; }
.pdp__unit { margin-top:-8px; color:var(--muted); font-size:13px; }
.pdp__desc { margin:0; line-height:1.6; white-space:pre-line; }
.pdp__combo { margin:0; padding:10px 14px; border-radius:var(--r-md); background:var(--cream); color:#7a5600; font-size:14px; font-weight:600; line-height:1.5; }
@media (max-width:800px) { .pdp { grid-template-columns:1fr; } .pdp__img { margin-inline:auto; } .pdp__info .btn { width:100%; } }
.pdp__bonus { display:flex; flex-direction:column; align-items:flex-start; gap:10px; width:100%; padding:14px 16px; border:1.5px solid rgb(217 151 0 / .45); border-radius:var(--r-md); background:var(--cream); }
.pdp__bonus p { margin:0; color:#7a5600; font-weight:600; }
.pdp__display { margin:0; padding:12px 14px; border:1.5px dashed var(--line); border-radius:var(--r-md); color:var(--muted); font-size:14px; }
</style>
