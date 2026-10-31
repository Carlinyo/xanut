<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useUI } from '../../stores/ui'
import ProductArt from '../atoms/ProductArt.vue'
import AppBadge from '../atoms/AppBadge.vue'
import StarRating from '../atoms/StarRating.vue'
import PriceTag from '../atoms/PriceTag.vue'
import AppButton from '../atoms/AppButton.vue'
import { flyToCart } from '../../utils/flyToCart'
import { isKebab } from '../../utils/kebab'

import type { Product } from '../../types'

const props = defineProps<{ product: Product }>()
const emit = defineEmits<{ add: [product: Product] }>()
const ui = useUI()
const added = ref(false)
const imgBox = ref<HTMLElement | null>(null)
/** Есть в наличии (старый сервер поля не присылает — значит, есть). */
const available = computed(() => props.product.inStock !== false)
/** «За кг»: хоровац — через окно шашлыка (вес, маринад, добавки), мясо — через окно выбора веса; штучный — сразу в корзину. */
const byWeight = computed(() => props.product.unit === 'kg')
const kebab = computed(() => isKebab(props.product))
let timer: ReturnType<typeof setTimeout> | undefined
function add() {
  emit('add', props.product)
  flyToCart(imgBox.value?.querySelector('img') ?? null)
  added.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (added.value = false), 1300)
}
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <article v-tilt class="card" :class="{ 'card--display': !product.orderable, 'card--out': !available }">
    <span class="card__glare" aria-hidden="true" />
    <AppBadge v-if="product.discount" class="card__badge">-{{ product.discount }}%</AppBadge>
    <span v-if="!available" class="card__out">{{ $t('stock.out') }}</span>
    <RouterLink class="card__img" :to="`/products/${product.id}`" :aria-label="product.name">
      <span ref="imgBox" class="card__imgbox">
        <ProductArt :kind="product.art" :src="product.image" :alt="product.name" />
      </span>
    </RouterLink>
    <h3 class="card__title"><RouterLink :to="`/products/${product.id}`">{{ product.name }}</RouterLink></h3>
    <PriceTag :price="product.price" :old="product.old" :unit="product.unit" />
    <RouterLink v-if="product.bonusPoints" to="/bonus" class="card__bonus">{{ $t('bonus.orPoints', { n: product.bonusPoints.toLocaleString('en-US') }) }}</RouterLink>
    <StarRating v-if="product.reviews" :value="product.rating" :count="product.reviews" />
    <template v-if="product.orderable">
      <p v-if="!available" class="card__display">⛔ {{ $t('stock.outLong') }}</p>
      <AppButton v-else-if="byWeight && kebab" block size="sm" @click="ui.openKebab(String(product.id))">🍢 {{ $t('kebab.order') }}</AppButton>
      <AppButton v-else-if="byWeight" block size="sm" @click="ui.openMeat(product.id)">⚖️ {{ $t('meat.order') }}</AppButton>
      <AppButton v-else block size="sm" :variant="added ? 'light' : 'primary'" @click="add">
        {{ added ? '✓ ' + $t('common.added') : '🛒 ' + $t('common.add') }}
      </AppButton>
    </template>
    <AppButton v-else-if="product.bonusPoints" block size="sm" variant="light" to="/bonus">🎁 {{ $t('bonus.getWithPoints') }}</AppButton>
    <p v-else class="card__display" :title="$t('showcase.hint')">👁 {{ $t('showcase.label') }}</p>
  </article>
</template>

<style scoped>
.card { position:relative; display:flex; flex-direction:column; gap:8px; padding:12px; background:#fff; border:1px solid var(--line); border-radius:var(--r-lg); transition:transform var(--t) var(--ease), box-shadow var(--t), border-color var(--t); }
.card__badge { position:absolute; top:20px; left:20px; z-index:1; }
.card__out { position:absolute; top:20px; right:20px; z-index:1; padding:3px 9px; border-radius:var(--pill); background:var(--dark); color:#fff; font-size:11.5px; font-weight:800; }
.card__img { position:relative; display:grid; place-items:center; height:clamp(104px, 12vw, 140px); padding:10px; border-radius:var(--r-md); background:radial-gradient(circle at 50% 38%, #fff, var(--bg)); overflow:hidden; }
.card__imgbox { display:block; width:88%; height:100%; transition:transform .6s var(--ease); }
.card__title { margin:4px 0 0; min-height:42px; font-size:14px; font-weight:600; line-height:1.4; }
.card__title a { transition:color .2s; }
.card__title a:hover { color:var(--yellow-lo); }
.card .btn { margin-top:auto; }
.card__bonus { align-self:flex-start; margin-top:-4px; padding:2px 8px; border-radius:var(--pill); background:var(--cream); color:#8a5f00; font-size:11.5px; font-weight:700; }
.card__bonus:hover { background:#ffeec0; }
.card__display { margin:auto 0 0; padding:9px 8px; border:1.5px dashed var(--line); border-radius:var(--r-md); color:var(--muted); font-size:12px; font-weight:600; text-align:center; }
.card--display .card__imgbox { filter:saturate(.85); }
.card--out .card__imgbox { filter:grayscale(.6); opacity:.7; }
.card { --rx:0deg; --ry:0deg; transform:perspective(900px) rotateX(var(--rx)) rotateY(var(--ry)); }
.card__glare { position:absolute; inset:0; z-index:2; border-radius:inherit; pointer-events:none; opacity:0; background:radial-gradient(circle at var(--gx, 50%) var(--gy, 0%), rgb(255 255 255 / .55), transparent 55%); mix-blend-mode:soft-light; transition:opacity .3s; }
@media (hover:hover) {
  .card:hover { transform:perspective(900px) rotateX(var(--rx)) rotateY(var(--ry)) translateY(-6px); box-shadow:0 26px 40px -22px rgb(14 26 25 / .55); border-color:var(--yellow); }
  .card:hover .card__glare { opacity:1; }
  .card:hover .card__imgbox { transform:translateZ(30px) scale(1.08) rotate(-2deg); }
  .card.is-tilting { transition:box-shadow var(--t), border-color var(--t); }
}
@media (max-width:480px) { .card { padding:8px; gap:6px; } .card__img { height:104px; } .card__title { font-size:13px; min-height:36px; } .card__badge { top:14px; left:14px; } .card__out { top:14px; right:14px; } }
@media (max-width:360px) { .card__title { font-size:12.5px; } }
</style>
