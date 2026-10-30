<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { useCart } from '../../stores/cart'
import ProductArt from '../atoms/ProductArt.vue'
import AppBadge from '../atoms/AppBadge.vue'
import StarRating from '../atoms/StarRating.vue'
import PriceTag from '../atoms/PriceTag.vue'
import AppButton from '../atoms/AppButton.vue'
import { flyToCart } from '../../utils/flyToCart'
import { money } from '../../utils/format'

import type { Product } from '../../types'

const props = defineProps<{ product: Product }>()
const cart = useCart()
const added = ref(false)
const imgBox = ref<HTMLElement | null>(null)
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
  <div class="pdp">
    <div ref="imgBox" class="pdp__img">
      <AppBadge v-if="product.discount" class="pdp__badge">-{{ product.discount }}%</AppBadge>
      <ProductArt :kind="product.art" :src="product.image" :alt="product.name" />
    </div>
    <div class="pdp__info">
      <h1>{{ product.name }}</h1>
      <template v-if="!product.bonusOnly">
        <StarRating :value="product.rating" :count="product.reviews" />
        <PriceTag :price="product.price" :old="product.old" size="lg" />
        <p class="muted">{{ $t('product.info') }}</p>
      </template>
      <p v-else-if="product.price" class="muted">{{ $t('bonus.value', { price: money(product.price) }) }}</p>
      <AppButton v-if="product.orderable" size="lg" :variant="added ? 'light' : 'primary'" @click="add">
        {{ added ? '✓ ' + $t('common.added') : '🛒 ' + $t('common.add') }}
      </AppButton>
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
.pdp { display:grid; grid-template-columns:1fr 1fr; gap:clamp(20px, 4vw, 48px); align-items:center; }
.pdp > * { min-width:0; }
.pdp__img { position:relative; width:100%; max-width:460px; aspect-ratio:1; padding:clamp(22px, 4vw, 40px); border-radius:var(--r-lg); background:radial-gradient(circle at 50% 40%, #fff, var(--bg)); animation:rise .7s var(--ease) backwards; }
.pdp__img > :last-child { animation:float 8s ease-in-out infinite; filter:drop-shadow(0 18px 18px rgb(14 26 25 / .25)); }
.pdp__badge { position:absolute; top:18px; left:18px; z-index:1; }
.pdp__info { display:flex; flex-direction:column; align-items:flex-start; gap:14px; animation:rise .7s .12s var(--ease) backwards; }
h1 { margin:0; }
@media (max-width:800px) { .pdp { grid-template-columns:1fr; } .pdp__img { margin-inline:auto; } .pdp__info .btn { width:100%; } }
.pdp__bonus { display:flex; flex-direction:column; align-items:flex-start; gap:10px; width:100%; padding:14px 16px; border:1.5px solid rgb(217 151 0 / .45); border-radius:var(--r-md); background:var(--cream); }
.pdp__bonus p { margin:0; color:#7a5600; font-weight:600; }
.pdp__display { margin:0; padding:12px 14px; border:1.5px dashed var(--line); border-radius:var(--r-md); color:var(--muted); font-size:14px; }
</style>
