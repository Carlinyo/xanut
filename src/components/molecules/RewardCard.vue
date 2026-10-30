<script setup lang="ts">
// Бонусный товар: картинка, цена в баллах и кнопка «получить код». Что делать по клику, решает страница.
import { computed } from 'vue'
import ProductArt from '../atoms/ProductArt.vue'
import AppButton from '../atoms/AppButton.vue'
import { money } from '../../utils/format'
import type { Product } from '../../types'

const props = defineProps<{
  product: Product
  /** guest — не вошёл; lack — не хватает баллов; ok — можно обменять */
  status: 'guest' | 'lack' | 'ok'
  lack?: number
  /** идёт обмен — кнопку не нажать второй раз */
  busy?: boolean
}>()
defineEmits<{ get: [product: Product] }>()
const points = computed(() => props.product.bonusPoints ?? 0)
</script>

<template>
  <article class="rw" :class="{ 'rw--ok': status === 'ok' }">
    <RouterLink class="rw__art" :to="`/products/${product.id}`" :aria-label="product.name">
      <span class="rw__artbox"><ProductArt :kind="product.art" :src="product.image" :alt="product.name" /></span>
    </RouterLink>
    <h3 class="rw__name"><RouterLink :to="`/products/${product.id}`">{{ product.name }}</RouterLink></h3>
    <p class="rw__pts"><span aria-hidden="true">🎁</span> {{ $t('bonus.points', { n: points.toLocaleString('en-US') }) }}</p>
    <small v-if="product.price" class="rw__value">{{ $t('bonus.value', { price: money(product.price) }) }}</small>
    <AppButton v-if="status === 'ok'" block size="sm" :disabled="busy" @click="$emit('get', product)">🎟 {{ $t('bonus.get') }}</AppButton>
    <AppButton v-else-if="status === 'guest'" block size="sm" variant="light" :to="{ path: '/login', query: { redirect: '/bonus' } }">{{ $t('bonus.loginToGet') }}</AppButton>
    <p v-else class="rw__lock">🔒 {{ $t('bonus.lack', { n: (lack ?? 0).toLocaleString('en-US') }) }}</p>
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
@media (hover:hover) {
  .rw:hover { transform:translateY(-5px); box-shadow:0 22px 34px -22px rgb(14 26 25 / .5); border-color:var(--yellow); }
  .rw:hover .rw__artbox { transform:scale(1.08) rotate(-3deg); }
}
@media (max-width:480px) { .rw { padding:8px; } .rw__art { height:96px; } .rw__name { font-size:13px; min-height:36px; } .rw__pts { font-size:15px; } }
@media (max-width:360px) { .rw__pts { font-size:13.5px; } }
</style>
