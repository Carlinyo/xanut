<script setup lang="ts">
// Коды подарков за баллы. Покупатель показывает код, продавец вводит его здесь, видит подарок и покупателя,
// подтверждает — и отдаёт товар. Выданный код второй раз не сработает.
import { onMounted, ref } from 'vue'
import { t } from '../../i18n'
import { api, ApiError, commonErrorKey } from '../../api'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import { useConfirm } from '../../stores/confirm'
import type { AdminRedemption } from '../../types'
import ProductArt from '../atoms/ProductArt.vue'
import AppButton from '../atoms/AppButton.vue'

const authError = useAuthRedirect(), confirm = useConfirm()
const input = ref('')
const found = ref<AdminRedemption | null>(null)
const recent = ref<AdminRedemption[]>([])
const busy = ref(false)
const error = ref('')
const note = ref('') // «подарок выдан» — зелёная подсказка

const nf = (n: number) => n.toLocaleString('en-US')
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
/** Как ввёл продавец → ABCDEFGH (без дефиса и пробелов); null — точно не код. */
const clean = (s: string) => { const c = s.toUpperCase().replace(/[\s-]/g, ''); return /^[A-Z0-9]{8}$/.test(c) ? c : null }

async function loadRecent() {
  try { recent.value = await api<AdminRedemption[]>('/admin/redemptions') } catch (e) { authError(e) }
}
onMounted(loadRecent)

function fail(e: unknown) {
  if (authError(e)) return
  const code = e instanceof ApiError ? e.code : ''
  error.value = code === 'NOT_FOUND' ? t('admin.codes.notFound')
    : code === 'ALREADY_DONE' ? t('admin.codes.alreadyDone')
    : code === 'ALREADY_CANCELLED' ? t('admin.codes.alreadyCancelled')
    : t(commonErrorKey(e))
}

async function check() {
  if (busy.value) return
  error.value = ''
  note.value = ''
  found.value = null
  const code = clean(input.value)
  if (!code) { error.value = t('admin.codes.invalid'); return }
  busy.value = true
  try { found.value = await api<AdminRedemption>(`/admin/redemptions/${code}`) } catch (e) { fail(e) } finally { busy.value = false }
}

async function close(action: 'confirm' | 'cancel') {
  const r = found.value
  if (!r || busy.value) return
  const ok = await confirm.ask(action === 'confirm'
    ? { icon: '🎁', title: t('admin.codes.confirmAsk.title'), text: t('admin.codes.confirmAsk.text', { name: r.name, customer: r.customer?.name ?? '—' }), yes: t('admin.codes.confirmAsk.yes') }
    : { icon: '🎟', title: t('admin.codes.cancelAsk.title'), text: t('admin.codes.cancelAsk.text', { n: nf(r.points) }), yes: t('admin.codes.cancelAsk.yes'), tone: 'danger' })
  if (!ok) return
  busy.value = true
  error.value = ''
  try {
    found.value = await api<AdminRedemption>(`/admin/redemptions/${r.code.replace('-', '')}/${action}`, { method: 'POST' })
    if (action === 'confirm') note.value = t('admin.codes.doneNow')
    void loadRecent()
  } catch (e) {
    fail(e)
    try { found.value = await api<AdminRedemption>(`/admin/redemptions/${r.code.replace('-', '')}`) } catch { /* покажем то, что было */ }
  } finally {
    busy.value = false
  }
}

function pick(r: AdminRedemption) {
  input.value = r.code
  found.value = r
  error.value = ''
  note.value = ''
}
</script>

<template>
  <section class="ac">
    <p class="ac__lead">{{ $t('admin.codes.lead') }}</p>

    <form class="ac__form" @submit.prevent="check">
      <label class="ac__label" for="gift-code">{{ $t('admin.codes.label') }}</label>
      <div class="ac__row">
        <input id="gift-code" v-model="input" class="ac__input" placeholder="ABCD-EFGH" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" />
        <AppButton type="submit" :disabled="busy">{{ $t('admin.codes.check') }}</AppButton>
      </div>
    </form>

    <p v-if="error" class="ac__error" role="alert">{{ error }}</p>
    <p v-if="note" class="ac__note" role="status">✓ {{ note }}</p>

    <article v-if="found" class="gift" :class="`is-${found.status}`">
      <span class="gift__art"><ProductArt :kind="found.art" :src="found.image" :alt="found.name" /></span>
      <div class="gift__body">
        <span class="gift__code">{{ found.code }}</span>
        <h3>{{ found.name }}</h3>
        <span class="gift__pts">🎁 {{ $t('bonus.points', { n: nf(found.points) }) }}</span>
        <dl class="gift__meta">
          <dt>{{ $t('admin.codes.customer') }}</dt>
          <dd>{{ found.customer ? `${found.customer.name}, ${found.customer.phone}` : '—' }}</dd>
          <dt>{{ $t('admin.codes.created') }}</dt><dd>{{ when(found.createdAt) }}</dd>
          <template v-if="found.closedAt"><dt>{{ $t('admin.codes.closed') }}</dt><dd>{{ when(found.closedAt) }}</dd></template>
        </dl>
        <span class="gift__status">{{ $t('bonus.codeStatus.' + found.status) }}</span>
        <p v-if="found.status === 'done' && !note" class="gift__warn">⚠ {{ $t('admin.codes.alreadyDone') }}</p>
        <div v-if="found.status === 'pending'" class="gift__btns">
          <AppButton size="lg" :disabled="busy" @click="close('confirm')">{{ $t('admin.codes.confirm') }}</AppButton>
          <button type="button" class="gift__link" :disabled="busy" @click="close('cancel')">{{ $t('admin.codes.cancel') }}</button>
        </div>
      </div>
    </article>

    <div class="ac__recent-head">
      <h2>{{ $t('admin.codes.recent') }}</h2>
      <button type="button" class="gift__link" @click="loadRecent">↻ {{ $t('admin.codes.refresh') }}</button>
    </div>
    <p v-if="!recent.length" class="ac__empty">{{ $t('admin.codes.empty') }}</p>
    <ul v-else class="ac__list">
      <li v-for="r in recent" :key="r.code" :class="`is-${r.status}`">
        <button type="button" class="ac__item" @click="pick(r)">
          <span class="ac__code">{{ r.code }}</span>
          <span class="ac__name">{{ r.name }}<small>{{ r.customer?.name ?? '—' }} · {{ when(r.createdAt) }}</small></span>
          <span class="ac__st">{{ $t('bonus.codeStatus.' + r.status) }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.ac__lead { max-width:70ch; margin:0 0 16px; color:var(--muted); font-size:14px; line-height:1.55; }
.ac__form { display:flex; flex-direction:column; gap:6px; max-width:480px; margin-bottom:16px; }
.ac__label { font-size:13px; font-weight:700; }
.ac__row { display:flex; gap:10px; }
.ac__input { flex:1; min-width:0; padding:12px 14px; border:1.5px solid var(--line); border-radius:var(--r-md); background:#fff; font:800 20px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing:.08em; text-transform:uppercase; }
.ac__input:focus { outline:none; border-color:var(--yellow); box-shadow:0 0 0 3px rgb(246 178 26 / .3); }
.ac__error { max-width:640px; padding:10px 14px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:14px; }
.ac__note { max-width:640px; padding:10px 14px; border-radius:var(--r-md); background:#e7f6ec; color:var(--green); font-size:14px; font-weight:700; }
.gift { display:grid; grid-template-columns:120px 1fr; gap:16px 20px; max-width:640px; margin-bottom:28px; padding:18px; border:2px solid var(--line); border-radius:var(--r-lg); background:#fff; }
.gift.is-pending { border-color:var(--yellow); background:var(--cream); }
.gift.is-done { border-color:var(--green); }
.gift.is-cancelled { opacity:.7; }
.gift__art { display:grid; place-items:center; width:120px; height:120px; padding:12px; border-radius:var(--r-md); background:radial-gradient(circle at 50% 40%, #fff, var(--cream)); }
.gift__body { display:flex; flex-direction:column; align-items:flex-start; gap:6px; min-width:0; }
.gift__body h3 { margin:0; font-size:20px; }
.gift__code { font:800 15px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing:.08em; color:var(--muted); }
.gift__pts { color:#8a5f00; font-size:17px; font-weight:800; }
.gift__meta { display:grid; grid-template-columns:auto 1fr; gap:2px 12px; margin:4px 0; font-size:14px; }
.gift__meta dt { color:var(--muted); }
.gift__meta dd { margin:0; font-weight:600; overflow-wrap:anywhere; }
.gift__status { padding:3px 10px; border-radius:var(--pill); background:var(--bg); font-size:12px; font-weight:800; text-transform:uppercase; }
.gift.is-pending .gift__status { background:var(--yellow); color:#1b1500; }
.gift.is-done .gift__status { background:var(--green); color:#fff; }
.gift__warn { margin:4px 0 0; color:var(--red); font-weight:700; }
.gift__btns { display:flex; flex-wrap:wrap; align-items:center; gap:10px 18px; margin-top:8px; }
.gift__link { padding:4px 0; border:0; background:none; color:var(--muted); font-size:13px; font-weight:600; text-decoration:underline; text-underline-offset:3px; }
.gift__link:hover { color:var(--red); }
.gift__link:disabled { opacity:.5; cursor:progress; }
.ac__recent-head { display:flex; align-items:baseline; gap:16px; margin-bottom:10px; }
.ac__recent-head h2 { margin:0; font-size:18px; }
.ac__empty { padding:24px 18px; border:1.5px dashed var(--line); border-radius:var(--r-lg); color:var(--muted); text-align:center; }
.ac__list { display:flex; flex-direction:column; gap:8px; max-width:760px; margin:0; padding:0; list-style:none; }
.ac__item { display:flex; align-items:center; gap:14px; width:100%; padding:10px 14px; border:1px solid var(--line); border-radius:var(--r-md); background:#fff; text-align:left; }
.ac__item:hover { border-color:var(--yellow); }
.ac__code { flex:none; font:800 15px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing:.06em; }
.ac__name { flex:1; min-width:0; display:flex; flex-direction:column; font-size:14px; font-weight:600; }
.ac__name small { color:var(--muted); font-weight:400; }
.ac__st { flex:none; font-size:12px; font-weight:700; color:var(--muted); }
.ac__list .is-pending .ac__st { color:#b07a00; }
.ac__list .is-done .ac__st { color:var(--green); }
.ac__list .is-cancelled { opacity:.6; }
@media (max-width:520px) {
  .gift { grid-template-columns:1fr; }
  .gift__art { width:96px; height:96px; }
  .ac__item { flex-wrap:wrap; gap:4px 12px; }
}
</style>
