<script setup lang="ts">
import { reactive, ref } from 'vue'
import { t } from '../../i18n'
import { formatSlot, money } from '../../utils/format'
import { discountLabel, markText } from '../../utils/segments'
import { useFeedback } from '../../stores/feedback'
import { useCart } from '../../stores/cart'
import { useCatalog } from '../../stores/catalog'
import { useConfirm } from '../../stores/confirm'
import { useUI } from '../../stores/ui'
import { useNow } from '../../composables/useNow'
import { api, ApiError, commonErrorKey } from '../../api'
import { awaitingPay, canPay, goToBank, paymentLabel, startPayment } from '../../utils/payment'
import { awaitingAnswer, clockOf, timeLeft } from '../../utils/weigh'
import type { Order, OrderMark, OrderReview } from '../../types'
import ReviewForm from '../molecules/ReviewForm.vue'
import StarRating from '../atoms/StarRating.vue'
import AppButton from '../atoms/AppButton.vue'

// marks — засчитан ли заказ этого месяца в группу клиента (у прошлых месяцев отметки нет)
defineProps<{ orders: Order[]; marks?: Record<number, OrderMark> }>()
const emit = defineEmits<{ reviewed: [id: number, review: OrderReview] }>()
const feedback = useFeedback(), cart = useCart(), catalog = useCatalog(), ui = useUI()
const notes = reactive<Record<number, { text: string; ok: boolean }>>({}) // итог «повторить» под каждым заказом
/** Заказ, у которого открыта форма отзыва. */
const writing = ref<number | null>(null)
const thanked = ref<number | null>(null)
function done(id: number, review: OrderReview) {
  writing.value = null
  thanked.value = id
  emit('reviewed', id, review)
}

/** Тот же заказ ещё раз: позиции — в корзину по сегодняшним ценам, корзина открывается для проверки и оформления. */
async function repeat(o: Order) {
  await catalog.load()
  if (!catalog.ready) { notes[o.id] = { text: t('state.error'), ok: false }; return }
  const { added, skipped } = cart.repeat(o)
  notes[o.id] = !added ? { text: t('account.repeatNone'), ok: false }
    : skipped.length ? { text: t('account.repeatedPartly', { names: skipped.join(', ') }), ok: true }
    : { text: t('account.repeated'), ok: true }
  if (added) ui.cartOpen = true
}

/** «Վճարել առցանց»: магазин принял заказ — платим на странице банка. Повторно (прошлая попытка не прошла, страницу банка
 *  закрыли) — сервер сначала спросит банк о прошлой попытке. */
const paying = ref<number | null>(null)
async function pay(o: Order) {
  if (paying.value) return
  paying.value = o.id
  try {
    const r = await startPayment(o.id)
    if (r.payUrl && goToBank(r.payUrl)) return
    Object.assign(o, { paid: r.order.paid, pay: r.order.pay, bonus: r.order.bonus }) // уже оплачен
    notes[o.id] = { text: t('pay.alreadyPaid'), ok: true }
  } catch (e) {
    const code = e instanceof ApiError ? e.code : ''
    const key = { PAYMENT_INIT_FAILED: 'pay.initFailed', ORDER_CANCELLED: 'pay.cancelled', NOT_ACCEPTED: 'pay.notAccepted' }[code] ?? commonErrorKey(e)
    notes[o.id] = { text: t(key), ok: false }
  } finally { if (paying.value === o.id) paying.value = null }
}

// ---------- рыба, кролик: чек взвешивания ----------
const confirm = useConfirm(), now = useNow()
/** Сколько осталось подтвердить чек («12:05»); null — время вышло (сервер отменит заказ). */
const left = (o: Order) => timeLeft(o.weigh?.expiresAt, now.value)
const answering = ref<number | null>(null)
/** Ответ сервера — заказ в новом виде; ошибка с заказом (вес поправили, время вышло) — тоже он. */
function weighFailed(o: Order, e: unknown) {
  const err = e instanceof ApiError ? e : null
  const fresh = err?.details.order as Order | undefined
  if (fresh) Object.assign(o, fresh)
  const key = ({ WEIGH_CHANGED: 'weigh.changed', WEIGH_EXPIRED: 'weigh.expired', ORDER_CANCELLED: 'pay.cancelled', WEIGH_NOT_SENT: 'weigh.notSent' } as Record<string, string>)[err?.code ?? '']
  notes[o.id] = { text: t(key ?? commonErrorKey(e)), ok: false }
}
/** Подтвердить чек: заказ принят; онлайн — сразу на страницу оплаты банка. sentAt — именно этот чек (вес могли поправить). */
async function confirmWeigh(o: Order) {
  if (answering.value) return
  answering.value = o.id
  delete notes[o.id]
  try {
    Object.assign(o, await api<Order>(`/orders/${o.id}/weigh/confirm`, { method: 'POST', body: { sentAt: o.weigh?.sentAt ?? undefined } }))
    if (canPay(o)) { answering.value = null; await pay(o) }
  } catch (e) {
    weighFailed(o, e)
  } finally { if (answering.value === o.id) answering.value = null }
}
/** Отказаться от заказа после взвешивания — с причиной (её увидит магазин). */
async function rejectWeigh(o: Order) {
  if (answering.value) return
  const reason = await confirm.askNote({
    icon: '⚠️', title: t('weigh.rejectTitle', { id: o.id }), text: t('weigh.rejectText'), yes: t('weigh.rejectYes'), tone: 'danger',
    note: { label: t('weigh.rejectLabel'), placeholder: t('weigh.rejectPlaceholder'), hint: t('weigh.rejectHint'), presets: t('weigh.rejectPresets') as string[] },
  })
  if (reason === null) return
  answering.value = o.id
  delete notes[o.id]
  try {
    Object.assign(o, await api<Order>(`/orders/${o.id}/weigh/reject`, { method: 'POST', body: reason ? { reason } : {} }))
  } catch (e) {
    weighFailed(o, e)
  } finally { if (answering.value === o.id) answering.value = null }
}
</script>

<template>
  <ul v-reveal.stagger class="orders">
    <li v-for="o in orders" :key="o.id">
      <div class="orders__top"><b>{{ new Date(o.createdAt).toLocaleString('en-GB') }}</b><span>{{ money(o.total) }}</span></div>
      <small class="orders__status">
        {{ $t('orderStatus.' + o.status) }}
        <!-- оплата: у заказов до её учёта поля нет; у отменённого не важна -->
        <span v-if="o.paid !== undefined && o.status !== 'cancelled'" class="orders__pay" :class="o.paid ? 'is-paid' : 'is-unpaid'">
          · {{ o.paid ? '✓ ' + $t('payment.paid') : '💳 ' + $t('payment.unpaid') }}
        </span>
      </small>
      <small v-if="marks?.[o.id]" class="orders__mark" :class="`is-${marks[o.id]}`">{{ markText(marks[o.id], catalog.config.segments?.rules) }}</small>
      <small v-if="!awaitingAnswer(o)">{{ o.items.map((i) => i.name + ' × ' + i.qty).join(', ') }}</small>
      <small v-if="o.delivery === 'pickup'">🏪 {{ $t('cart.pickup') }}</small>
      <small v-else>📍 {{ o.address }}</small>
      <small v-if="o.time">🕘 {{ formatSlot(o.time, o.exactTime) }}</small>
      <small>💳 {{ paymentLabel(o.payment, o.delivery) }}<template v-if="o.pay?.card"> · {{ o.pay.card }}</template></small>
      <small v-if="o.comment">💬 {{ o.comment }}</small>
      <!-- комментарий магазина: при принятии заказа или причина отмены -->
      <small v-if="o.shopNote" class="orders__shopnote" :class="{ 'is-cancelled': o.status === 'cancelled' }">
        🏪 <b>{{ $t('orderNote.shop') }}՝</b> {{ o.shopNote }}
      </small>
      <!-- рыба, кролик на развес: ждём веса → чек: подтвердить (онлайн — затем оплата) или отказаться -->
      <template v-if="o.weigh">
        <small v-if="o.status === 'new' && o.weigh.state === 'pending'" class="orders__wait">{{ $t('weigh.pending') }}</small>
        <div v-else-if="awaitingAnswer(o)" class="orders__receipt" role="group" :aria-label="$t('weigh.receiptTitle')">
          <b>{{ $t('weigh.receiptTitle') }}</b>
          <ul>
            <li v-for="(i, n) in o.items" :key="n" :class="{ 'is-weighed': i.weigh }">
              <span>{{ i.weigh ? '⚖️ ' : '' }}{{ i.name }}<template v-if="i.qty > 1"> × {{ i.qty }}</template></span>
              <span>{{ money(i.unitPrice * i.qty) }}</span>
            </li>
            <li v-if="o.discount" class="is-disc"><span>🏷 {{ discountLabel(o.segment) }}</span><span>−{{ money(o.discount) }}</span></li>
            <li v-if="o.delivery !== 'pickup'"><span>{{ $t('cart.delivery') }}</span><span>{{ o.deliveryFee ? money(o.deliveryFee) : $t('cart.free') }}</span></li>
            <li class="is-total"><span>{{ $t('cart.total') }}</span><span>{{ money(o.total) }}</span></li>
          </ul>
          <small class="orders__until" :class="{ 'is-late': !left(o) }" role="timer">
            ⏳ {{ left(o) && o.weigh.expiresAt ? $t('weigh.until', { time: clockOf(o.weigh.expiresAt), left: left(o) ?? '' }) : $t('weigh.timeUp') }}
          </small>
          <div class="orders__answer">
            <AppButton size="sm" :disabled="answering === o.id || paying === o.id || !left(o)" @click="confirmWeigh(o)">
              {{ $t(o.payment === 'online' ? 'weigh.confirmPay' : 'weigh.confirm') }}
            </AppButton>
            <AppButton size="sm" variant="light" :disabled="answering === o.id || paying === o.id" @click="rejectWeigh(o)">{{ $t('weigh.reject') }}</AppButton>
          </div>
        </div>
        <small v-else-if="o.weigh.state === 'confirmed'" class="orders__weighok">{{ $t('weigh.confirmed') }}</small>
        <small v-else-if="o.weigh.state === 'rejected'" class="orders__shopnote is-cancelled">
          ⛔ {{ $t('weigh.rejected') }}<template v-if="o.weigh.reason"> · {{ $t('weigh.reason') }}՝ {{ o.weigh.reason }}</template>
        </small>
      </template>
      <div v-if="canPay(o)" class="orders__paynow" :class="{ 'is-failed': o.pay?.state === 'failed' }">
        <small>{{ $t(o.pay?.state === 'failed' ? 'pay.failedNote' : 'pay.acceptedNote') }}</small>
        <AppButton size="sm" :disabled="paying === o.id" @click="pay(o)">💳 {{ paying === o.id ? $t('pay.opening') : $t('pay.payNow') }}</AppButton>
      </div>
      <!-- онлайн-заказ ещё не принят магазином: платить рано — кнопка появится сама (страница обновляет заказы) -->
      <small v-else-if="awaitingPay(o) && o.status === 'new'" class="orders__wait">⏳ {{ $t('pay.awaitAccept') }}</small>
      <small v-if="o.discount" class="orders__disc">🏷 {{ discountLabel(o.segment) }}՝ −{{ money(o.discount) }}</small>
      <small v-if="o.bonus && (o.bonus.earned || o.bonus.spent)" class="orders__bonus" :class="`is-${o.bonus.state}`">
        <span v-if="o.bonus.earned">⭐ {{ $t('bonus.earned', { n: o.bonus.earned.toLocaleString('en-US') }) }} {{ $t('bonus.unit') }} · {{ $t('bonus.state.' + o.bonus.state) }}</span>
        <span v-if="o.bonus.spent">🎁 {{ $t('bonus.spent', { n: o.bonus.spent.toLocaleString('en-US') }) }} {{ $t('bonus.unit') }}</span>
      </small>
      <div v-if="o.review" class="orders__review">
        <span class="orders__rtitle">{{ $t('reviews.yours') }} <StarRating :value="o.review.rating" /></span>
        <q v-if="o.review.text">{{ o.review.text }}</q>
        <small v-if="thanked === o.id" class="orders__thanks" role="status">✓ {{ $t('reviews.thanks') }}</small>
      </div>
      <template v-else-if="o.canReview">
        <ReviewForm v-if="writing === o.id" :order-id="o.id" @done="done(o.id, $event)" @cancel="writing = null" />
        <AppButton v-else class="orders__write" size="sm" variant="light" @click="writing = o.id">⭐ {{ $t('reviews.write') }}</AppButton>
      </template>
      <div class="orders__actions">
        <button type="button" class="orders__repeat" @click="repeat(o)">🔁 {{ $t('account.repeat') }}</button>
        <button type="button" class="orders__fb" @click="feedback.open({ type: 'complaint', orderId: o.id })">⚠️ {{ $t('feedback.aboutOrder') }}</button>
      </div>
      <small v-if="notes[o.id]" class="orders__note" :class="{ 'is-ok': notes[o.id].ok }" role="status">{{ notes[o.id].text }}</small>
    </li>
  </ul>
</template>

<style scoped>
.orders { display:flex; flex-direction:column; gap:12px; margin:0; padding:0; list-style:none; }
li { display:flex; flex-direction:column; gap:4px; padding:14px 16px; border:1px solid var(--line); border-radius:var(--r-lg); transition:border-color .25s, box-shadow .25s; }
li:hover { border-color:var(--yellow); box-shadow:var(--shadow-sm); }
.orders__top { display:flex; justify-content:space-between; gap:12px; }
small { color:var(--muted); overflow-wrap:anywhere; }
.orders__status { color:var(--yellow-lo); font-weight:700; }
.orders__shopnote { padding:8px 10px; border-left:3px solid var(--muted); border-radius:var(--r-sm); background:var(--bg); color:var(--ink); line-height:1.45; overflow-wrap:anywhere; white-space:pre-line; }
.orders__shopnote.is-cancelled { border-left-color:var(--red); background:#fdecea; }
/* чек взвешивания: состав с весом, итог, обратный отсчёт и ответ покупателя */
.orders__receipt { display:flex; flex-direction:column; gap:8px; padding:12px 14px; border:1.5px solid var(--yellow); border-radius:var(--r-md); background:var(--cream); }
.orders__receipt ul { margin:0; padding:0; list-style:none; font-size:13.5px; }
.orders__receipt li { display:flex; justify-content:space-between; gap:12px; padding:4px 0; border-bottom:1px dashed rgb(122 86 0 / .2); }
.orders__receipt li span:last-child { flex:none; font-variant-numeric:tabular-nums; white-space:nowrap; }
.orders__receipt li.is-weighed { font-weight:700; }
.orders__receipt li.is-disc { color:var(--green); }
.orders__receipt li.is-total { border-bottom:0; font-size:15px; font-weight:800; }
.orders__until { color:#7a5600; font-weight:700; }
.orders__until.is-late { color:var(--red); }
.orders__answer { display:flex; flex-wrap:wrap; gap:8px; }
.orders__weighok { color:var(--green); font-weight:700; }
.orders__pay.is-unpaid { color:var(--red); }
.orders__pay.is-paid { color:var(--green); }
.orders__disc { color:var(--green); font-weight:600; }
.orders__mark { align-self:flex-start; padding:2px 10px; border-radius:var(--pill); background:var(--bg); font-weight:700; }
.orders__mark.is-regular, .orders__mark.is-vip { background:#e8f5ec; color:var(--green); }
.orders__mark.is-pending { background:var(--cream); color:#8a5f00; }
.orders__actions { display:flex; flex-wrap:wrap; align-items:center; gap:8px 16px; margin-top:6px; }
.orders__repeat { padding:7px 14px; border:1.5px solid var(--yellow); border-radius:var(--pill); background:var(--cream); color:var(--ink); font-size:13px; font-weight:700; transition:background .2s, transform .2s var(--ease); }
.orders__repeat:hover { background:var(--yellow); transform:translateY(-1px); }
.orders__note { color:var(--red); font-weight:600; }
.orders__note.is-ok { color:var(--green); }
.orders__fb { padding:0; border:0; background:none; color:var(--muted); font-size:13px; font-weight:600; text-decoration:underline; text-underline-offset:2px; }
.orders__fb:hover { color:var(--red); }
.orders__bonus { display:flex; flex-wrap:wrap; gap:4px 14px; color:#8a5f00; font-weight:600; }
.orders__bonus.is-available { color:var(--green); }
.orders__bonus.is-cancelled { text-decoration:line-through; opacity:.7; }
.orders__review { display:flex; flex-direction:column; gap:4px; margin-top:6px; padding:10px 12px; border-radius:var(--r-md); background:var(--bg); font-size:14px; }
.orders__rtitle { display:flex; align-items:center; gap:8px; font-weight:600; }
.orders__review q { overflow-wrap:anywhere; white-space:pre-line; }
.orders__thanks { color:var(--green); font-weight:700; }
.orders__write { align-self:flex-start; margin-top:6px; }
/* магазин принял заказ — оплатите (жёлтый); прошлая попытка не прошла — красный */
.orders__paynow { display:flex; flex-wrap:wrap; align-items:center; gap:8px 12px; margin-top:4px; padding:10px 12px; border-radius:var(--r-md); background:var(--cream); }
.orders__paynow small { flex:1 1 200px; color:#7a5600; font-weight:600; }
.orders__paynow.is-failed { background:#fdecea; }
.orders__paynow.is-failed small { color:var(--red); }
.orders__wait { color:#7a5600; font-weight:600; }
</style>
