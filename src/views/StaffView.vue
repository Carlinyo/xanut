<script setup lang="ts">
// Раздел работников: только заказы. Заказы в работе — ближайшие по времени первыми, кнопка «Готово» (покупателю уходит
// письмо «заказ готов»); ниже — готовые за последние часы. Новые заказы появляются сами (раз в несколько секунд
// спрашиваем номер последнего заказа) и звучит звонок. Отменить заказ, подтвердить оплату — только в админке.
// Страница открывается без сайта вокруг (meta.bare в router.ts): ни шапки, ни подвала, каталог не грузится.
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { api, ApiError, commonErrorKey } from '../api'
import { t } from '../i18n'
import { useConfirm } from '../stores/confirm'
import { useAuthRedirect } from '../composables/useAuthRedirect'
import { useLogout } from '../composables/useLogout'
import { createTicker } from '../utils/ticker'
import { formatPhone } from '../utils/phone'
import { formatSlot, money } from '../utils/format'
import { playChime, soundSupported, unlockSound } from '../utils/sound'
import type { AdminOrder } from '../types'
import AdminOrderCard from '../components/molecules/AdminOrderCard.vue'
import AppButton from '../components/atoms/AppButton.vue'

const POLL_MS = 8_000, HIDDEN_POLL_MS = 20_000
const confirm = useConfirm(), authError = useAuthRedirect()
// шапки сайта здесь нет — выход прямо на странице; после него — снова ко входу в этот раздел
const logout = useLogout({ path: '/login', query: { redirect: '/staff' } })
const orders = ref<AdminOrder[]>([])
const lastId = ref(0)
const loaded = ref(false)
const loading = ref(false)
const error = ref('')
const offline = ref(false)
const fresh = ref<Set<number>>(new Set())
const busy = ref<Set<number>>(new Set())
const results = ref<Record<number, { error?: string }>>({})

const isActive = (o: AdminOrder) => o.status !== 'done' && o.status !== 'cancelled'
const active = computed(() => orders.value.filter(isActive).sort((a, b) => (a.time || a.createdAt).localeCompare(b.time || b.createdAt)))
const done = computed(() => orders.value.filter((o) => o.status === 'done'))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const known = new Set(orders.value.map((o) => o.id))
    const r = await api<{ orders: AdminOrder[]; lastId: number }>('/staff/orders')
    const added = loaded.value ? r.orders.filter((o) => !known.has(o.id) && isActive(o)).map((o) => o.id) : []
    // «Готово», нажатое только что, ещё в пути к серверу — заказ остаётся в готовых, а не прыгает обратно
    orders.value = r.orders.map((o) => (busy.value.has(o.id) && isActive(o) ? { ...o, status: 'done' } : o))
    lastId.value = r.lastId
    loaded.value = true
    offline.value = false
    if (added.length) { added.forEach((id) => fresh.value.add(id)); playChime() }
  } catch (e) {
    if (!authError(e)) { if (loaded.value) offline.value = true; else error.value = t(commonErrorKey(e)) }
  } finally { loading.value = false }
}
// новые заказы: короткий запрос номера последнего заказа, список — только если он изменился
async function poll() {
  if (loading.value) return
  try {
    const { lastId: id } = await api<{ lastId: number }>('/staff/orders/head')
    offline.value = false
    if (id !== lastId.value || !loaded.value) await load()
  } catch (e) {
    if (!authError(e)) offline.value = true
  }
}
const ticker = createTicker(() => void poll())
const schedule = () => ticker.start(document.visibilityState === 'visible' ? POLL_MS : HIDDEN_POLL_MS)
const onVisibility = () => { schedule(); if (document.visibilityState === 'visible') void poll() }
// звонок о новом заказе браузер разрешает только после нажатия на странице
const onGesture = () => { void unlockSound() }
onMounted(() => {
  void load()
  schedule()
  document.addEventListener('visibilitychange', onVisibility)
  if (soundSupported()) window.addEventListener('pointerdown', onGesture, { once: true, capture: true })
})
onUnmounted(() => {
  ticker.dispose()
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pointerdown', onGesture, { capture: true })
})

/** «Готово»: после подтверждения заказ сразу уходит в готовые — не ждём сервер, который сначала отправляет покупателю
 *  письмо (до ~15 с), работник уже занят следующим заказом. Не получилось — заказ возвращается в работу с причиной. */
async function ready(o: AdminOrder) {
  const ok = await confirm.ask({
    icon: '✅', title: t('admin.confirm.ready.title', { id: o.id }), yes: t('admin.confirm.ready.yes'), text: t('staff.readyText'),
    rows: [
      { label: t('confirm.order.who'), value: `${o.name}, ${formatPhone(o.phone)}` },
      ...(o.time ? [{ label: t(o.delivery === 'pickup' ? 'slots.titlePickup' : 'slots.title'), value: formatSlot(o.time, o.exactTime) }] : []),
      { label: t('cart.total'), value: money(o.total), strong: true },
    ],
  })
  if (!ok) return
  busy.value.add(o.id)
  fresh.value.delete(o.id)
  delete results.value[o.id]
  const setStatus = (status: string) => { orders.value = orders.value.map((x) => (x.id === o.id ? { ...x, status } : x)) }
  setStatus('done')
  try {
    const r = await api<{ order: AdminOrder }>(`/staff/orders/${o.id}/done`, { method: 'POST', timeout: 40_000 }) // письмо может идти до ~15 с
    orders.value = orders.value.map((x) => (x.id === o.id ? r.order : x))
  } catch (e) {
    setStatus(o.status)
    if (authError(e)) return
    const code = e instanceof ApiError ? e.code : ''
    results.value[o.id] = { error: code === 'ORDER_CANCELLED' ? t('admin.errors.cancelled') : code === 'NOT_FOUND' ? t('admin.errors.notFound') : t(commonErrorKey(e)) }
    if (code === 'ORDER_CANCELLED' || code === 'NOT_FOUND') void load()
  } finally {
    busy.value.delete(o.id)
  }
}
</script>

<template>
  <div class="wrap page staff">
    <div class="staff__head">
      <h1>🧑‍🍳 {{ $t('staff.title') }}</h1>
      <div class="staff__bar">
        <small v-if="offline" class="staff__offline" role="status">⚠ {{ $t('admin.offline') }}</small>
        <AppButton size="sm" variant="light" :disabled="loading" @click="load">🔄 {{ $t('admin.refresh') }}</AppButton>
        <AppButton size="sm" variant="light" @click="logout">🚪 {{ $t('account.logout') }}</AppButton>
      </div>
    </div>
    <p class="muted staff__intro">{{ $t('staff.intro') }}</p>
    <p v-if="error" class="staff__error" role="alert">{{ error }}</p>
    <p v-if="loading && !loaded" class="muted">{{ $t('state.loading') }}</p>
    <template v-else-if="loaded">
      <h2 class="staff__sub">{{ $t('staff.active') }} <span class="staff__num">{{ active.length }}</span></h2>
      <p v-if="!active.length" class="staff__empty">{{ $t('staff.noActive') }}</p>
      <div v-else class="staff__list">
        <AdminOrderCard
          v-for="o in active" :key="o.id" staff :order="o" :busy="busy.has(o.id)" :fresh="fresh.has(o.id)" :result="results[o.id]"
          @status="ready(o)"
        />
      </div>
      <template v-if="done.length">
        <h2 class="staff__sub">{{ $t('staff.done') }} <span class="staff__num">{{ done.length }}</span></h2>
        <div class="staff__list">
          <AdminOrderCard v-for="o in done" :key="o.id" staff :order="o" />
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.staff__head { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px 20px; }
.staff__head h1 { margin:0; }
.staff__bar { display:flex; align-items:center; gap:12px; }
.staff__offline { color:var(--red); font-weight:600; }
.staff__intro { margin:8px 0 18px; }
.staff__error { padding:10px 14px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:14px; }
.staff__sub { display:flex; align-items:center; gap:10px; margin:22px 0 12px; font-size:20px; }
.staff__num { min-width:26px; padding:2px 9px; border-radius:var(--pill); background:var(--cream); color:#7a5600; font-size:14px; text-align:center; }
.staff__empty { padding:28px 18px; border:1.5px dashed var(--line); border-radius:var(--r-lg); color:var(--muted); text-align:center; }
.staff__list { display:flex; flex-direction:column; gap:14px; }
</style>
