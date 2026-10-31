<script setup lang="ts">
// Отзывы о заказах, в которых был этот товар (страница товара). Пока отзывов нет — блока нет.
import { onMounted, ref } from 'vue'
import { api } from '../../api'
import type { PublicReview } from '../../types'
import SectionTitle from '../molecules/SectionTitle.vue'
import ReviewCard from '../molecules/ReviewCard.vue'

const props = defineProps<{ productId: number }>()
const reviews = ref<PublicReview[]>([])
onMounted(async () => {
  try { reviews.value = (await api<{ reviews: PublicReview[] }>(`/products/${props.productId}/reviews`)).reviews } catch { /* без отзывов */ }
})
</script>

<template>
  <section v-if="reviews.length" class="section">
    <SectionTitle>{{ $t('reviews.productTitle') }}</SectionTitle>
    <div class="pr">
      <ReviewCard v-for="r in reviews" :key="r.createdAt + r.author" :review="r" />
    </div>
  </section>
</template>

<style scoped>
.pr { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(300px, 100%), 1fr)); gap:12px; }
</style>
