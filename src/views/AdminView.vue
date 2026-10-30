<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdmin } from '../stores/admin'
import AdminOrders from '../components/organisms/AdminOrders.vue'
import AdminRewards from '../components/organisms/AdminRewards.vue'

// Вкладка хранится в адресе (?tab=rewards): после обновления страницы открыта та же
const route = useRoute(), router = useRouter(), admin = useAdmin()
type Tab = 'orders' | 'rewards'
const tab = computed<Tab>(() => (route.query.tab === 'rewards' ? 'rewards' : 'orders'))
const open = (t: Tab) => router.replace({ query: t === 'orders' ? {} : { tab: t } })
const activeCount = computed(() => admin.orders.filter((o) => !['done', 'cancelled'].includes(o.status)).length)
</script>

<template>
  <div class="wrap page adm">
    <div class="adm__head">
      <h1>⚙ {{ $t('admin.title') }}</h1>
      <div class="adm__tabs" role="tablist" :aria-label="$t('admin.tabs.label')">
        <button type="button" role="tab" class="adm__tab" :class="{ on: tab === 'orders' }" :aria-selected="tab === 'orders'" @click="open('orders')">
          📦 {{ $t('admin.tabs.orders') }}<span v-if="activeCount" class="adm__count">{{ activeCount }}</span>
        </button>
        <button type="button" role="tab" class="adm__tab" :class="{ on: tab === 'rewards' }" :aria-selected="tab === 'rewards'" @click="open('rewards')">
          🎁 {{ $t('admin.tabs.rewards') }}
        </button>
      </div>
    </div>
    <!-- заказы не выгружаем при переключении вкладок: опрос новых заказов продолжает работать -->
    <AdminOrders v-show="tab === 'orders'" role="tabpanel" />
    <AdminRewards v-if="tab === 'rewards'" role="tabpanel" />
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
@media (max-width:560px) { .adm__tabs { width:100%; } .adm__tab { flex:1; justify-content:center; padding:10px 8px; font-size:13px; } }
</style>
