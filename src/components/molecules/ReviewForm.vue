<script setup lang="ts">
// Отзыв о полученном заказе: оценка обязательна, текст — по желанию. Один раз на заказ.
import { ref, watch } from 'vue'
import { t } from '../../i18n'
import { api, ApiError, commonErrorKey } from '../../api'
import type { OrderReview } from '../../types'
import FormField from './FormField.vue'
import StarInput from '../atoms/StarInput.vue'
import AppButton from '../atoms/AppButton.vue'

const props = defineProps<{ orderId: number }>()
const emit = defineEmits<{ done: [review: OrderReview]; cancel: [] }>()
const rating = ref(0)
const text = ref('')
const busy = ref(false)
const error = ref('')
watch(rating, () => { error.value = '' })

async function send() {
  if (busy.value) return
  if (!rating.value) { error.value = t('reviews.pickStars'); return }
  busy.value = true
  error.value = ''
  try {
    emit('done', await api<OrderReview>(`/orders/${props.orderId}/review`, { method: 'POST', body: { rating: rating.value, text: text.value.trim() } }))
  } catch (e) {
    const code = e instanceof ApiError ? e.code : ''
    error.value = code === 'ALREADY_REVIEWED' ? t('reviews.already') : code === 'NOT_RECEIVED' ? t('reviews.notReceived') : t(commonErrorKey(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="rv" novalidate @submit.prevent="send">
    <span class="rv__label">{{ $t('reviews.ratingLabel') }}</span>
    <StarInput v-model="rating" :label="$t('reviews.ratingLabel')" />
    <FormField v-model="text" as="textarea" rows="3" maxlength="1000" :label="$t('reviews.textLabel')" :placeholder="$t('reviews.textPlaceholder')" />
    <p v-if="error" class="rv__err" role="alert">{{ error }}</p>
    <div class="rv__btns">
      <AppButton type="submit" size="sm" :disabled="busy">{{ busy ? $t('common.sending') : $t('reviews.send') }}</AppButton>
      <AppButton size="sm" variant="light" :disabled="busy" @click="emit('cancel')">{{ $t('reviews.cancel') }}</AppButton>
    </div>
    <small class="rv__note">{{ $t('reviews.publicNote') }}</small>
  </form>
</template>

<style scoped>
.rv { display:flex; flex-direction:column; gap:10px; margin-top:6px; padding:14px; border:1.5px solid var(--yellow); border-radius:var(--r-md); background:var(--cream); animation:rise .35s var(--ease) backwards; }
.rv__label { font-size:14px; font-weight:600; }
.rv__err { margin:0; padding:8px 12px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:13px; }
.rv__btns { display:flex; flex-wrap:wrap; gap:8px; }
.rv__note { color:var(--muted); font-size:12px; }
</style>
