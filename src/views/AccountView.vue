<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import { useAuth } from '../stores/auth'
import type { Order } from '../types'
import { formatPhone } from '../utils/phone'
import InfoPanel from '../components/molecules/InfoPanel.vue'
import SectionTitle from '../components/molecules/SectionTitle.vue'
import OrdersList from '../components/organisms/OrdersList.vue'
import AppButton from '../components/atoms/AppButton.vue'

const auth = useAuth(), router = useRouter()
const orders = ref<Order[]>([])
const loading = ref(true)
const failed = ref(false)

onMounted(async () => {
  try { orders.value = await api<Order[]>('/orders') }
  catch { failed.value = true }
  finally { loading.value = false }
})
function logout() { auth.logout(); router.push('/') }
</script>

<template>
  <div class="wrap page">
    <template v-if="auth.user">
      <h1>{{ $t('account.mine') }}</h1>
      <InfoPanel :title="auth.user.name">
        <p>✉️ {{ auth.user.email }}</p>
        <p>📞 {{ formatPhone(auth.user.phone) }}</p>
        <AppButton @click="logout">{{ $t('account.logout') }}</AppButton>
      </InfoPanel>
      <section class="section">
        <SectionTitle>{{ $t('account.orders') }}</SectionTitle>
        <p v-if="loading" class="muted">{{ $t('state.loading') }}</p>
        <p v-else-if="failed" class="muted">{{ $t('state.error') }}</p>
        <p v-else-if="!orders.length" class="muted">{{ $t('account.noOrders') }}</p>
        <OrdersList v-else :orders="orders" />
      </section>
    </template>
  </div>
</template>
