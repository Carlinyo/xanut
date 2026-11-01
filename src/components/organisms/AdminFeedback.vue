<script setup lang="ts">
// Жалобы и предложения с сайта: что написали, как ответить, о каком заказе; отметка «разобрано».
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { t } from '../../i18n'
import { commonErrorKey } from '../../api'
import { useAdmin } from '../../stores/admin'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import { formatPhone } from '../../utils/phone'
import type { AdminFeedback, FeedbackType } from '../../types'
import AppButton from '../atoms/AppButton.vue'

type Status = 'new' | 'done' | 'all'
const admin = useAdmin(), authError = useAuthRedirect()
const status = ref<Status>('new')
const type = ref<FeedbackType | 'all'>('all')
const loading = ref(false)
const error = ref('')
const busy = ref<Set<number>>(new Set())

async function load() {
  loading.value = true
  error.value = ''
  try { await admin.loadFeedback() } catch (e) { if (!authError(e)) error.value = t(commonErrorKey(e)) } finally { loading.value = false }
}
onMounted(load)

const ofType = computed(() => admin.feedback.filter((f) => type.value === 'all' || f.type === type.value))
const counts = computed(() => ({ new: ofType.value.filter((f) => f.status === 'new').length, done: ofType.value.filter((f) => f.status === 'done').length, all: ofType.value.length }))
const shown = computed(() => ofType.value.filter((f) => status.value === 'all' || f.status === status.value))
const statuses = computed(() => (['new', 'done', 'all'] as Status[]).map((s) => ({ value: s, label: t('admin.feedback.filter.' + s), count: counts.value[s] })))
const types = computed(() => (['all', 'complaint', 'suggestion'] as const).map((v) => ({ value: v, label: t('admin.feedback.types.' + v) })))

const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}` }

// итог действия — сообщением над списком: разобранная запись сразу уходит из «Новые»
const notice = ref<{ tone: 'ok' | 'bad'; text: string } | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | undefined
function say(tone: 'ok' | 'bad', text: string) {
  notice.value = { tone, text }
  clearTimeout(noticeTimer)
  if (tone === 'ok') noticeTimer = setTimeout(() => (notice.value = null), 6000)
}
onUnmounted(() => clearTimeout(noticeTimer))

async function setStatus(f: AdminFeedback, next: AdminFeedback['status']) {
  busy.value.add(f.id)
  try {
    await admin.setFeedbackStatus(f.id, next)
    say('ok', t(next === 'done' ? 'admin.feedback.notice.done' : 'admin.feedback.notice.reopened', { id: f.id }))
  } catch (e) {
    if (!authError(e)) say('bad', `№${f.id}: ${t(commonErrorKey(e))}`)
  } finally {
    busy.value.delete(f.id)
  }
}
</script>

<template>
  <section class="af">
    <p class="af__lead">{{ $t('admin.feedback.lead') }}</p>
    <div class="af__bar">
      <div class="af__chips" role="group" :aria-label="$t('admin.feedback.filterLabel')">
        <button
          v-for="s in statuses" :key="s.value" type="button" class="af__chip" :class="[`is-${s.value}`, { on: status === s.value }]"
          :aria-pressed="status === s.value" @click="status = s.value"
        >
          {{ s.label }} <span class="af__num">{{ s.count }}</span>
        </button>
      </div>
      <div class="af__types" role="group" :aria-label="$t('admin.feedback.typeLabel')">
        <button
          v-for="o in types" :key="o.value" type="button" class="af__type" :class="{ on: type === o.value }" :aria-pressed="type === o.value"
          @click="type = o.value"
        >
          {{ o.label }}
        </button>
      </div>
      <AppButton size="sm" variant="light" class="af__refresh" :disabled="loading" @click="load">🔄 {{ $t('admin.refresh') }}</AppButton>
    </div>

    <Transition name="nt">
      <div v-if="notice" class="af__notice" :class="`is-${notice.tone}`" role="status">
        <span>{{ notice.tone === 'ok' ? '✓' : '⚠' }} {{ notice.text }}</span>
        <button type="button" class="af__x" :aria-label="$t('common.close')" @click="notice = null">×</button>
      </div>
    </Transition>
    <p v-if="error" class="af__error" role="alert">{{ error }}</p>
    <p v-if="loading && !admin.feedbackLoaded" class="muted">{{ $t('state.loading') }}</p>
    <template v-else-if="admin.feedbackLoaded">
      <p v-if="!shown.length" class="af__empty">{{ $t('admin.feedback.empty.' + status) }}</p>
      <TransitionGroup v-else tag="div" name="tk" class="af__list">
        <article v-for="f in shown" :key="f.id" class="fbk" :class="[`is-${f.type}`, `is-${f.status}`]" :aria-busy="busy.has(f.id) || undefined">
          <header class="fbk__head">
            <span class="fbk__type">{{ f.type === 'complaint' ? '⚠️' : '💡' }} {{ $t('admin.feedback.' + f.type) }}</span>
            <b class="fbk__num">№{{ f.id }}</b>
            <small class="fbk__time">{{ stamp(f.createdAt) }}</small>
            <span v-if="f.orderId" class="fbk__order">📦 {{ $t('admin.feedback.order', { id: f.orderId }) }}</span>
            <span v-if="f.status === 'done'" class="fbk__done">✓ {{ f.doneAt ? $t('admin.feedback.doneAt', { time: stamp(f.doneAt) }) : $t('admin.feedback.filter.done') }}</span>
          </header>
          <p class="fbk__msg">{{ f.message }}</p>
          <footer class="fbk__foot">
            <div class="fbk__who">
              <b>{{ f.name || $t('admin.feedback.noName') }}</b>
              <small v-if="!f.userId" class="fbk__guest">{{ $t('admin.feedback.guest') }}</small>
              <a v-if="f.phone" :href="`tel:${f.phone}`">📞 {{ formatPhone(f.phone) }}</a>
              <a v-if="f.email" :href="`mailto:${f.email}`">✉ {{ f.email }}</a>
              <small v-if="!f.phone && !f.email" class="fbk__nocontact">{{ $t('admin.feedback.noContact') }}</small>
            </div>
            <AppButton v-if="f.status === 'new'" size="sm" :disabled="busy.has(f.id)" @click="setStatus(f, 'done')">✓ {{ $t('admin.feedback.markDone') }}</AppButton>
            <button v-else type="button" class="fbk__reopen" :disabled="busy.has(f.id)" @click="setStatus(f, 'new')">↩ {{ $t('admin.feedback.reopen') }}</button>
          </footer>
        </article>
      </TransitionGroup>
    </template>
  </section>
</template>

<style scoped>
.af__lead { max-width:75ch; margin:0 0 14px; color:var(--muted); font-size:14px; line-height:1.5; }
.af__bar { display:flex; flex-wrap:wrap; align-items:center; gap:10px 14px; margin-bottom:16px; }
.af__chips, .af__types { display:flex; flex-wrap:wrap; gap:6px; }
.af__chip { display:inline-flex; align-items:center; gap:7px; padding:8px 14px; border:1.5px solid var(--line); border-radius:var(--pill); background:#fff; font-size:14px; font-weight:600; transition:border-color .2s, background .2s; }
.af__chip:hover { border-color:var(--yellow); }
.af__chip.on { border-color:var(--dark); background:var(--dark); color:#fff; }
.af__num { min-width:22px; padding:1px 7px; border-radius:var(--pill); background:var(--bg); color:var(--ink); font-size:12px; font-weight:800; text-align:center; }
.af__chip.on .af__num { background:var(--yellow); color:#1b1500; }
.af__chip.is-new:not(.on) .af__num { background:#fdecea; color:var(--red); }
.af__type { padding:6px 12px; border:0; border-radius:var(--pill); background:none; color:var(--muted); font-size:13px; font-weight:700; }
.af__type:hover { color:var(--ink); }
.af__type.on { background:var(--cream); color:#5c4100; }
.af__refresh { margin-left:auto; }
.af__notice { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px; padding:12px 14px 12px 16px; border-radius:var(--r-md); font-size:14px; font-weight:600; line-height:1.45; }
.af__notice.is-ok { background:#e6f4ea; color:var(--green); }
.af__notice.is-bad { background:#fdecea; color:var(--red); }
.af__x { flex:none; width:28px; height:28px; margin:-4px -6px 0 0; border:0; border-radius:50%; background:none; color:inherit; font-size:20px; line-height:1; }
.af__x:hover { background:rgb(0 0 0 / .06); }
.nt-enter-active, .nt-leave-active { transition:opacity .3s, transform .3s var(--ease); }
.nt-enter-from, .nt-leave-to { opacity:0; transform:translateY(-6px); }
.af__error { padding:10px 14px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:14px; }
.af__empty { padding:28px 18px; border:1.5px dashed var(--line); border-radius:var(--r-lg); color:var(--muted); text-align:center; }
.af__list { display:flex; flex-direction:column; gap:12px; }

.fbk { position:relative; display:flex; flex-direction:column; gap:10px; padding:14px 18px 14px 24px; border:1px solid var(--line); border-radius:var(--r-lg); background:#fff; overflow:hidden; transition:opacity .3s; }
/* полоса слева — тип: красная жалоба, синяя-зелёная идея; разобранные бледнее */
.fbk::before { content:''; position:absolute; inset:0 auto 0 0; width:6px; background:var(--red); }
.fbk.is-suggestion::before { background:#2f8f83; }
.fbk.is-done { opacity:.72; }
.fbk.is-done::before { background:var(--line); }
.fbk[aria-busy] { cursor:progress; }
.fbk__head { display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; }
.fbk__type { padding:3px 10px; border-radius:var(--pill); background:#fdecea; color:var(--red); font-size:12.5px; font-weight:800; }
.is-suggestion .fbk__type { background:#e3f3f1; color:#1f6f66; }
.fbk__num { font-size:17px; font-variant-numeric:tabular-nums; }
.fbk__time { color:var(--muted); font-size:12.5px; font-variant-numeric:tabular-nums; }
.fbk__order { padding:3px 10px; border-radius:var(--pill); background:var(--cream); color:#7a5600; font-size:12.5px; font-weight:700; }
.fbk__done { margin-left:auto; color:var(--green); font-size:12.5px; font-weight:700; }
.fbk__msg { margin:0; max-width:80ch; font-size:15px; line-height:1.55; white-space:pre-wrap; overflow-wrap:anywhere; }
.fbk__foot { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px 16px; padding-top:10px; border-top:1px dashed var(--line); }
.fbk__who { display:flex; flex-wrap:wrap; align-items:center; gap:4px 14px; min-width:0; font-size:14px; overflow-wrap:anywhere; }
.fbk__who a { font-weight:600; }
.fbk__who a:hover { color:var(--yellow-lo); }
.fbk__guest { padding:2px 8px; border:1px solid var(--line); border-radius:var(--pill); color:var(--muted); font-size:12px; }
.fbk__nocontact { color:var(--muted); }
.fbk__reopen { border:0; background:none; color:var(--muted); font-size:13px; font-weight:600; text-decoration:underline; text-underline-offset:2px; }
.fbk__reopen:hover { color:var(--ink); }
.tk-move { transition:transform .45s var(--ease); }
.tk-enter-active { transition:opacity .4s, transform .4s var(--ease); }
.tk-enter-from { opacity:0; transform:translateY(-12px); }
.tk-leave-active { display:none; }
@media (max-width:700px) { .af__refresh { margin-left:0; } .fbk { padding:12px 14px 12px 20px; } .fbk__done { margin-left:0; } }
@media (max-width:480px) { .af__types { gap:2px; } .af__type { padding:6px 9px; font-size:12.5px; } }
@media (prefers-reduced-motion:reduce) { .tk-move, .tk-enter-active { transition:none; } }
</style>
