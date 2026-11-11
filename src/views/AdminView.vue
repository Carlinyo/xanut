<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdmin } from '../stores/admin'
import { useAuth } from '../stores/auth'
import { isOwner } from '../utils/roles'
import { t } from '../i18n'
import AdminOrders from '../components/organisms/AdminOrders.vue'
import AdminCustomers from '../components/organisms/AdminCustomers.vue'
import AdminFeedback from '../components/organisms/AdminFeedback.vue'
import AdminRewards from '../components/organisms/AdminRewards.vue'
import AdminCodes from '../components/organisms/AdminCodes.vue'
import AdminCatalog from '../components/organisms/AdminCatalog.vue'
import AdminCategories from '../components/organisms/AdminCategories.vue'
import AdminReviews from '../components/organisms/AdminReviews.vue'
import AdminReports from '../components/organisms/AdminReports.vue'

// Вкладка хранится в адресе (?tab=customers): после обновления страницы открыта та же
const route = useRoute(), router = useRouter(), admin = useAdmin(), auth = useAuth()
type Tab = 'orders' | 'customers' | 'catalog' | 'categories' | 'rewards' | 'codes' | 'reviews' | 'feedback' | 'reports'
const TABS: Tab[] = ['orders', 'customers', 'catalog', 'categories', 'rewards', 'codes', 'reviews', 'feedback', 'reports']
// клиенты (их данные и акции групп) и отчёты — только главному администратору; младшему этих вкладок нет (сервер ответит 403)
const owner = computed(() => isOwner(auth.user?.role))
const OWNER_TABS: Tab[] = ['customers', 'reports']
const allowed = (x: Tab) => TABS.includes(x) && (owner.value || !OWNER_TABS.includes(x))
const tab = computed<Tab>(() => (allowed(route.query.tab as Tab) ? (route.query.tab as Tab) : 'orders'))
const open = (next: Tab) => router.replace({ query: next === 'orders' ? {} : { tab: next } })
const activeCount = computed(() => admin.orders.filter((o) => !['done', 'cancelled'].includes(o.status)).length)
// неразобранные жалобы и предложения и дела по отчётам — меткой на вкладке, даже если она не открыта
onMounted(() => {
  if (!admin.feedbackLoaded) admin.loadFeedback().catch(() => {})
  if (owner.value && !admin.exports) admin.loadExports().catch(() => {})
})
// закончился месяц или неделя, а файл не скачан (или месяц не очищен) — напоминание над любой вкладкой, кроме отчётов
const reminder = computed(() => {
  const ex = admin.exports
  if (!ex || tab.value === 'reports') return null
  const m = ex.months.find((r) => r.todo)
  if (m) return t(m.todo === 'purge' ? 'admin.reports.banner.purge' : 'admin.reports.banner.download', { label: m.label })
  const w = ex.weeks.find((r) => r.todo)
  return w ? t(w.todo === 'purge' ? 'admin.reports.banner.weekPurge' : 'admin.reports.banner.week', { label: w.label }) : null
})
</script>

<template>
  <div class="wrap page adm">
    <div class="adm__head">
      <h1>⚙ {{ $t('admin.title') }}</h1>
      <div class="adm__tabs" role="tablist" :aria-label="$t('admin.tabs.label')">
        <button type="button" role="tab" class="adm__tab" :class="{ on: tab === 'orders' }" :aria-selected="tab === 'orders'" @click="open('orders')">
          📦 {{ $t('admin.tabs.orders') }}<span v-if="activeCount" class="adm__count" :class="{ 'is-new': admin.newIds.length && tab !== 'orders' }">{{ activeCount }}</span>
        </button>
        <button v-if="owner" type="button" role="tab" class="adm__tab" :class="{ on: tab === 'customers' }" :aria-selected="tab === 'customers'" @click="open('customers')">
          👥 {{ $t('admin.tabs.customers') }}
        </button>
        <button type="button" role="tab" class="adm__tab" :class="{ on: tab === 'catalog' }" :aria-selected="tab === 'catalog'" @click="open('catalog')">
          📦 {{ $t('admin.tabs.catalog') }}
        </button>
        <button type="button" role="tab" class="adm__tab" :class="{ on: tab === 'categories' }" :aria-selected="tab === 'categories'" @click="open('categories')">
          🗂 {{ $t('admin.tabs.categories') }}
        </button>
        <button type="button" role="tab" class="adm__tab" :class="{ on: tab === 'rewards' }" :aria-selected="tab === 'rewards'" @click="open('rewards')">
          🎁 {{ $t('admin.tabs.rewards') }}
        </button>
        <button type="button" role="tab" class="adm__tab" :class="{ on: tab === 'codes' }" :aria-selected="tab === 'codes'" @click="open('codes')">
          🎟 {{ $t('admin.tabs.codes') }}
        </button>
        <button type="button" role="tab" class="adm__tab" :class="{ on: tab === 'reviews' }" :aria-selected="tab === 'reviews'" @click="open('reviews')">
          ⭐ {{ $t('admin.tabs.reviews') }}
        </button>
        <button type="button" role="tab" class="adm__tab" :class="{ on: tab === 'feedback' }" :aria-selected="tab === 'feedback'" @click="open('feedback')">
          💬 {{ $t('admin.tabs.feedback') }}<span v-if="admin.feedbackNew" class="adm__count">{{ admin.feedbackNew }}</span>
        </button>
        <button v-if="owner" type="button" role="tab" class="adm__tab" :class="{ on: tab === 'reports' }" :aria-selected="tab === 'reports'" @click="open('reports')">
          📊 {{ $t('admin.tabs.reports') }}<span v-if="admin.exports?.todo" class="adm__count">{{ admin.exports.todo }}</span>
        </button>
      </div>
    </div>
    <div v-if="reminder" class="adm__remind" role="status">
      <span>📊 {{ reminder }}</span>
      <button type="button" class="adm__remind-go" @click="open('reports')">{{ $t('admin.reports.banner.open') }} →</button>
    </div>
    <!-- заказы не выгружаем при переключении вкладок: новые заказы видно и слышно и на других вкладках админки -->
    <AdminOrders v-show="tab === 'orders'" role="tabpanel" />
    <AdminCustomers v-if="tab === 'customers'" role="tabpanel" />
    <AdminFeedback v-if="tab === 'feedback'" role="tabpanel" />
    <AdminRewards v-if="tab === 'rewards'" role="tabpanel" />
    <AdminCodes v-if="tab === 'codes'" role="tabpanel" />
    <AdminCatalog v-if="tab === 'catalog'" role="tabpanel" />
    <AdminCategories v-if="tab === 'categories'" role="tabpanel" />
    <AdminReviews v-if="tab === 'reviews'" role="tabpanel" />
    <AdminReports v-if="tab === 'reports'" role="tabpanel" />
  </div>
</template>

<style scoped>
.adm__head { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px 20px; margin-bottom:20px; }
.adm__head h1 { margin:0; }
.adm__tabs { display:inline-flex; flex-wrap:wrap; gap:4px; padding:4px; border-radius:var(--pill); background:var(--dark); }
.adm__tab { display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border:0; border-radius:var(--pill); background:none; color:#dfe8e6; font-size:14px; font-weight:700; transition:background .2s, color .2s; }
.adm__tab:hover { color:#fff; background:var(--dark-2); }
.adm__tab.on { background:var(--yellow); color:#1b1500; }
.adm__count { min-width:22px; padding:2px 7px; border-radius:var(--pill); background:var(--red); color:#fff; font-size:12px; line-height:1.4; text-align:center; }
/* новый заказ, пока открыта другая вкладка админки */
.adm__count.is-new { animation:ping 1.2s var(--ease) infinite; }
@keyframes ping { 0%, 100% { box-shadow:0 0 0 0 rgb(229 52 43 / .6); } 60% { box-shadow:0 0 0 7px rgb(229 52 43 / 0); } }
@media (prefers-reduced-motion:reduce) { .adm__count.is-new { animation:none; outline:2px solid var(--yellow); } }
/* напоминание об отчёте: жёлтая полоса над вкладкой */
.adm__remind { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px 16px; margin:-6px 0 18px; padding:12px 16px;
  border:1.5px solid var(--yellow); border-radius:var(--r-md); background:var(--cream); color:#5c4100; font-size:14px; font-weight:600; line-height:1.45; }
.adm__remind-go { flex:none; padding:8px 14px; border:0; border-radius:var(--pill); background:var(--dark); color:#fff; font-size:13px; font-weight:700; transition:background .2s; }
.adm__remind-go:hover { background:var(--dark-2); }
@media (max-width:1100px) { .adm__tabs { border-radius:var(--r-lg); } }
@media (max-width:640px) { .adm__tabs { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); width:100%; } .adm__tab { justify-content:center; gap:5px; padding:10px 6px; font-size:12.5px; }
  /* вкладки в три колонки: если последняя осталась в строке одна — на всю строку */
  .adm__tab:last-child:nth-child(3n + 1) { grid-column:1 / -1; } }
</style>
