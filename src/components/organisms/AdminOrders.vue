<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { t } from '../../i18n'
import { ApiError, commonErrorKey } from '../../api'
import { useAdmin } from '../../stores/admin'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import { useConfirm } from '../../stores/confirm'
import { formatPhone } from '../../utils/phone'
import { money } from '../../utils/format'
import { createTicker } from '../../utils/ticker'
import { playChime, soundSupported, soundUnlocked, unlockSound } from '../../utils/sound'
import type { AdminOrder, EmailResult } from '../../types'
import AdminOrderCard from '../molecules/AdminOrderCard.vue'
import AppButton from '../atoms/AppButton.vue'
import AppInput from '../atoms/AppInput.vue'

type Filter = 'active' | 'done' | 'cancelled' | 'all'
/** Как часто спрашивать о новых заказах: открытая вкладка — каждые 5 с, фоновая — каждые 15 с (один короткий запрос). */
const POLL_MS = 5_000, HIDDEN_POLL_MS = 15_000
const SOUND_KEY = 'admin-sound'

const admin = useAdmin(), authError = useAuthRedirect(), confirm = useConfirm()
const filter = ref<Filter>('active')
const query = ref('')
const loading = ref(false)
const error = ref('')
const updatedAt = ref<Date | null>(null)
const fresh = ref<Set<number>>(new Set())
const busy = ref<Set<number>>(new Set())
/** Итог последнего действия по заказу (письмо ушло / не ушло / ошибка) — показывается в его карточке. */
const results = ref<Record<number, { email?: EmailResult | null; error?: string }>>({})

const root = ref<HTMLElement | null>(null)
const groupOf = (o: AdminOrder): Filter => (o.status === 'done' ? 'done' : o.status === 'cancelled' ? 'cancelled' : 'active')
const counts = computed(() => {
  const c: Record<Filter, number> = { active: 0, done: 0, cancelled: 0, all: admin.orders.length }
  for (const o of admin.orders) c[groupOf(o)]++
  return c
})
const shown = computed(() => {
  const q = query.value.trim().toLowerCase().replace(/^№/, '')
  const digits = q.replace(/\D/g, '')
  return admin.orders.filter((o) => (filter.value === 'all' || groupOf(o) === filter.value) && (!q
    || o.name.toLowerCase().includes(q) || String(o.id) === q || (o.email ?? '').toLowerCase().includes(q)
    || (digits.length >= 3 && o.phone.replace(/\D/g, '').includes(digits))))
})
// «в процессе» — ближайшие по времени доставки первыми; остальные — новые первыми
const sorted = computed(() => (filter.value === 'active' ? [...shown.value].sort((a, b) => (a.time || a.createdAt).localeCompare(b.time || b.createdAt)) : shown.value))
const filters = computed(() => (['active', 'done', 'cancelled', 'all'] as Filter[]).map((f) => ({ value: f, label: t('admin.filter.' + f), count: counts.value[f] })))
const time = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    await admin.loadOrders()
    updatedAt.value = new Date()
  } catch (e) {
    if (!authError(e)) error.value = t(commonErrorKey(e))
  } finally {
    loading.value = false
  }
}

// Новые заказы: каждые несколько секунд спрашиваем номер последнего заказа, список — только если он изменился.
// Новый заказ подсвечивается, звучит звонок, а в фоновой вкладке число новых видно в заголовке.
const offline = ref(false)
let checking = false
async function poll() {
  if (checking || loading.value) return
  checking = true
  try {
    if (!admin.ordersLoaded) { // первая загрузка не удалась (нет связи) — пробуем снова сами
      await admin.loadOrders()
      error.value = ''
    } else {
      const ids = await admin.checkNew()
      if (ids.length) announce(ids)
    }
    updatedAt.value = new Date()
    offline.value = false
  } catch (e) {
    if (!authError(e)) offline.value = true // нет связи — спросим снова по таймеру
  } finally {
    checking = false
  }
}
function announce(ids: number[]) {
  admin.newIds = [...new Set([...admin.newIds, ...ids])]
  ids.forEach((id) => fresh.value.add(id))
  if (sound.value) playChime()
  if (document.visibilityState !== 'visible') { unseen += ids.length; badge() }
}
async function showNew() {
  filter.value = 'active'
  query.value = ''
  admin.newIds = []
  await nextTick()
  root.value?.querySelector('.is-fresh')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// «(2) 🔔 …» в заголовке вкладки, пока админка в фоне
let unseen = 0, baseTitle = ''
function badge() {
  if (!unseen) {
    if (baseTitle) document.title = baseTitle
    baseTitle = ''
    return
  }
  baseTitle ||= document.title
  document.title = `(${unseen}) 🔔 ${baseTitle}`
}

// Звук: включён по умолчанию, выбор помнит браузер. Играть звук браузер разрешает только после нажатия на странице —
// пока его не было, показываем подсказку; первое же нажатие (в любом месте) включает звук.
const soundOk = soundSupported()
const readSound = () => { try { return localStorage.getItem(SOUND_KEY) !== 'off' } catch { return true } }
const sound = ref(soundOk && readSound())
const soundLocked = ref(false)
async function tryUnlock() { soundLocked.value = sound.value && !(await unlockSound()) }
/** Включить звук и сразу дать послушать, как звучит новый заказ (нажатие разрешает звук в браузере). */
async function enableSound() {
  await tryUnlock()
  playChime()
}
async function toggleSound() {
  sound.value = !sound.value
  try { localStorage.setItem(SOUND_KEY, sound.value ? 'on' : 'off') } catch { /* выбор живёт до перезагрузки */ }
  if (sound.value) await enableSound()
  else soundLocked.value = false
}
const GESTURES = ['pointerdown', 'keydown', 'touchend'] as const
const onGesture = () => { if (sound.value && !soundUnlocked()) void tryUnlock() }
/** Было ли уже нажатие на странице (переход в админку по ссылке) — тогда звук можно включить сразу. */
const activated = () => (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true

const ticker = createTicker(() => void poll())
const schedule = () => ticker.start(document.visibilityState === 'visible' ? POLL_MS : HIDDEN_POLL_MS)
function onVisibility() {
  schedule()
  if (document.visibilityState !== 'visible') return
  unseen = 0
  badge()
  void poll()
}
const onOnline = () => void poll()
onMounted(() => {
  if (!admin.ordersLoaded) void load()
  else void poll()
  schedule()
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('online', onOnline)
  GESTURES.forEach((g) => window.addEventListener(g, onGesture, { capture: true, passive: true }))
  if (sound.value) { if (activated()) void tryUnlock(); else soundLocked.value = true }
})
onUnmounted(() => {
  ticker.dispose()
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('online', onOnline)
  GESTURES.forEach((g) => window.removeEventListener(g, onGesture, { capture: true }))
  unseen = 0
  badge()
})

const loadingMore = ref(false)
async function more() {
  loadingMore.value = true
  try { await admin.loadMore() } catch (e) { error.value = t(commonErrorKey(e)) } finally { loadingMore.value = false }
}

// Итог действия — сообщением над списком: «готовый» заказ сразу уходит из списка «в процессе»
const notice = ref<{ tone: 'ok' | 'warn' | 'bad'; text: string } | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | undefined
function say(tone: 'ok' | 'warn' | 'bad', text: string) {
  notice.value = { tone, text }
  clearTimeout(noticeTimer)
  if (tone === 'ok') noticeTimer = setTimeout(() => (notice.value = null), 8000) // ошибку не прячем, пока её не закроют
}
onUnmounted(() => clearTimeout(noticeTimer))
function report(id: number, status: string | null, email: EmailResult | null) {
  const head = status === 'done' ? t('admin.notice.done', { id }) : status === 'cancelled' ? t('admin.notice.cancelled', { id })
    : status ? t('admin.notice.reopened', { id }) : t('admin.notice.resent', { id })
  if (!email) return say('ok', head)
  if (email.status === 'sent') return say('ok', `${status ? head + ' ' : ''}${t('admin.email.sentNow', { email: email.to ?? '' })}`)
  if (email.status === 'test') return say('warn', `${head} ${t('admin.email.test')}`)
  const why = email.error === 'NO_EMAIL' ? t('admin.noEmail') : email.error ?? ''
  say('bad', `${status ? head + ' ' : ''}${t('admin.email.failed')}${why ? ': ' + why : ''}. ${t('admin.notice.failedHint')}`)
}

async function act(o: AdminOrder, status: string | null, run: () => Promise<EmailResult | null>) {
  busy.value.add(o.id)
  fresh.value.delete(o.id)
  try {
    const email = await run()
    results.value[o.id] = { email }
    report(o.id, status, email)
  } catch (e) {
    if (authError(e)) return
    const code = e instanceof ApiError ? e.code : ''
    results.value[o.id] = { error: code === 'ORDER_CANCELLED' ? t('admin.errors.cancelled') : code === 'NOT_FOUND' ? t('admin.errors.notFound') : t(commonErrorKey(e)) }
    say('bad', `№${o.id}: ${results.value[o.id].error}`)
    if (code === 'ORDER_CANCELLED') void load() // заказ отменили в другой вкладке — показываем, как есть на сервере
  } finally {
    busy.value.delete(o.id)
  }
}
/** Каждое действие с заказом — после подтверждения: «Готово» отправляет письмо, отмену не вернуть. status null — повтор письма. */
function ask(o: AdminOrder, status: string | null): Promise<boolean> {
  const rows = [
    { label: t('confirm.order.who'), value: `${o.name}, ${formatPhone(o.phone)}` },
    { label: t('cart.total'), value: money(o.total), strong: true },
  ]
  if (status === 'done') return confirm.ask({ icon: '✅', title: t('admin.confirm.ready.title', { id: o.id }), rows, yes: t('admin.confirm.ready.yes'),
    text: o.email ? t('admin.readyHint', { email: o.email }) : t('admin.noEmail') })
  if (status === 'cancelled') return confirm.ask({ icon: '⚠️', title: t('admin.confirm.cancel.title', { id: o.id }), text: t('admin.confirm.cancel.text'), rows,
    yes: t('admin.confirm.cancel.yes'), tone: 'danger' })
  if (status) return confirm.ask({ icon: '↩️', title: t('admin.confirm.reopen.title', { id: o.id }), text: t('admin.confirm.reopen.text'), yes: t('admin.confirm.reopen.yes') })
  return confirm.ask({ icon: '✉️', title: t('admin.confirm.resend.title', { id: o.id }), text: t('admin.confirm.resend.text', { email: o.email ?? '' }), yes: t('admin.confirm.resend.yes') })
}
async function setStatus(o: AdminOrder, status: string) { if (await ask(o, status)) await act(o, status, () => admin.setStatus(o.id, status)) }
async function resend(o: AdminOrder) { if (await ask(o, null)) await act(o, null, () => admin.resendEmail(o.id)) }
</script>

<template>
  <section ref="root" class="ao">
    <div class="ao__bar">
      <div class="ao__filters" role="group" :aria-label="$t('admin.filter.label')">
        <button
          v-for="f in filters" :key="f.value" type="button" class="ao__filter" :class="[`is-${f.value}`, { on: filter === f.value }]"
          :aria-pressed="filter === f.value" @click="filter = f.value"
        >
          {{ f.label }} <span class="ao__num">{{ f.count }}</span>
        </button>
      </div>
      <AppInput v-model="query" class="ao__search" type="search" :placeholder="$t('admin.search')" :aria-label="$t('admin.search')" />
      <div class="ao__refresh">
        <button
          v-if="soundOk" type="button" class="ao__sound" :class="{ off: !sound }" :aria-pressed="sound"
          :title="$t(sound ? 'admin.sound.offHint' : 'admin.sound.onHint')" @click="toggleSound"
        >
          {{ sound ? '🔔' : '🔕' }} {{ $t(sound ? 'admin.sound.on' : 'admin.sound.off') }}
        </button>
        <small v-if="offline" class="ao__offline" role="status">⚠ {{ $t('admin.offline') }}</small>
        <small v-else-if="updatedAt" class="muted">{{ $t('admin.updated', { time: time(updatedAt) }) }}</small>
        <AppButton size="sm" variant="light" :disabled="loading" :title="$t('admin.refresh')" @click="load">🔄 <span class="ao__lbl">{{ $t('admin.refresh') }}</span></AppButton>
      </div>
    </div>

    <button v-if="sound && soundLocked" type="button" class="ao__unlock" @click="enableSound">🔇 {{ $t('admin.sound.locked') }}</button>
    <div aria-live="polite">
      <button v-if="admin.newIds.length" type="button" class="ao__new" @click="showNew">
        🔔 {{ $t('admin.newOrders', { ids: admin.newIds.map((id) => '№' + id).join(', ') }) }}
      </button>
    </div>

    <Transition name="nt">
      <div v-if="notice" class="ao__notice" :class="`is-${notice.tone}`" role="status">
        <span>{{ notice.tone === 'ok' ? '✓' : '⚠' }} {{ notice.text }}</span>
        <button type="button" class="ao__x" :aria-label="$t('common.close')" @click="notice = null">×</button>
      </div>
    </Transition>
    <p v-if="error" class="ao__error" role="alert">{{ error }}</p>
    <p v-if="loading && !admin.ordersLoaded" class="muted">{{ $t('state.loading') }}</p>
    <template v-else-if="admin.ordersLoaded">
      <p v-if="!sorted.length" class="ao__empty">{{ query.trim() ? $t('admin.empty.search') : $t('admin.empty.' + filter) }}</p>
      <TransitionGroup v-else tag="div" name="tk" class="ao__list">
        <AdminOrderCard
          v-for="o in sorted" :key="o.id" :order="o" :busy="busy.has(o.id)" :fresh="fresh.has(o.id)" :result="results[o.id]"
          @status="setStatus(o, $event)" @resend="resend(o)"
        />
      </TransitionGroup>
      <div v-if="admin.nextBefore && filter !== 'active'" class="ao__more">
        <AppButton variant="light" :disabled="loadingMore" @click="more">{{ loadingMore ? $t('state.loading') : $t('admin.more') }}</AppButton>
      </div>
    </template>
  </section>
</template>

<style scoped>
.ao__bar { display:flex; flex-wrap:wrap; align-items:center; gap:10px 14px; margin-bottom:16px; }
.ao__filters { display:flex; flex-wrap:wrap; gap:6px; }
.ao__filter { display:inline-flex; align-items:center; gap:7px; padding:8px 14px; border:1.5px solid var(--line); border-radius:var(--pill); background:#fff; font-size:14px; font-weight:600; transition:border-color .2s, background .2s; }
.ao__filter:hover { border-color:var(--yellow); }
.ao__filter.on { border-color:var(--dark); background:var(--dark); color:#fff; }
.ao__num { min-width:22px; padding:1px 7px; border-radius:var(--pill); background:var(--bg); color:var(--ink); font-size:12px; font-weight:800; text-align:center; }
.ao__filter.on .ao__num { background:var(--yellow); color:#1b1500; }
.ao__filter.is-active:not(.on) .ao__num { background:var(--cream); color:#8a5f00; }
.ao__search { flex:1 1 220px; max-width:360px; padding:9px 14px; }
.ao__refresh { display:flex; align-items:center; gap:10px; margin-left:auto; }
.ao__sound { display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border:1.5px solid var(--yellow); border-radius:var(--pill); background:var(--cream); color:#5c4100; font-size:13px; font-weight:700; white-space:nowrap; transition:background .2s, border-color .2s, color .2s; }
.ao__sound.off { border-color:var(--line); background:#fff; color:var(--muted); }
.ao__sound:hover { border-color:var(--yellow-lo); }
.ao__offline { color:var(--red); font-weight:600; }
.ao__unlock { display:block; width:100%; margin-bottom:12px; padding:10px 14px; border:1.5px dashed var(--yellow-lo); border-radius:var(--r-md); background:#fff; color:#7a5600; font-size:14px; font-weight:600; text-align:left; }
.ao__unlock:hover { background:var(--cream); }
.ao__new { display:block; width:100%; margin-bottom:14px; padding:12px 16px; border:1.5px solid var(--yellow); border-radius:var(--r-md); background:var(--cream); color:#5c4100; font-size:15px; font-weight:700; text-align:left; animation:rise .5s var(--ease); }
.ao__notice { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px; padding:12px 14px 12px 16px; border-radius:var(--r-md); font-size:14px; font-weight:600; line-height:1.45; overflow-wrap:anywhere; }
.ao__notice.is-ok { background:#e6f4ea; color:var(--green); }
.ao__notice.is-warn { background:var(--cream); color:#7a5600; }
.ao__notice.is-bad { background:#fdecea; color:var(--red); }
.ao__x { flex:none; width:28px; height:28px; margin:-4px -6px 0 0; border:0; border-radius:50%; background:none; color:inherit; font-size:20px; line-height:1; }
.ao__x:hover { background:rgb(0 0 0 / .06); }
.nt-enter-active, .nt-leave-active { transition:opacity .3s, transform .3s var(--ease); }
.nt-enter-from, .nt-leave-to { opacity:0; transform:translateY(-6px); }
.ao__error { padding:10px 14px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:14px; }
.ao__empty { padding:28px 18px; border:1.5px dashed var(--line); border-radius:var(--r-lg); color:var(--muted); text-align:center; }
.ao__list { display:flex; flex-direction:column; gap:14px; }
.ao__more { display:flex; justify-content:center; margin-top:18px; }
.tk-move { transition:transform .45s var(--ease); }
.tk-enter-active { transition:opacity .4s, transform .4s var(--ease); }
.tk-enter-from { opacity:0; transform:translateY(-12px); }
.tk-leave-active { display:none; }
@media (max-width:700px) { .ao__refresh { width:100%; justify-content:space-between; margin-left:0; } .ao__search { max-width:none; } }
@media (max-width:480px) { .ao__lbl { display:none; } }
@media (prefers-reduced-motion:reduce) { .tk-move, .tk-enter-active { transition:none; } .ao__new { animation:none; } }
</style>
