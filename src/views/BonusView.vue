<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { t } from '../i18n'
import { ApiError, commonErrorKey } from '../api'
import { useAuth } from '../stores/auth'
import { useBonus } from '../stores/bonus'
import { useCatalog } from '../stores/catalog'
import { useConfirm } from '../stores/confirm'
import { nextLevelText, ruleText, SEGMENT_ICON, SEGMENTS } from '../utils/segments'
import type { Perks, Product, Redemption, Segment } from '../types'
import SectionTitle from '../components/molecules/SectionTitle.vue'
import FeatureItem from '../components/molecules/FeatureItem.vue'
import RewardCard from '../components/molecules/RewardCard.vue'
import AppButton from '../components/atoms/AppButton.vue'
import ProductArt from '../components/atoms/ProductArt.vue'

const auth = useAuth(), bonus = useBonus(), catalog = useCatalog(), confirm = useConfirm()
onMounted(() => { if (auth.isAuth) void bonus.load() }) // свежий баланс при каждом открытии

const percent = computed(() => bonus.percent)
const hours = computed(() => catalog.config.bonus?.matureHours ?? 3)
const nf = (n: number) => n.toLocaleString('en-US')
const left = computed(() => bonus.available)

function statusOf(p: Product): 'guest' | 'lack' | 'out' | 'ok' {
  if (p.inStock === false) return 'out'
  if (!auth.isAuth) return 'guest'
  return (p.bonusPoints ?? 0) <= left.value ? 'ok' : 'lack'
}

// Подарок не кладётся в корзину: баллы обмениваются на код, покупатель показывает его продавцу,
// продавец вводит код в админке, подтверждает и отдаёт товар.
const busyId = ref<number | null>(null)
const busyCode = ref('')
const error = ref('')
const fresh = ref('') // только что полученный код — подсвечиваем
const codesBox = ref<HTMLElement | null>(null)

async function get(p: Product) {
  if (busyId.value !== null) return
  const ok = await confirm.ask({ icon: '🎁', title: t('bonus.redeemAsk.title'), text: t('bonus.redeemAsk.text', { name: p.name, n: nf(p.bonusPoints ?? 0) }), yes: t('bonus.redeemAsk.yes') })
  if (!ok) return
  busyId.value = p.id
  error.value = ''
  try {
    fresh.value = (await bonus.redeem(p.id)).code
    await nextTick()
    codesBox.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (e) {
    const code = e instanceof ApiError ? e.code : ''
    if (code === 'BONUS_INSUFFICIENT') {
      bonus.available = Number((e as ApiError).details.available ?? 0) // баллов меньше, чем думал сайт — показываем настоящий баланс
      error.value = t('bonus.notEnough', { available: nf(bonus.available) })
    } else if (code === 'NOT_BONUS' || code === 'OUT_OF_STOCK') {
      error.value = t('bonus.gone')
      void catalog.load(true)
    } else error.value = t(commonErrorKey(e))
  } finally {
    busyId.value = null
  }
}

async function cancel(r: Redemption) {
  const ok = await confirm.ask({ icon: '🎟', title: t('bonus.cancelAsk.title'), text: t('bonus.cancelAsk.text', { name: r.name, n: nf(r.points) }),
    yes: t('bonus.cancelAsk.yes'), no: t('bonus.cancelAsk.no'), tone: 'danger' })
  if (!ok) return
  busyCode.value = r.code
  error.value = ''
  try { await bonus.cancelRedemption(r.code) } catch (e) {
    if (e instanceof ApiError && e.code === 'ALREADY_DONE') { error.value = t('bonus.alreadyDone'); void bonus.load() }
    else error.value = t(commonErrorKey(e))
  } finally {
    busyCode.value = ''
  }
}
const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB')

// Группы клиентов: чем больше покупок — тем больше акция. Настройки — с сервера (меняются в админке).
const segments = computed(() => catalog.config.segments ?? null)
const level = computed(() => (auth.isAuth ? bonus.level : null))
const ruleOf = (s: Segment): string => ruleText(s, segments.value?.rules)
const perkList = (p: Perks): string[] => [
  p.discount > 0 && t('segments.perkLong.discount', { n: p.discount }),
  p.bonusPercent > 0 && t('segments.perkLong.bonus', { n: p.bonusPercent }),
  p.freeDelivery && t('segments.perkLong.free'),
].filter((x): x is string => !!x)
</script>

<template>
  <div class="wrap page">
    <section class="hero-b">
      <div class="hero-b__txt">
        <h1>🎁 {{ $t('bonus.title') }}</h1>
        <p>{{ $t('bonus.lead', { percent }) }}</p>
      </div>
      <div class="hero-b__card" :class="{ 'is-guest': !auth.isAuth }">
        <template v-if="auth.isAuth">
          <small>{{ $t('bonus.available') }}</small>
          <b class="hero-b__num">⭐ {{ nf(Math.max(0, bonus.available)) }}</b>
          <small v-if="bonus.pending" class="hero-b__pending">{{ $t('bonus.pending', { n: nf(bonus.pending) }) }}</small>
        </template>
        <template v-else>
          <p>{{ $t('bonus.guest') }}</p>
          <div class="hero-b__cta">
            <AppButton :to="{ path: '/login', query: { redirect: '/bonus' } }">{{ $t('auth.login') }}</AppButton>
            <AppButton variant="light" :to="{ path: '/register', query: { redirect: '/bonus' } }">{{ $t('auth.registerBtn') }}</AppButton>
          </div>
        </template>
      </div>
    </section>

    <section class="section">
      <SectionTitle>{{ $t('bonus.howTitle') }}</SectionTitle>
      <div v-reveal.stagger="'flip'" class="steps">
        <FeatureItem v-for="s in $t('bonus.steps')" :key="s.title" :icon="s.icon" :title="s.title" :text="s.text.replace('{percent}', String(percent))" />
      </div>
    </section>

    <section v-if="segments" class="section">
      <SectionTitle>{{ $t('segments.title') }}</SectionTitle>
      <p class="lvl-lead">{{ $t('segments.lead') }}</p>
      <div v-reveal.stagger class="lvls">
        <article v-for="s in SEGMENTS" :key="s" class="lvl" :class="[`is-${s}`, { 'is-mine': level?.segment === s }]">
          <span v-if="level?.segment === s" class="lvl__you">{{ $t('segments.you') }}</span>
          <h3>{{ SEGMENT_ICON[s] }} {{ $t('segments.names.' + s) }}</h3>
          <small class="lvl__rule">{{ ruleOf(s) }}</small>
          <ul v-if="perkList(segments.perks[s]).length">
            <li v-for="p in perkList(segments.perks[s])" :key="p">{{ p }}</li>
          </ul>
        </article>
      </div>
      <p v-if="level && nextLevelText(level)" class="lvl-next">⭐ {{ nextLevelText(level) }}</p>
      <p v-else-if="level?.manual" class="lvl-next">{{ $t('segments.manualNote') }}</p>
    </section>

    <section v-if="auth.isAuth && bonus.redemptions.length" ref="codesBox" class="section codes-sec">
      <SectionTitle>🎟 {{ $t('bonus.codesTitle') }}</SectionTitle>
      <p class="lvl-lead">{{ $t('bonus.codesLead') }}</p>
      <ul class="codes">
        <li v-for="r in bonus.redemptions" :key="r.code" class="code" :class="[`is-${r.status}`, { 'is-fresh': r.code === fresh }]">
          <span class="code__art"><ProductArt :kind="r.art" :src="r.image" :alt="r.name" /></span>
          <div class="code__main">
            <b>{{ r.name }}</b>
            <small>{{ date(r.createdAt) }} · {{ $t('bonus.points', { n: nf(r.points) }) }} · {{ $t('bonus.codeStatus.' + r.status) }}</small>
          </div>
          <span class="code__val">{{ r.code }}</span>
          <button v-if="r.status === 'pending'" type="button" class="code__cancel" :disabled="busyCode === r.code" @click="cancel(r)">{{ $t('bonus.cancelCode') }}</button>
        </li>
      </ul>
    </section>

    <section class="section">
      <SectionTitle>{{ $t('bonus.rewardsTitle') }}</SectionTitle>
      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <p v-if="!bonus.rewards.length" class="muted">{{ $t('bonus.rewardsEmpty') }}</p>
      <div v-else v-reveal.stagger class="rewards">
        <RewardCard
          v-for="p in bonus.rewards" :key="p.id" :product="p" :status="statusOf(p)" :lack="(p.bonusPoints ?? 0) - left"
          :busy="busyId === p.id" @get="get"
        />
      </div>
    </section>

    <section v-if="auth.isAuth" class="section">
      <SectionTitle>{{ $t('bonus.historyTitle') }}</SectionTitle>
      <p v-if="!bonus.history.length" class="muted">{{ $t('bonus.historyEmpty') }}</p>
      <ul v-else class="hist">
        <li v-for="h in bonus.history" :key="h.orderId" :class="`is-${h.state}`">
          <div class="hist__main">
            <b>{{ $t('bonus.order', { id: h.orderId }) }}</b>
            <small>{{ date(h.createdAt) }} · {{ $t('bonus.state.' + h.state) }}</small>
          </div>
          <span v-if="h.earned" class="hist__plus">{{ $t('bonus.earned', { n: nf(h.earned) }) }}</span>
          <span v-if="h.spent" class="hist__minus">{{ $t('bonus.spent', { n: nf(h.spent) }) }}</span>
        </li>
      </ul>
    </section>

    <section class="section rules">
      <h2>{{ $t('bonus.rulesTitle') }}</h2>
      <ul>
        <li v-for="r in $t('bonus.rules')" :key="r">{{ r.replace('{hours}', String(hours)) }}</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.hero-b { position:relative; display:grid; grid-template-columns:1.4fr 1fr; gap:clamp(16px, 3vw, 32px); align-items:center; padding:clamp(20px, 4vw, 40px); border-radius:var(--r-lg); color:#fff; overflow:hidden;
  background:radial-gradient(420px 260px at 85% 40%, rgb(246 178 26 / .32), transparent 70%), linear-gradient(110deg, rgb(14 26 25 / .96) 35%, rgb(26 18 12 / .7)), url(/img/bg/coals.webp) center / cover, var(--dark);
  animation:rise .7s var(--ease) backwards; }
.hero-b h1 { margin:0 0 10px; font-size:clamp(26px, 4vw, 40px); }
.hero-b p { margin:0; color:#d5dfdc; font-size:clamp(14px, 1.6vw, 17px); line-height:1.55; }
.hero-b__card { display:flex; flex-direction:column; gap:6px; padding:clamp(16px, 2.4vw, 24px); border:1px solid rgb(246 178 26 / .45); border-radius:var(--r-lg); background:rgb(255 255 255 / .06); backdrop-filter:blur(6px); }
.hero-b__card small { color:#cbd6d3; }
.hero-b__num { font-size:clamp(34px, 5vw, 52px); line-height:1.1; color:var(--yellow); text-shadow:0 0 24px rgb(246 178 26 / .35); }
.hero-b__pending { color:#ffe2a0 !important; }
.hero-b__cta { display:flex; flex-wrap:wrap; gap:10px; margin-top:6px; }
.steps { display:grid; grid-template-columns:repeat(3, 1fr); border-radius:var(--r-lg); background:var(--bg); }
.steps > :not(:first-child) { border-left:1px solid var(--line); }
.lvl-lead { max-width:70ch; margin:-6px 0 16px; color:var(--muted); font-size:15px; line-height:1.55; }
.lvls { display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; }
.lvl { position:relative; display:flex; flex-direction:column; gap:6px; padding:18px 18px 16px; border:1.5px solid var(--line); border-radius:var(--r-lg); background:#fff; }
.lvl h3 { margin:0; font-size:18px; }
.lvl__rule { color:var(--muted); font-size:13px; }
.lvl ul { margin:6px 0 0; padding:0; list-style:none; display:flex; flex-direction:column; gap:5px; font-size:14px; font-weight:600; }
.lvl li::before { content:'✓ '; color:var(--green); }
.lvl.is-regular { background:linear-gradient(160deg, #fff, #fff4ea); }
.lvl.is-vip { border-color:var(--dark); background:radial-gradient(240px 140px at 90% 10%, rgb(246 178 26 / .28), transparent 70%), var(--dark); color:#fff; }
.lvl.is-vip .lvl__rule { color:#cbd6d3; }
.lvl.is-vip li::before { color:var(--yellow); }
.lvl.is-mine { border-color:var(--yellow); box-shadow:0 0 0 3px rgb(246 178 26 / .35); }
.lvl__you { position:absolute; top:-11px; right:14px; padding:3px 10px; border-radius:var(--pill); background:var(--yellow); color:#1b1500; font-size:12px; font-weight:800; }
.lvl-next { margin:14px 0 0; padding:10px 14px; border-radius:var(--r-md); background:var(--cream); color:#7a5600; font-size:14px; font-weight:600; }
.err { padding:10px 14px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:14px; }
.codes-sec { scroll-margin-top:120px; }
.codes { display:flex; flex-direction:column; gap:10px; margin:0; padding:0; list-style:none; }
.code { display:flex; align-items:center; gap:12px 14px; padding:12px 16px; border:1.5px solid var(--line); border-radius:var(--r-lg); background:#fff; transition:border-color .3s, box-shadow .3s; }
.code.is-pending { border-color:rgb(217 151 0 / .45); background:var(--cream); }
.code.is-fresh { border-color:var(--yellow); box-shadow:0 0 0 3px rgb(246 178 26 / .35); }
.code.is-done, .code.is-cancelled { opacity:.65; }
.code.is-cancelled .code__val { text-decoration:line-through; }
.code__art { flex:none; display:grid; place-items:center; width:52px; height:52px; padding:6px; border-radius:var(--r-md); background:#fff; }
.code__main { flex:1; min-width:0; display:flex; flex-direction:column; }
.code__main small { color:var(--muted); }
.code__val { flex:none; padding:6px 12px; border:1.5px dashed #b07a00; border-radius:var(--r-md); background:#fff; color:#1b1500; font:800 clamp(17px, 2.4vw, 22px)/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing:.08em; user-select:all; }
.code__cancel { flex:none; padding:4px 0; border:0; background:none; color:var(--muted); font-size:13px; font-weight:600; text-decoration:underline; text-underline-offset:3px; }
.code__cancel:hover { color:var(--red); }
.code__cancel:disabled { opacity:.5; cursor:progress; }
@media (max-width:560px) { .code { flex-wrap:wrap; } .code__val { order:3; } .code__cancel { order:4; margin-left:auto; } }
.rewards { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(170px, 100%), 1fr)); gap:14px; }
.hist { display:flex; flex-direction:column; gap:10px; margin:0; padding:0; list-style:none; }
.hist li { display:flex; align-items:center; gap:12px; padding:12px 16px; border:1px solid var(--line); border-radius:var(--r-lg); }
.hist__main { flex:1; min-width:0; display:flex; flex-direction:column; }
.hist__main small { color:var(--muted); }
.hist__plus, .hist__minus { flex:none; font-weight:800; }
.hist__plus { color:var(--green); }
.hist__minus { color:var(--red); }
.hist li.is-pending .hist__plus { color:#b07a00; }
.hist li.is-cancelled { opacity:.6; }
.hist li.is-cancelled .hist__plus, .hist li.is-cancelled .hist__minus { text-decoration:line-through; }
.rules h2 { margin:0 0 10px; font-size:20px; }
.rules ul { margin:0; padding-left:20px; color:var(--muted); font-size:14px; line-height:1.6; }
@media (max-width:800px) { .hero-b { grid-template-columns:1fr; } }
@media (max-width:760px) { .lvls { grid-template-columns:1fr; } }
@media (max-width:640px) { .steps { grid-template-columns:1fr; } .steps > :not(:first-child) { border-left:0; border-top:1px solid var(--line); } }
@media (max-width:480px) { .rewards { grid-template-columns:1fr 1fr; gap:10px; } .hist li { flex-wrap:wrap; gap:6px 12px; } }
</style>
