<script setup lang="ts">
// Отзывы покупателей о полученных заказах. Видны на сайте и входят в рейтинг товаров заказа;
// неуместный отзыв можно скрыть — он пропадёт с сайта и из рейтинга (и вернуть обратно).
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { t } from '../../i18n'
import { commonErrorKey } from '../../api'
import { useAdmin } from '../../stores/admin'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import { formatPhone } from '../../utils/phone'
import type { AdminReview } from '../../types'
import StarRating from '../atoms/StarRating.vue'
import AppButton from '../atoms/AppButton.vue'

type Filter = 'all' | 'visible' | 'hidden'
const admin = useAdmin(), authError = useAuthRedirect()
const loading = ref(false)
const error = ref('')
const filter = ref<Filter>('all')
const busy = ref(new Set<number>())

async function load() {
  loading.value = true
  error.value = ''
  try { await admin.loadReviews() } catch (e) { if (!authError(e)) error.value = t(commonErrorKey(e)) } finally { loading.value = false }
}
onMounted(load)

const notice = ref<{ tone: 'ok' | 'bad'; text: string } | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | undefined
function say(tone: 'ok' | 'bad', text: string) {
  notice.value = { tone, text }
  clearTimeout(noticeTimer)
  if (tone === 'ok') noticeTimer = setTimeout(() => (notice.value = null), 5000)
}
onUnmounted(() => clearTimeout(noticeTimer))

const stats = computed(() => {
  const visible = admin.reviews.filter((r) => !r.hidden)
  const average = visible.length ? visible.reduce((s, r) => s + r.rating, 0) / visible.length : 0
  return { all: admin.reviews.length, visible: visible.length, hidden: admin.reviews.length - visible.length, average }
})
const shown = computed(() => admin.reviews.filter((r) => filter.value === 'all' || (filter.value === 'hidden' ? r.hidden : !r.hidden)))
const pad = (n: number) => String(n).padStart(2, '0')
const when = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}` }

async function setHidden(r: AdminReview, hidden: boolean) {
  if (busy.value.has(r.orderId)) return
  busy.value.add(r.orderId)
  try {
    await admin.setReviewHidden(r.orderId, hidden)
    say('ok', t(hidden ? 'admin.reviews.hiddenNow' : 'admin.reviews.shownNow'))
  } catch (e) {
    if (!authError(e)) say('bad', t(commonErrorKey(e)))
  } finally {
    busy.value.delete(r.orderId)
  }
}
</script>

<template>
  <section class="rw2">
    <p class="rw2__lead">{{ $t('admin.reviews.lead') }}</p>
    <div class="rw2__bar">
      <p v-if="stats.visible" class="rw2__avg"><b>{{ stats.average.toFixed(1) }}</b> <StarRating :value="stats.average" /> <span>{{ $t('reviews.count', { n: stats.visible }) }}</span></p>
      <div class="rw2__filters" role="group" :aria-label="$t('admin.reviews.filterLabel')">
        <button
          v-for="f in (['all', 'visible', 'hidden'] as Filter[])" :key="f" type="button" class="rw2__f" :class="{ on: filter === f }" :aria-pressed="filter === f"
          @click="filter = f"
        >{{ $t('admin.reviews.filter.' + f) }} <span class="rw2__num">{{ stats[f] }}</span></button>
      </div>
      <AppButton size="sm" variant="light" class="rw2__refresh" :disabled="loading" @click="load">🔄 {{ $t('admin.refresh') }}</AppButton>
    </div>

    <Transition name="nt">
      <div v-if="notice" class="rw2__notice" :class="`is-${notice.tone}`" role="status">
        <span>{{ notice.tone === 'ok' ? '✓' : '⚠' }} {{ notice.text }}</span>
        <button type="button" class="rw2__x" :aria-label="$t('common.close')" @click="notice = null">×</button>
      </div>
    </Transition>
    <p v-if="error" class="rw2__error" role="alert">{{ error }}</p>
    <p v-if="loading && !admin.reviewsLoaded" class="muted">{{ $t('state.loading') }}</p>
    <p v-else-if="admin.reviewsLoaded && !shown.length" class="rw2__empty">{{ $t('admin.reviews.empty') }}</p>

    <ul v-else class="rw2__list">
      <li v-for="r in shown" :key="r.orderId" class="rv" :class="{ 'is-hidden': r.hidden }">
        <header class="rv__head">
          <StarRating :value="r.rating" />
          <b>{{ r.customer?.name ?? r.author }}</b>
          <small class="rv__meta">{{ $t('admin.reviews.order', { id: r.orderId }) }} · {{ when(r.createdAt) }}</small>
          <span v-if="r.hidden" class="rv__tag">{{ $t('admin.reviews.hiddenTag') }}</span>
        </header>
        <p v-if="r.text" class="rv__text">{{ r.text }}</p>
        <p v-else class="rv__none">{{ $t('admin.reviews.noText') }}</p>
        <footer class="rv__foot">
          <a v-if="r.customer?.phone" :href="`tel:${r.customer.phone}`">📞 {{ formatPhone(r.customer.phone) }}</a>
          <a v-if="r.customer?.email" :href="`mailto:${r.customer.email}`">✉ {{ r.customer.email }}</a>
          <AppButton size="sm" :variant="r.hidden ? 'primary' : 'light'" class="rv__btn" :disabled="busy.has(r.orderId)" @click="setHidden(r, !r.hidden)">
            {{ r.hidden ? '👁 ' + $t('admin.reviews.show') : '🙈 ' + $t('admin.reviews.hide') }}
          </AppButton>
        </footer>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.rw2__lead { max-width:76ch; margin:0 0 14px; color:var(--muted); font-size:14px; line-height:1.55; }
.rw2__bar { display:flex; flex-wrap:wrap; align-items:center; gap:10px 16px; margin-bottom:16px; }
.rw2__avg { display:flex; align-items:center; gap:8px; margin:0; color:var(--muted); font-size:14px; }
.rw2__avg b { color:var(--ink); font-size:24px; }
.rw2__filters { display:flex; flex-wrap:wrap; gap:6px; }
.rw2__f { display:inline-flex; align-items:center; gap:7px; padding:7px 13px; border:1.5px solid var(--line); border-radius:var(--pill); background:#fff; font-size:14px; font-weight:600; }
.rw2__f.on { border-color:var(--dark); background:var(--dark); color:#fff; }
.rw2__num { min-width:22px; padding:1px 7px; border-radius:var(--pill); background:var(--bg); color:var(--ink); font-size:12px; font-weight:800; text-align:center; }
.rw2__f.on .rw2__num { background:var(--yellow); color:#1b1500; }
.rw2__refresh { margin-left:auto; }
.rw2__notice { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px; padding:12px 14px 12px 16px; border-radius:var(--r-md); font-size:14px; font-weight:600; }
.rw2__notice.is-ok { background:#e6f4ea; color:var(--green); }
.rw2__notice.is-bad { background:#fdecea; color:var(--red); }
.rw2__x { flex:none; width:28px; height:28px; margin:-4px -6px 0 0; border:0; border-radius:50%; background:none; color:inherit; font-size:20px; line-height:1; }
.nt-enter-active, .nt-leave-active { transition:opacity .3s, transform .3s var(--ease); }
.nt-enter-from, .nt-leave-to { opacity:0; transform:translateY(-6px); }
.rw2__error { padding:10px 14px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:14px; }
.rw2__empty { padding:28px 18px; border:1.5px dashed var(--line); border-radius:var(--r-lg); color:var(--muted); text-align:center; }
.rw2__list { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(360px, 100%), 1fr)); gap:12px; margin:0; padding:0; list-style:none; }
.rv { display:flex; flex-direction:column; gap:8px; padding:14px 16px; border:1px solid var(--line); border-radius:var(--r-lg); background:#fff; }
.rv.is-hidden { background:#f6f7f6; }
.rv.is-hidden .rv__text { color:var(--muted); }
.rv__head { display:flex; flex-wrap:wrap; align-items:center; gap:4px 10px; }
.rv__meta { color:var(--muted); font-size:12.5px; }
.rv__tag { padding:1px 8px; border-radius:var(--pill); background:#eceeed; color:var(--muted); font-size:11.5px; font-weight:700; }
.rv__text { margin:0; line-height:1.55; white-space:pre-line; overflow-wrap:anywhere; }
.rv__none { margin:0; color:var(--muted); font-size:13px; font-style:italic; }
.rv__foot { display:flex; flex-wrap:wrap; align-items:center; gap:6px 14px; margin-top:auto; font-size:13px; }
.rv__foot a { color:var(--muted); overflow-wrap:anywhere; }
.rv__btn { margin-left:auto; }
@media (max-width:600px) { .rw2__refresh { margin-left:0; } .rv__btn { width:100%; margin-left:0; } }
</style>
