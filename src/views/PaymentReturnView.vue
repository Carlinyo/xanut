<script setup lang="ts">
// Возврат со страницы оплаты AmeriaBank. Банк добавляет к адресу номер платежа (paymentID); чем закончилась оплата,
// сервер спрашивает у самого банка — адресу не верим. Не прошла — можно сразу оплатить ещё раз.
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api, ApiError, commonErrorKey } from '../api'
import { t } from '../i18n'
import { useAuth } from '../stores/auth'
import { useBonus } from '../stores/bonus'
import { goToBank, startPayment } from '../utils/payment'
import AppButton from '../components/atoms/AppButton.vue'

type State = 'checking' | 'paid' | 'failed' | 'pending' | 'cancelled' | 'unknown' | 'error'
interface ReturnResult { orderId: number; state: 'pending' | 'paid' | 'failed'; paid: boolean; cancelled: boolean }

const route = useRoute(), auth = useAuth(), bonus = useBonus()
const state = ref<State>('checking')
const orderId = ref<number | null>(null)
const error = ref('')
const busy = ref(false)

/** Параметр адреса без учёта регистра: банк пишет paymentID, но не будем зависеть от этого. */
const param = (name: string) => {
  const key = Object.keys(route.query).find((k) => k.toLowerCase() === name.toLowerCase())
  const v = key ? route.query[key] : undefined
  return typeof v === 'string' ? v : Array.isArray(v) ? String(v[0] ?? '') : ''
}
const paymentId = param('paymentID')

async function check() {
  state.value = 'checking'
  error.value = ''
  if (!paymentId) { state.value = 'unknown'; return }
  try {
    const r = await api<ReturnResult>('/payments/ameria/return', { method: 'POST', body: { paymentId }, timeout: 30_000 })
    orderId.value = r.orderId
    state.value = r.cancelled && !r.paid ? 'cancelled' : r.paid || r.state === 'paid' ? 'paid' : r.state
    if (state.value === 'paid') void bonus.load() // баллы заказа стали доступны
  } catch (e) {
    const code = e instanceof ApiError ? e.code : ''
    if (code === 'UNKNOWN_PAYMENT' || code === 'VALIDATION') state.value = 'unknown'
    else { state.value = 'error'; error.value = t(code === 'BANK_UNAVAILABLE' ? 'pay.bankUnavailable' : commonErrorKey(e)) }
  }
}
onMounted(() => { void auth.restore(); void check() })

/** Оплатить снова: новая страница оплаты банка. */
async function retry() {
  if (!orderId.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const r = await startPayment(orderId.value)
    if (r.payUrl && goToBank(r.payUrl)) return
    if (r.order.paid) state.value = 'paid' // прошлая попытка всё-таки прошла
  } catch (e) {
    const code = e instanceof ApiError ? e.code : ''
    if (e instanceof ApiError && e.status === 401) error.value = t('pay.loginToRetry')
    else error.value = t(code === 'PAYMENT_INIT_FAILED' ? 'pay.initFailed' : code === 'ORDER_CANCELLED' ? 'pay.cancelled' : commonErrorKey(e))
  } finally { busy.value = false }
}

const icon = computed(() => ({ checking: '⏳', paid: '✅', failed: '⚠️', pending: '⏳', cancelled: '⚠️', unknown: '❔', error: '⚠️' })[state.value])
</script>

<template>
  <div class="wrap page pr">
    <span class="pr__icon" aria-hidden="true">{{ icon }}</span>
    <h1>{{ $t('pay.title.' + state) }}</h1>
    <p v-if="orderId" class="pr__order">{{ $t('pay.order', { id: orderId }) }}</p>
    <p class="muted pr__text" role="status">{{ state === 'error' ? error : $t('pay.text.' + state) }}</p>
    <p v-if="error && state !== 'error'" class="pr__err" role="alert">{{ error }}</p>
    <div class="pr__actions">
      <AppButton v-if="(state === 'failed' || state === 'pending') && orderId" size="lg" :disabled="busy" @click="retry">
        💳 {{ busy ? $t('pay.opening') : $t('pay.retry') }}
      </AppButton>
      <AppButton v-if="state === 'pending' || state === 'error'" size="lg" variant="light" @click="check">🔄 {{ $t('pay.checkAgain') }}</AppButton>
      <AppButton to="/account" size="lg" :variant="state === 'paid' ? 'primary' : 'light'">{{ $t('account.mine') }}</AppButton>
    </div>
  </div>
</template>

<style scoped>
.pr { display:flex; flex-direction:column; align-items:center; gap:12px; padding-block:clamp(28px, 8vw, 72px); text-align:center; }
.pr__icon { display:grid; place-items:center; width:84px; height:84px; border-radius:50%; background:var(--cream); font-size:40px; animation:rise .6s var(--ease) backwards; }
h1 { margin:0; }
.pr__order { margin:0; font-size:18px; font-weight:800; }
.pr__text { max-width:460px; margin:0; line-height:1.55; }
.pr__err { margin:0; padding:10px 14px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:14px; }
.pr__actions { display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:8px; }
@media (prefers-reduced-motion:reduce) { .pr__icon { animation:none; } }
</style>
