<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuth } from '../stores/auth'
import { useBonus } from '../stores/bonus'
import { useCart } from '../stores/cart'
import { useCatalog } from '../stores/catalog'
import type { Product } from '../types'
import SectionTitle from '../components/molecules/SectionTitle.vue'
import FeatureItem from '../components/molecules/FeatureItem.vue'
import RewardCard from '../components/molecules/RewardCard.vue'
import AppButton from '../components/atoms/AppButton.vue'

const auth = useAuth(), bonus = useBonus(), cart = useCart(), catalog = useCatalog()
onMounted(() => { if (auth.isAuth) void bonus.load() }) // свежий баланс при каждом открытии

const percent = computed(() => bonus.percent)
const maxQty = computed(() => catalog.config.bonus?.maxQty ?? 10)
const hours = computed(() => catalog.config.bonus?.matureHours ?? 3)
const nf = (n: number) => n.toLocaleString('en-US')
/** Сколько баллов ещё можно потратить с учётом того, что уже лежит в корзине. */
const left = computed(() => bonus.available - cart.pointsSpent)

function statusOf(p: Product): 'guest' | 'lack' | 'max' | 'ok' {
  if (!auth.isAuth) return 'guest'
  if (cart.bonusQty(p.id) >= maxQty.value) return 'max'
  return (p.bonusPoints ?? 0) <= left.value ? 'ok' : 'lack'
}
const get = (p: Product) => cart.addBonus(p) // корзину не открываем: можно выбрать ещё
const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB')
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
          <small v-if="cart.pointsSpent" class="hero-b__pending">{{ $t('bonus.spentRow') }}: −{{ nf(cart.pointsSpent) }}</small>
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

    <section class="section">
      <SectionTitle>{{ $t('bonus.rewardsTitle') }}</SectionTitle>
      <p v-if="!bonus.rewards.length" class="muted">{{ $t('bonus.rewardsEmpty') }}</p>
      <div v-else v-reveal.stagger class="rewards">
        <RewardCard
          v-for="p in bonus.rewards" :key="p.id" :product="p" :status="statusOf(p)" :lack="(p.bonusPoints ?? 0) - left"
          :in-cart="cart.bonusQty(p.id)" :max-qty="maxQty" @get="get"
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
        <li v-for="r in $t('bonus.rules')" :key="r">{{ r.replace('{hours}', String(hours)).replace('{max}', String(maxQty)) }}</li>
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
@media (max-width:640px) { .steps { grid-template-columns:1fr; } .steps > :not(:first-child) { border-left:0; border-top:1px solid var(--line); } }
@media (max-width:480px) { .rewards { grid-template-columns:1fr 1fr; gap:10px; } .hist li { flex-wrap:wrap; gap:6px 12px; } }
</style>
