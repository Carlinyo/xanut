<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdmin } from '../stores/admin'
import AdminOrders from '../components/organisms/AdminOrders.vue'
import AdminCustomers from '../components/organisms/AdminCustomers.vue'
import AdminRewards from '../components/organisms/AdminRewards.vue'
import AdminCodes from '../components/organisms/AdminCodes.vue'

// Вкладка хранится в адресе (?tab=customers): после обновления страницы открыта та же
const route = useRoute(), router = useRouter(), admin = useAdmin()
type Tab = 'orders' | 'customers' | 'rewards' | 'codes'
const TABS: Tab[] = ['orders', 'customers', 'rewards', 'codes']
const tab = computed<Tab>(() => (TABS.includes(route.query.tab as Tab) ? (route.query.tab as Tab) : 'orders'))
const open = (t: Tab) => router.replace({ query: t === 'orders' ? {} : { tab: t } })
const activeCount = computed(() => admin.orders.filter((o) => !['done', 'cancelled'].includes(o.status)).length)
</script>

<template>
  <div class="wrap page adm">
    <div class="adm__head">
      <h1>⚙ {{ $t('admin.title') }}</h1>
      <div class="adm__tabs" role="tablist" :aria-label="$t('admin.tabs.label')">
        <button type="button" role="tab" class="adm__tab" :class="{ on: tab === 'orders' }" :aria-selected="tab === 'orders'" @click="open('orders')">
          📦 {{ $t('admin.tabs.orders') }}<span v-if="activeCount" class="adm__count" :class="{ 'is-new': admin.newIds.length && tab !== 'orders' }">{{ activeCount }}</span>
        </button>
        <button type="button" role="tab" class="adm__tab" :class="{ on: tab === 'customers' }" :aria-selected="tab === 'customers'" @click="open('customers')">
          👥 {{ $t('admin.tabs.customers') }}
        </button>
        <button type="button" role="tab" class="adm__tab" :class="{ on: tab === 'rewards' }" :aria-selected="tab === 'rewards'" @click="open('rewards')">
          🎁 {{ $t('admin.tabs.rewards') }}
        </button>
        <button type="button" role="tab" class="adm__tab" :class="{ on: tab === 'codes' }" :aria-selected="tab === 'codes'" @click="open('codes')">
          🎟 {{ $t('admin.tabs.codes') }}
        </button>
      </div>
    </div>
    <!-- заказы не выгружаем при переключении вкладок: новые заказы видно и слышно и на других вкладках админки -->
    <AdminOrders v-show="tab === 'orders'" role="tabpanel" />
    <AdminCustomers v-if="tab === 'customers'" role="tabpanel" />
    <AdminRewards v-if="tab === 'rewards'" role="tabpanel" />
    <AdminCodes v-if="tab === 'codes'" role="tabpanel" />
  </div>
</template>

<style scoped>
.adm__head { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px 20px; margin-bottom:20px; }
.adm__head h1 { margin:0; }
.adm__tabs { display:inline-flex; gap:4px; padding:4px; border-radius:var(--pill); background:var(--dark); }
.adm__tab { display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border:0; border-radius:var(--pill); background:none; color:#dfe8e6; font-size:14px; font-weight:700; transition:background .2s, color .2s; }
.adm__tab:hover { color:#fff; background:var(--dark-2); }
.adm__tab.on { background:var(--yellow); color:#1b1500; }
.adm__count { min-width:22px; padding:2px 7px; border-radius:var(--pill); background:var(--red); color:#fff; font-size:12px; line-height:1.4; text-align:center; }
/* новый заказ, пока открыта другая вкладка админки */
.adm__count.is-new { animation:ping 1.2s var(--ease) infinite; }
@keyframes ping { 0%, 100% { box-shadow:0 0 0 0 rgb(229 52 43 / .6); } 60% { box-shadow:0 0 0 7px rgb(229 52 43 / 0); } }
@media (prefers-reduced-motion:reduce) { .adm__count.is-new { animation:none; outline:2px solid var(--yellow); } }
@media (max-width:640px) { .adm__tabs { width:100%; } .adm__tab { flex:1; justify-content:center; gap:5px; padding:10px 6px; font-size:12.5px; } }
</style>
