<script setup lang="ts">
import type { PublicReview } from '../../types'
import StarRating from '../atoms/StarRating.vue'
defineProps<{ review: PublicReview }>()
const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB')
</script>

<template>
  <article class="rc">
    <header class="rc__head">
      <span class="rc__ava" aria-hidden="true">{{ [...review.author][0] ?? '★' }}</span>
      <span class="rc__who"><b>{{ review.author }}</b><small>{{ date(review.createdAt) }}</small></span>
    </header>
    <StarRating :value="review.rating" />
    <p v-if="review.text" class="rc__text">{{ review.text }}</p>
  </article>
</template>

<style scoped>
.rc { display:flex; flex-direction:column; gap:8px; padding:16px 18px; border:1px solid var(--line); border-radius:var(--r-lg); background:#fff; }
.rc__head { display:flex; align-items:center; gap:10px; }
.rc__ava { display:grid; place-items:center; flex:none; width:38px; height:38px; border-radius:50%; background:var(--cream); color:#8a5f00; font-weight:800; }
.rc__who { display:flex; flex-direction:column; min-width:0; }
.rc__who small { color:var(--muted); font-size:12px; }
.rc__text { margin:0; font-size:14px; line-height:1.55; white-space:pre-line; overflow-wrap:anywhere; }
</style>
