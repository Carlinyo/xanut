<script setup lang="ts">
// Бонусный товар: картинка, цена в баллах и кнопка «Ստանալ». Что делать по клику, решает страница.
import { computed, onUnmounted, ref } from 'vue'
import ProductArt from '../atoms/ProductArt.vue'
import AppButton from '../atoms/AppButton.vue'
import { money } from '../../utils/format'
import { flyToCart } from '../../utils/flyToCart'
import type { Product } from '../../types'

const props = defineProps<{
  product: Product
  /** guest — не вошёл; lack — не хватает баллов; max — больше этого товара взять нельзя; ok — можно взять */
  status: 'guest' | 'lack' | 'max' | 'ok'
  lack?: number
  inCart?: number
  maxQty?: number
}>()
const emit = defineEmits<{ get: [product: Product] }>()
const art = ref<HTMLElement | null>(null)
const added = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
const points = computed(() => props.product.bonusPoints ?? 0)
function get() {
  emit('get', props.product)
  flyToCart(art.value?.querySelector('img') ?? null)
  added.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (added.value = false), 1300)
}
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <article class="rw" :class="{ 'rw--ok': status === 'ok' }">
    <span v-if="inCart" class="rw__incart">{{ $t('bonus.inCart', { n: inCart }) }}</span>
    <RouterLink class="rw__art" :to="`/products/${product.id}`" :aria-label="product.name">
      <span ref="art" class="rw__artbox"><ProductArt :kind="product.art" :src="product.image" :alt="product.name" /></span>
    </RouterLink>
    <h3 class="rw__name"><RouterLink :to="`/products/${product.id}`">{{ product.name }}</RouterLink></h3>
    <p class="rw__pts"><span aria-hidden="true">🎁</span> {{ $t('bonus.points', { n: points.toLocaleString('en-US') }) }}</p>
    <small v-if="product.price" class="rw__value">{{ $t('bonus.value', { price: money(product.price) }) }}</small>
    <AppButton v-if="status === 'ok'" block size="sm" :variant="added ? 'light' : 'primary'" @click="get">
      {{ added ? '✓ ' + $t('bonus.added') : $t('bonus.get') }}
    </AppButton>
    <AppButton v-else-if="status === 'guest'" block size="sm" variant="light" :to="{ path: '/login', query: { redirect: '/bonus' } }">{{ $t('bonus.loginToGet') }}</AppButton>
    <p v-else class="rw__lock">🔒 {{ status === 'max' ? $t('bonus.maxReached', { n: maxQty ?? 10 }) : $t('bonus.lack', { n: (lack ?? 0).toLocaleString('en-US') }) }}</p>
  </article>
</template>

<style scoped>
.rw { position:relative; display:flex; flex-direction:column; gap:6px; padding:12px; border:1px solid var(--line); border-radius:var(--r-lg); background:#fff; transition:transform var(--t) var(--ease), box-shadow var(--t), border-color var(--t); }
.rw--ok { border-color:rgb(217 151 0 / .45); }
.rw__art { display:grid; place-items:center; height:clamp(96px, 11vw, 128px); padding:10px; border-radius:var(--r-md); background:radial-gradient(circle at 50% 40%, #fff, var(--cream)); }
.rw__artbox { display:block; width:84%; height:100%; transition:transform .6s var(--ease); }
.rw__name { margin:4px 0 0; min-height:40px; font-size:14px; font-weight:600; line-height:1.4; }
.rw__name a:hover { color:var(--yellow-lo); }
.rw__pts { margin:0; color:#8a5f00; font-size:17px; font-weight:800; }
.rw__value { color:var(--muted); font-size:12px; }
.rw .btn, .rw__lock { margin-top:auto; }
.rw__lock { margin-bottom:0; padding:8px; border:1.5px dashed var(--line); border-radius:var(--r-md); color:var(--muted); font-size:12px; font-weight:600; text-align:center; }
.rw__incart { position:absolute; top:18px; right:18px; z-index:1; padding:4px 9px; border-radius:var(--pill); background:var(--yellow); color:#1b1500; font-size:11px; font-weight:800; }
@media (hover:hover) {
  .rw:hover { transform:translateY(-5px); box-shadow:0 22px 34px -22px rgb(14 26 25 / .5); border-color:var(--yellow); }
  .rw:hover .rw__artbox { transform:scale(1.08) rotate(-3deg); }
}
@media (max-width:480px) { .rw { padding:8px; } .rw__art { height:96px; } .rw__name { font-size:13px; min-height:36px; } .rw__pts { font-size:15px; } }
@media (max-width:360px) { .rw__pts { font-size:13.5px; } }
</style>
