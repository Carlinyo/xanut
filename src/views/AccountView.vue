<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '../api'
import { useAuth } from '../stores/auth'
import { useBonus } from '../stores/bonus'
import { useLogout } from '../composables/useLogout'
import { nextLevelText, perksText, SEGMENT_ICON } from '../utils/segments'
import type { Order, OrderReview } from '../types'
import ProfileCard from '../components/organisms/ProfileCard.vue'
import SectionTitle from '../components/molecules/SectionTitle.vue'
import OrdersList from '../components/organisms/OrdersList.vue'
import AppButton from '../components/atoms/AppButton.vue'

const auth = useAuth(), bonus = useBonus(), router = useRouter()
const orders = ref<Order[]>([])
const loading = ref(true)
const failed = ref(false)

onMounted(async () => {
  void bonus.load()
  try { orders.value = await api<Order[]>('/orders') }
  catch (e) {
    if (e instanceof ApiError && e.status === 401) { // сессия истекла на сервере — войти заново и вернуться сюда
      auth.user = null
      router.replace({ path: '/login', query: { redirect: '/account' } })
      return
    }
    failed.value = true
  }
  finally { loading.value = false }
})
const logout = useLogout()
/** Отзыв отправлен — заказ показывает его вместо кнопки. */
function reviewed(id: number, review: OrderReview) {
  const o = orders.value.find((x) => x.id === id)
  if (o) Object.assign(o, { review, canReview: false })
}
// группа покупателя: её акция и сколько осталось до следующей
const level = computed(() => bonus.level)
</script>

<template>
  <div class="wrap page">
    <template v-if="auth.user">
      <h1>{{ $t('account.mine') }}</h1>
      <div class="duo acct-top">
        <ProfileCard>
          <AppButton v-if="auth.user.role === 'admin'" variant="light" to="/admin">⚙ {{ $t('admin.title') }}</AppButton>
          <AppButton @click="logout">{{ $t('account.logout') }}</AppButton>
        </ProfileCard>
        <RouterLink to="/bonus" class="acct-bonus">
          <small>{{ $t('bonus.accountTitle') }}</small>
          <b>⭐ {{ Math.max(0, bonus.available).toLocaleString('en-US') }}</b>
          <small v-if="bonus.pending" class="acct-bonus__pending">{{ $t('bonus.pending', { n: bonus.pending.toLocaleString('en-US') }) }}</small>
          <span v-if="level" class="acct-bonus__seg">
            {{ SEGMENT_ICON[level.segment] }} <b>{{ $t('segments.names.' + level.segment) }}</b>
            <template v-if="perksText(level.perks)"> · {{ perksText(level.perks) }}</template>
          </span>
          <small v-if="level && nextLevelText(level)" class="acct-bonus__next">{{ nextLevelText(level) }}</small>
          <span class="acct-bonus__link">{{ $t('bonus.accountLink') }} →</span>
        </RouterLink>
      </div>
      <section class="section">
        <SectionTitle>{{ $t('account.orders') }}</SectionTitle>
        <p v-if="loading" class="muted">{{ $t('state.loading') }}</p>
        <p v-else-if="failed" class="muted">{{ $t('state.error') }}</p>
        <p v-else-if="!orders.length" class="muted">{{ $t('account.noOrders') }}</p>
        <OrdersList v-else :orders="orders" @reviewed="reviewed" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.acct-top { align-items:stretch; }
.acct-bonus { display:flex; flex-direction:column; justify-content:center; gap:6px; padding:clamp(18px, 3vw, 28px); border-radius:var(--r-lg); color:#fff;
  background:radial-gradient(260px 180px at 85% 30%, rgb(246 178 26 / .35), transparent 70%), linear-gradient(120deg, rgb(14 26 25 / .96), rgb(26 18 12 / .8)), url(/img/bg/coals.webp) center / cover, var(--dark);
  transition:transform var(--t) var(--ease), box-shadow var(--t); }
.acct-bonus small { color:#cbd6d3; }
.acct-bonus b { font-size:clamp(30px, 4vw, 42px); color:var(--yellow); line-height:1.1; }
.acct-bonus .acct-bonus__pending { color:#ffe2a0; }
.acct-bonus__seg { align-self:flex-start; margin-top:4px; padding:5px 12px; border:1px solid rgb(246 178 26 / .5); border-radius:var(--pill); background:rgb(0 0 0 / .25); font-size:13px; line-height:1.4; }
.acct-bonus .acct-bonus__seg b { font-size:inherit; color:var(--yellow); }
.acct-bonus .acct-bonus__next { color:#e3ebe9; }
.acct-bonus__link { margin-top:6px; color:var(--yellow); font-weight:700; }
@media (hover:hover) { .acct-bonus:hover { transform:translateY(-3px); box-shadow:var(--shadow-md); } }
</style>
