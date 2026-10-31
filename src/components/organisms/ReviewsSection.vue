<script setup lang="ts">
// Отзывы покупателей на главной: средняя оценка и последние отзывы с текстом. Пока отзывов нет — секции нет.
import { onMounted, ref } from 'vue'
import { api } from '../../api'
import type { ReviewsSummary } from '../../types'
import SectionTitle from '../molecules/SectionTitle.vue'
import ReviewCard from '../molecules/ReviewCard.vue'
import StarRating from '../atoms/StarRating.vue'

const data = ref<ReviewsSummary | null>(null)
onMounted(async () => {
  try { data.value = await api<ReviewsSummary>('/reviews') } catch { /* нет связи — просто без отзывов */ }
})
</script>

<template>
  <section v-if="data && data.count" class="wrap section">
    <SectionTitle>{{ $t('reviews.title') }}</SectionTitle>
    <p class="rs__avg">
      <b>{{ data.average.toFixed(1) }}</b>
      <StarRating :value="data.average" />
      <span>{{ $t('reviews.count', { n: data.count }) }}</span>
    </p>
    <div v-if="data.reviews.length" v-reveal.stagger class="rs__list">
      <ReviewCard v-for="r in data.reviews" :key="r.createdAt + r.author" :review="r" />
    </div>
  </section>
</template>

<style scoped>
.rs__avg { display:flex; align-items:center; flex-wrap:wrap; gap:6px 12px; margin:-4px 0 16px; color:var(--muted); font-size:14px; }
.rs__avg b { color:var(--ink); font-size:28px; line-height:1; }
.rs__avg :deep(.stars) { font-size:18px; }
.rs__list { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(280px, 100%), 1fr)); gap:12px; }
@media (max-width:700px) {
  .rs__list { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; margin-inline:calc(var(--gutter) * -1); padding:2px var(--gutter) 12px; scrollbar-width:thin; }
  .rs__list > * { flex:0 0 min(82vw, 320px); scroll-snap-align:start; }
}
</style>
