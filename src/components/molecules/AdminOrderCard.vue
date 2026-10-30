<script setup lang="ts">
// Заказ в админке — как кухонный чек: номер и время доставки крупно, состав, итог и одна главная кнопка «Готово».
import { computed } from 'vue'
import { t } from '../../i18n'
import { formatSlot, money } from '../../utils/format'
import { formatPhone } from '../../utils/phone'
import type { AdminOrder, EmailResult } from '../../types'
import AppButton from '../atoms/AppButton.vue'

const props = defineProps<{ order: AdminOrder; busy?: boolean; fresh?: boolean; result?: { email?: EmailResult | null; error?: string } }>()
const emit = defineEmits<{ status: [status: string]; resend: [] }>()

const o = computed(() => props.order)
const group = computed(() => (o.value.status === 'done' ? 'done' : o.value.status === 'cancelled' ? 'cancelled' : 'active'))
const pickup = computed(() => o.value.delivery === 'pickup')
const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}, ${pad(d.getHours())}:${pad(d.getMinutes())}` }
const clock = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
const nf = (n: number) => n.toLocaleString('en-US')
const payment = computed(() => (o.value.payment === 'cash' ? t('checkout.cash') : pickup.value ? t('checkout.cardPickup') : t('checkout.card')))
const mapUrl = computed(() => (o.value.geo ? `https://maps.google.com/?q=${o.value.geo.lat},${o.value.geo.lon}` : `https://maps.google.com/?q=${encodeURIComponent(o.value.address)}`))

interface KebabOptions { marinade?: string; extras?: string[]; comment?: string }
/** Детали шашлыка для кухни: маринад, добавки, комментарий покупателя. */
function details(options: unknown): string {
  if (!options || typeof options !== 'object') return ''
  const k = options as KebabOptions
  return [k.marinade && `${t('kebab.marinade')}՝ ${k.marinade}`, k.extras?.length && `${t('kebab.extras')}՝ ${k.extras.join(', ')}`, k.comment && `«${k.comment}»`]
    .filter(Boolean).join('; ')
}

// письмо «заказ готов»: итог только что сделанного действия важнее сохранённого состояния
const mail = computed(() => {
  const r = props.result?.email
  if (r?.status === 'sent') return { tone: 'ok', text: t('admin.email.sentNow', { email: r.to ?? '' }) }
  if (r?.status === 'test') return { tone: 'warn', text: t('admin.email.test') }
  if (o.value.readyEmailAt) return { tone: 'ok', text: t('admin.email.sent', { time: stamp(o.value.readyEmailAt) }) }
  if (r?.status === 'failed' || o.value.readyEmailError) {
    const why = r?.error ?? o.value.readyEmailError
    return { tone: 'bad', text: `${t('admin.email.failed')}${why && why !== 'NO_EMAIL' ? `: ${why}` : why === 'NO_EMAIL' ? `: ${t('admin.noEmail')}` : ''}` }
  }
  return null
})
const canResend = computed(() => group.value === 'done' && !o.value.readyEmailAt && !!o.value.email)
</script>

<template>
  <article class="tk" :class="[`is-${group}`, { 'is-fresh': fresh }]" :aria-busy="busy || undefined">
    <header class="tk__head">
      <div class="tk__id">
        <b class="tk__num">№{{ o.id }}</b>
        <span class="tk__status">{{ $t('orderStatus.' + o.status) }}</span>
        <small class="tk__placed">{{ $t('admin.placed', { time: stamp(o.createdAt) }) }}</small>
      </div>
      <div v-if="o.time" class="tk__when">
        <small>{{ pickup ? $t('slots.titlePickup') : $t('slots.title') }}</small>
        <b>🕘 {{ formatSlot(o.time) }}</b>
      </div>
    </header>

    <div class="tk__who">
      <b class="tk__name">{{ o.name }}</b>
      <a class="tk__phone" :href="`tel:${o.phone}`">📞 {{ formatPhone(o.phone) }}</a>
      <a v-if="o.email" class="tk__mail" :href="`mailto:${o.email}`">✉ {{ o.email }}</a>
      <p v-if="pickup" class="tk__where">🏪 {{ $t('cart.pickup') }}</p>
      <p v-else class="tk__where">
        🚚 {{ o.address }}
        <a class="tk__map" :href="mapUrl" target="_blank" rel="noopener">{{ $t('contact.openMap') }}</a>
      </p>
    </div>

    <div class="tk__items">
      <ul>
        <li v-for="(i, n) in o.items" :key="n" :class="{ 'is-bonus': i.kind === 'bonus' }">
          <span class="tk__item">
            {{ i.kind === 'bonus' ? '🎁 ' : '' }}{{ i.name }} <span class="tk__qty">× {{ i.qty }}</span>
            <small v-if="details(i.options)" class="tk__opt">{{ details(i.options) }}</small>
          </span>
          <span class="tk__sum">{{ i.kind === 'bonus' ? $t('bonus.points', { n: nf((i.points ?? 0) * i.qty) }) : money(i.unitPrice * i.qty) }}</span>
        </li>
      </ul>
      <div v-if="!pickup" class="tk__line"><span>{{ $t('cart.delivery') }}</span><span>{{ o.deliveryFee ? money(o.deliveryFee) : $t('cart.free') }}</span></div>
      <div class="tk__line tk__total"><span>{{ $t('cart.total') }} <small>({{ payment }})</small></span><span>{{ money(o.total) }}</span></div>
      <div v-if="o.bonus && (o.bonus.earned || o.bonus.spent)" class="tk__pts">
        <span v-if="o.bonus.earned">⭐ {{ $t('admin.pointsEarned', { n: nf(o.bonus.earned) }) }}</span>
        <span v-if="o.bonus.spent">🎁 {{ $t('admin.pointsSpent', { n: nf(o.bonus.spent) }) }}</span>
      </div>
    </div>

    <footer class="tk__act">
      <template v-if="group === 'active'">
        <AppButton block size="lg" :disabled="busy" @click="emit('status', 'done')">
          {{ busy ? $t('admin.email.sending') : '✓ ' + $t('admin.ready') }}
        </AppButton>
        <small class="tk__hint">{{ o.email ? $t('admin.readyHint', { email: o.email }) : $t('admin.noEmail') }}</small>
        <button type="button" class="tk__link tk__link--danger" :disabled="busy" @click="emit('status', 'cancelled')">{{ $t('admin.cancel') }}</button>
      </template>
      <template v-else-if="group === 'done'">
        <p class="tk__done">✓ {{ $t('orderStatus.done') }}</p>
        <AppButton v-if="canResend" size="sm" variant="light" :disabled="busy" @click="emit('resend')">
          {{ busy ? $t('admin.email.sending') : '✉ ' + $t('admin.email.resend') }}
        </AppButton>
        <button type="button" class="tk__link" :disabled="busy" @click="emit('status', 'preparing')">↩ {{ $t('admin.reopen') }}</button>
      </template>
      <p v-if="mail && group !== 'cancelled'" class="tk__mailres" :class="`is-${mail.tone}`" role="status">{{ mail.text }}</p>
      <p v-if="result?.error" class="tk__mailres is-bad" role="alert">{{ result.error }}</p>
    </footer>
  </article>
</template>

<style scoped>
.tk { position:relative; display:grid; grid-template-columns:minmax(190px, 1fr) minmax(260px, 1.5fr) minmax(210px, 250px); grid-template-areas:'head head head' 'who items act';
  gap:14px 22px; padding:16px 20px 18px 26px; border:1px solid var(--line); border-radius:var(--r-lg); background:#fff; overflow:hidden; transition:box-shadow .3s, opacity .3s; }
/* полоса слева — статус: жёлтая «в процессе», зелёная «готово», серая «отменён» */
.tk::before { content:''; position:absolute; inset:0 auto 0 0; width:7px; background:var(--yellow); }
.tk.is-done::before { background:var(--green); }
.tk.is-cancelled::before { background:var(--line); }
.tk.is-cancelled { opacity:.65; }
.tk.is-fresh { box-shadow:0 0 0 3px rgb(246 178 26 / .55), 0 16px 30px -18px rgb(217 151 0 / .7); }
.tk[aria-busy] { cursor:progress; }

.tk__head { grid-area:head; display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:8px 18px; padding-bottom:12px; border-bottom:1.5px dashed var(--line); }
.tk__id { display:flex; flex-wrap:wrap; align-items:baseline; gap:4px 12px; }
.tk__num { font-size:26px; font-weight:800; line-height:1.1; font-variant-numeric:tabular-nums; letter-spacing:-.01em; }
.tk__status { padding:3px 10px; border-radius:var(--pill); background:var(--cream); color:#7a5600; font-size:12.5px; font-weight:700; }
.is-done .tk__status { background:#e6f4ea; color:var(--green); }
.is-cancelled .tk__status { background:var(--bg); color:var(--muted); }
.tk__placed { flex-basis:100%; color:var(--muted); font-size:12.5px; }
.tk__when { display:flex; flex-direction:column; align-items:flex-end; text-align:right; }
.tk__when small { color:var(--muted); font-size:12px; }
.tk__when b { font-size:20px; font-variant-numeric:tabular-nums; white-space:nowrap; }

.tk__who { grid-area:who; display:flex; flex-direction:column; align-items:flex-start; gap:4px; min-width:0; font-size:14px; }
.tk__name { font-size:16px; }
.tk__phone { font-weight:700; white-space:nowrap; }
.tk__mail { max-width:100%; overflow:hidden; color:var(--muted); text-overflow:ellipsis; white-space:nowrap; }
.tk__phone:hover, .tk__mail:hover, .tk__map:hover { color:var(--yellow-lo); }
.tk__where { margin:6px 0 0; line-height:1.45; }
.tk__map { display:inline-block; margin-left:4px; color:#8a5f00; font-size:13px; font-weight:600; text-decoration:underline; text-underline-offset:2px; }

.tk__items { grid-area:items; min-width:0; font-size:14px; }
.tk__items ul { margin:0 0 6px; padding:0; list-style:none; }
.tk__items li, .tk__line { display:flex; justify-content:space-between; gap:12px; padding:5px 0; }
.tk__items li { border-bottom:1px solid var(--bg); }
.tk__item { min-width:0; }
.tk__qty { color:var(--muted); font-weight:700; white-space:nowrap; }
.tk__opt { display:block; color:var(--muted); font-size:12.5px; line-height:1.4; }
.tk__sum { flex:none; font-variant-numeric:tabular-nums; white-space:nowrap; }
.is-bonus .tk__sum { color:#8a5f00; font-weight:700; }
.tk__line { color:var(--muted); }
.tk__total { color:var(--ink); font-size:16px; font-weight:800; }
.tk__total small { color:var(--muted); font-size:12.5px; font-weight:500; }
.tk__pts { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
.tk__pts span { padding:3px 9px; border-radius:var(--pill); background:var(--cream); color:#7a5600; font-size:12.5px; font-weight:600; }

.tk__act { grid-area:act; display:flex; flex-direction:column; align-items:stretch; gap:8px; }
.tk__hint { color:var(--muted); font-size:12.5px; line-height:1.4; overflow-wrap:anywhere; }
.tk__link { align-self:flex-start; padding:4px 0; border:0; background:none; color:var(--muted); font-size:13px; font-weight:600; text-decoration:underline; text-underline-offset:3px; }
.tk__link:hover { color:var(--ink); }
.tk__link--danger:hover { color:var(--red); }
.tk__link:disabled { opacity:.5; cursor:not-allowed; }
.tk__done { margin:0; color:var(--green); font-size:18px; font-weight:800; }
.tk__mailres { margin:0; padding:8px 10px; border-radius:var(--r-sm); font-size:12.5px; line-height:1.4; overflow-wrap:anywhere; }
.tk__mailres.is-ok { background:#e6f4ea; color:var(--green); }
.tk__mailres.is-warn { background:var(--cream); color:#7a5600; }
.tk__mailres.is-bad { background:#fdecea; color:var(--red); }

@media (max-width:980px) { .tk { grid-template-columns:minmax(180px, 1fr) minmax(240px, 1.4fr); grid-template-areas:'head head' 'who items' 'act act'; }
  .tk__act { flex-direction:row; flex-wrap:wrap; align-items:center; } .tk__act > .btn { width:auto; flex:1 1 240px; } .tk__hint { flex:1 1 200px; } .tk__mailres { flex-basis:100%; } }
@media (max-width:640px) { .tk { grid-template-columns:1fr; grid-template-areas:'head' 'who' 'items' 'act'; padding:14px 14px 16px 20px; gap:12px; }
  .tk__when { align-items:flex-start; text-align:left; } .tk__act { flex-direction:column; align-items:stretch; } .tk__act > .btn { flex:none; width:100%; }
  .tk__hint, .tk__mailres { flex:none; } }
</style>
