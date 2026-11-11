<script setup lang="ts">
// Отчёты: заказы и клиенты за неделю и за месяц — файлом Excel. Закончилась неделя — скачать её файл, затем удалить
// её закрытые заказы с сервера (чтобы база не росла): их копии остаются в сжатом архиве, и файл месяца собирается из
// всех недель одним целым. Закончился месяц — шаг 1: скачать файл, шаг 2: удалить данные месяца (оставшиеся заказы
// и архивы недель). Удаление открывается только после скачивания — это проверяет и сервер: удаляется лишь то, что
// есть в сохранённом файле в том же виде.
import { onMounted, onUnmounted, ref } from 'vue'
import { t } from '../../i18n'
import { ApiError, commonErrorKey } from '../../api'
import { useAdmin } from '../../stores/admin'
import { useConfirm } from '../../stores/confirm'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import type { ExportRow } from '../../types'
import AppButton from '../atoms/AppButton.vue'

const admin = useAdmin(), confirm = useConfirm(), authError = useAuthRedirect()
const loading = ref(false)
const error = ref('')
/** Что выполняется сейчас (одно действие за раз): период и действие. */
const busy = ref<{ id: string; action: 'download' | 'purge' } | null>(null)
const isBusy = (r: ExportRow, action: 'download' | 'purge') => busy.value?.id === r.id && busy.value.action === action

async function load() {
  loading.value = true
  error.value = ''
  try { await admin.loadExports() } catch (e) { if (!authError(e)) error.value = t(commonErrorKey(e)) } finally { loading.value = false }
}
onMounted(load)

const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}` }

// итог действия — сообщением над списком
const notice = ref<{ tone: 'ok' | 'bad'; text: string } | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | undefined
function say(tone: 'ok' | 'bad', text: string) {
  notice.value = { tone, text }
  clearTimeout(noticeTimer)
  if (tone === 'ok') noticeTimer = setTimeout(() => (notice.value = null), 8000)
}
onUnmounted(() => clearTimeout(noticeTimer))

const KNOWN = ['EXPORT_OUTDATED', 'NOT_DOWNLOADED', 'MONTH_NOT_OVER', 'WEEK_NOT_OVER']
const errorText = (e: unknown) => (e instanceof ApiError && KNOWN.includes(e.code) ? t('admin.reports.errors.' + e.code) : t(commonErrorKey(e)))

async function download(r: ExportRow) {
  if (busy.value) return
  busy.value = { id: r.id, action: 'download' }
  try {
    say('ok', t('admin.reports.notice.saved', { name: await admin.downloadExport(r.id) }))
  } catch (e) {
    if (!authError(e)) say('bad', `${r.label}: ${errorText(e)}`)
  } finally {
    busy.value = null
  }
}

/** Сколько можно удалить: закрытые заказы на сервере; у месяца — ещё и заказы в архивах его недель. */
const removable = (r: ExportRow) => r.final + (r.kind === 'month' ? r.archived : 0)
/** Период можно очистить: закончился, файл скачан и не устарел, есть что удалять. */
const canPurge = (r: ExportRow) => r.closed && !!r.downloadedAt && !r.stale && removable(r) > 0
/** Очищен: удаляли, и удалять больше нечего. */
const purgedAll = (r: ExportRow) => !!r.purgedAt && !removable(r)
function purgeHint(r: ExportRow): string {
  if (!r.closed) return t(r.kind === 'month' ? 'admin.reports.purgeLater' : 'admin.reports.purgeLaterWeek')
  if (!removable(r)) return t('admin.reports.nothingToPurge')
  if (!r.downloadedAt) return t('admin.reports.purgeLocked')
  if (r.stale) return t('admin.reports.purgeStale')
  return t('admin.reports.purgeReady', { n: removable(r) })
}

async function purge(r: ExportRow) {
  if (busy.value || !canPurge(r)) return
  const ok = await confirm.ask({
    icon: '🗑️', yes: t('admin.reports.confirm.yes'), tone: 'danger',
    title: t(r.kind === 'month' ? 'admin.reports.confirm.title' : 'admin.reports.confirm.titleWeek'),
    text: t(r.kind === 'month' ? 'admin.reports.confirm.text' : 'admin.reports.confirm.textWeek'),
    rows: [
      { label: t(r.kind === 'month' ? 'admin.reports.confirm.month' : 'admin.reports.confirm.week'), value: r.label },
      ...(r.open ? [{ label: t('admin.reports.confirm.kept'), value: t('admin.reports.confirm.count', { n: r.open }) }] : []),
      { label: t('admin.reports.confirm.deleted'), value: t('admin.reports.confirm.count', { n: removable(r) }), strong: true },
    ],
  })
  if (!ok) return
  busy.value = { id: r.id, action: 'purge' }
  try {
    const { deleted, kept } = await admin.purgeExport(r.id)
    if (kept) say('bad', t('admin.reports.notice.kept', { n: kept }))
    else say('ok', t(!deleted ? 'admin.reports.notice.nothing' : r.kind === 'month' ? 'admin.reports.notice.purged' : 'admin.reports.notice.archived', { n: deleted }))
  } catch (e) {
    if (authError(e)) return
    say('bad', `${r.label}: ${errorText(e)}`)
    void admin.loadExports().catch(() => {}) // например, файл устарел — кнопки покажут, что делать дальше
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <section class="ar">
    <p class="ar__lead">{{ $t('admin.reports.lead') }}</p>
    <div class="ar__bar">
      <AppButton size="sm" variant="light" :disabled="loading" @click="load">🔄 {{ $t('admin.refresh') }}</AppButton>
    </div>

    <Transition name="nt">
      <div v-if="notice" class="ar__notice" :class="`is-${notice.tone}`" role="status">
        <span>{{ notice.tone === 'ok' ? '✓' : '⚠' }} {{ notice.text }}</span>
        <button type="button" class="ar__x" :aria-label="$t('common.close')" @click="notice = null">×</button>
      </div>
    </Transition>
    <p v-if="error" class="ar__error" role="alert">{{ error }}</p>
    <p v-if="loading && !admin.exports" class="muted">{{ $t('state.loading') }}</p>

    <template v-else-if="admin.exports">
      <h2 class="ar__h">🗓 {{ $t('admin.reports.months') }}</h2>
      <div class="ar__months">
        <article
          v-for="m in admin.exports.months" :key="m.id" class="rep" :class="{ 'is-todo': m.todo }"
          :aria-busy="busy?.id === m.id || undefined"
        >
          <header class="rep__head">
            <h3 class="rep__title">{{ m.label }}</h3>
            <span class="rep__chip" :class="m.current ? 'is-current' : 'is-ended'">{{ $t(m.current ? 'admin.reports.current' : 'admin.reports.ended') }}</span>
            <span v-if="m.todo" class="rep__todo">● {{ $t('admin.reports.todo.' + m.todo) }}</span>
          </header>
          <p class="rep__count">
            {{ m.orders ? $t('admin.reports.orders', { n: m.orders }) : $t('admin.reports.noOrders') }}
            <small v-if="m.archived" class="rep__arch">· {{ $t('admin.reports.archived', { n: m.archived }) }}</small>
          </p>

          <ol class="rep__steps">
            <li class="rep__step" :class="{ 'is-done': m.downloadedAt && !m.stale }">
              <span class="rep__num" aria-hidden="true">{{ m.downloadedAt && !m.stale ? '✓' : '1' }}</span>
              <div class="rep__body">
                <AppButton size="sm" :variant="m.todo === 'download' ? 'primary' : 'light'" :disabled="!!busy" @click="download(m)">
                  ⬇ {{ isBusy(m, 'download') ? $t('admin.reports.downloading') : $t(m.downloadedAt ? 'admin.reports.downloadAgain' : 'admin.reports.download') }}
                </AppButton>
                <small v-if="m.stale" class="rep__warn">⚠ {{ $t('admin.reports.stale') }}</small>
                <small v-else-if="m.downloadedAt" class="rep__ok">{{ $t('admin.reports.downloaded', { time: stamp(m.downloadedAt) }) }}</small>
                <small v-else>{{ $t('admin.reports.notDownloaded') }}</small>
              </div>
            </li>
            <li class="rep__step" :class="{ 'is-done': purgedAll(m) }">
              <span class="rep__num" aria-hidden="true">{{ purgedAll(m) ? '✓' : '2' }}</span>
              <div class="rep__body">
                <button type="button" class="rep__purge" :disabled="!canPurge(m) || !!busy" @click="purge(m)">
                  🗑 {{ isBusy(m, 'purge') ? $t('admin.reports.purging') : $t('admin.reports.purge') }}
                </button>
                <small v-if="m.purgedAt" class="rep__ok">{{ $t('admin.reports.purged', { time: stamp(m.purgedAt), n: m.purged }) }}</small>
                <small v-if="!purgedAll(m)">{{ purgeHint(m) }}</small>
              </div>
            </li>
          </ol>
          <p v-if="m.closed && m.open" class="rep__open">{{ $t('admin.reports.open', { n: m.open }) }}</p>
        </article>
      </div>

      <h2 class="ar__h">📅 {{ $t('admin.reports.weeks') }}</h2>
      <ul class="ar__weeks">
        <li v-for="w in admin.exports.weeks" :key="w.id" class="wk" :class="{ 'is-todo': w.todo }" :aria-busy="busy?.id === w.id || undefined">
          <div class="wk__info">
            <b>{{ w.label }}</b>
            <small>{{ w.orders ? $t('admin.reports.orders', { n: w.orders }) : $t('admin.reports.noOrders') }}<template v-if="w.archived"> · {{ $t('admin.reports.archived', { n: w.archived }) }}</template><template v-if="w.current"> · {{ $t('admin.reports.current') }}</template></small>
          </div>
          <div class="wk__states">
            <small v-if="w.stale && w.final" class="wk__state">⚠ {{ $t('admin.reports.stale') }}</small>
            <small v-else-if="w.downloadedAt" class="wk__state is-done">✓ {{ $t('admin.reports.downloaded', { time: stamp(w.downloadedAt) }) }}</small>
            <small v-else-if="w.todo" class="wk__state">● {{ $t('admin.reports.todo.download') }}</small>
            <small v-if="w.purgedAt" class="wk__state is-done">🗑 {{ $t('admin.reports.purged', { time: stamp(w.purgedAt), n: w.purged }) }}</small>
            <small v-else-if="w.closed && w.final" class="wk__state" :class="{ 'is-hint': !canPurge(w) }">{{ purgeHint(w) }}</small>
          </div>
          <div class="wk__acts">
            <AppButton size="sm" :variant="w.todo === 'download' ? 'primary' : 'light'" :disabled="!!busy" @click="download(w)">
              ⬇ {{ isBusy(w, 'download') ? $t('admin.reports.downloading') : 'Excel' }}
            </AppButton>
            <!-- удалить заказы недели с сервера: после скачивания её файла; копии остаются в архиве для файла месяца -->
            <button v-if="w.closed && (w.final || w.purgedAt)" type="button" class="rep__purge" :disabled="!canPurge(w) || !!busy" @click="purge(w)">
              🗑 {{ isBusy(w, 'purge') ? $t('admin.reports.purging') : $t('admin.reports.purgeWeek') }}
            </button>
          </div>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.ar__lead { max-width:80ch; margin:0 0 14px; color:var(--muted); font-size:14px; line-height:1.5; }
.ar__bar { display:flex; justify-content:flex-end; margin-bottom:12px; }
.ar__h { margin:22px 0 12px; font-size:19px; }
.ar__h:first-of-type { margin-top:4px; }
.ar__notice { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px; padding:12px 14px 12px 16px; border-radius:var(--r-md); font-size:14px; font-weight:600; line-height:1.45; }
.ar__notice.is-ok { background:#e6f4ea; color:var(--green); }
.ar__notice.is-bad { background:#fdecea; color:var(--red); }
.ar__x { flex:none; width:28px; height:28px; margin:-4px -6px 0 0; border:0; border-radius:50%; background:none; color:inherit; font-size:20px; line-height:1; }
.ar__x:hover { background:rgb(0 0 0 / .06); }
.nt-enter-active, .nt-leave-active { transition:opacity .3s, transform .3s var(--ease); }
.nt-enter-from, .nt-leave-to { opacity:0; transform:translateY(-6px); }
.ar__error { padding:10px 14px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:14px; }

.ar__months { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap:14px; }
.rep { display:flex; flex-direction:column; gap:12px; padding:16px 18px; border:1px solid var(--line); border-radius:var(--r-lg); background:#fff; transition:border-color .2s, box-shadow .2s; }
/* пора что-то сделать — жёлтая рамка, как у нового заказа */
.rep.is-todo { border-color:var(--yellow); box-shadow:0 0 0 3px rgb(246 178 26 / .18); }
.rep[aria-busy] { cursor:progress; }
.rep__head { display:flex; flex-wrap:wrap; align-items:center; gap:6px 10px; }
.rep__title { margin:0; font-size:18px; }
.rep__chip { padding:3px 10px; border-radius:var(--pill); font-size:12px; font-weight:800; }
.rep__chip.is-current { background:#e3f3f1; color:#1f6f66; }
.rep__chip.is-ended { background:var(--bg); color:var(--muted); }
.rep__todo { margin-left:auto; color:#b07a00; font-size:12.5px; font-weight:800; }
.rep__count { margin:-4px 0 0; font-size:14px; font-weight:600; }
.rep__steps { display:flex; flex-direction:column; gap:12px; margin:0; padding:0; list-style:none; }
.rep__step { display:flex; align-items:flex-start; gap:10px; }
.rep__num { flex:none; display:grid; place-items:center; width:26px; height:26px; margin-top:4px; border-radius:50%; background:var(--bg); color:var(--muted); font-size:13px; font-weight:800; }
.rep__step.is-done .rep__num { background:var(--green); color:#fff; }
.rep__body { display:flex; flex-direction:column; align-items:flex-start; gap:5px; min-width:0; }
.rep__body small { color:var(--muted); font-size:12.5px; line-height:1.4; }
.rep__body .rep__ok { color:var(--green); font-weight:600; }
.rep__body .rep__warn { color:#b07a00; font-weight:600; }
.rep__purge { padding:9px 12px; border:0; border-radius:var(--r-md); background:var(--red); color:#fff; font-size:13px; font-weight:700; line-height:1.2; transition:background .2s; }
.rep__purge:hover:not(:disabled) { background:#c92a22; }
.rep__purge:disabled { background:var(--bg); color:var(--muted); cursor:not-allowed; }
.rep__open { margin:0; padding:8px 12px; border-radius:var(--r-md); background:var(--cream); color:#7a5600; font-size:12.5px; line-height:1.45; }

.ar__weeks { display:flex; flex-direction:column; gap:8px; margin:0; padding:0; list-style:none; }
.wk { display:flex; flex-wrap:wrap; align-items:center; gap:8px 16px; padding:12px 16px; border:1px solid var(--line); border-radius:var(--r-md); background:#fff; }
.wk.is-todo { border-color:var(--yellow); background:var(--cream); }
.wk[aria-busy] { cursor:progress; }
.wk__info { display:flex; flex-direction:column; gap:2px; min-width:0; margin-right:auto; }
.wk__info b { font-size:15px; font-variant-numeric:tabular-nums; }
.wk__info small { color:var(--muted); font-size:12.5px; }
.wk__states { display:flex; flex-direction:column; align-items:flex-end; gap:2px; text-align:right; }
.wk__acts { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.rep__arch { color:var(--muted); font-weight:500; }
.wk__state { color:#b07a00; font-size:12.5px; font-weight:700; }
.wk__state.is-hint { color:var(--muted); font-weight:500; }
.wk__state.is-done { color:var(--green); font-weight:600; }
@media (max-width:520px) { .rep { padding:14px; } .rep__todo { margin-left:0; } .wk { padding:12px 14px; } .wk__states { align-items:flex-start; text-align:left; width:100%; } }
@media (prefers-reduced-motion:reduce) { .nt-enter-active, .nt-leave-active { transition:none; } }
</style>
