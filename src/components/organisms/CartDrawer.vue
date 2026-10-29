<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useCart } from '../../stores/cart'
import { useCatalog } from '../../stores/catalog'
import { useAuth } from '../../stores/auth'
import { money } from '../../utils/format'
import OverlayShell from '../molecules/OverlayShell.vue'
import CartLine from '../molecules/CartLine.vue'
import AppButton from '../atoms/AppButton.vue'
import CheckoutForm from './CheckoutForm.vue'

const emit = defineEmits<{ close: [] }>()
const cart = useCart(), auth = useAuth(), route = useRoute(), catalog = useCatalog()
const done = ref(false)
</script>

<template>
  <OverlayShell side="right" :label="$t('cart.title')" @close="emit('close')">
    <div class="drawer">
      <header class="drawer__head">
        <h2>🛒 {{ $t('cart.title') }}</h2>
        <AppButton variant="close" :aria-label="$t('common.close')" @click="emit('close')">✕</AppButton>
      </header>

      <p v-if="done" class="drawer__ok">{{ $t('cart.done') }}</p>
      <p v-else-if="!cart.items.length" class="muted">{{ $t('cart.empty') }}</p>

      <template v-else>
        <TransitionGroup name="line" tag="ul" class="drawer__lines">
          <CartLine v-for="i in cart.items" :key="i.id" :item="i" @change="cart.change(i.id, $event)" />
        </TransitionGroup>

        <dl class="sum">
          <dt>{{ $t('cart.items') }}</dt><dd>{{ money(cart.subtotal) }}</dd>
          <dt>{{ $t('cart.delivery') }}</dt><dd>{{ cart.delivery ? money(cart.delivery) : $t('cart.free') }}</dd>
          <dt class="sum__total">{{ $t('cart.total') }}</dt><dd class="sum__total">{{ money(cart.total) }}</dd>
        </dl>
        <p v-if="cart.delivery" class="muted">{{ $t('cart.freeFrom', { amount: catalog.config.freeDeliveryFrom.toLocaleString('en-US') }) }}</p>

        <CheckoutForm v-if="auth.isAuth" @done="done = true" />
        <div v-else class="gate">
          <p>{{ $t('cart.gate') }}</p>
          <AppButton :to="{ path: '/login', query: { redirect: route.fullPath } }" @click="emit('close')">{{ $t('auth.login') }}</AppButton>
          <AppButton variant="light" :to="{ path: '/register', query: { redirect: route.fullPath } }" @click="emit('close')">{{ $t('auth.registerBtn') }}</AppButton>
        </div>
      </template>
    </div>
  </OverlayShell>
</template>

<style scoped>
.drawer { padding:clamp(14px, 3vw, 24px); }
.drawer__head { display:flex; align-items:center; justify-content:space-between; }
h2 { margin:0; font-size:22px; }
.drawer__lines { display:flex; flex-direction:column; gap:14px; margin:18px 0; padding:0; list-style:none; }
.drawer__ok { padding:14px; border-radius:var(--r-md); background:#e8f6ec; color:var(--green); font-weight:700; animation:rise .5s var(--ease); }
.sum { display:grid; grid-template-columns:1fr auto; gap:8px; margin:0; padding:14px; border-radius:var(--r-md); background:var(--bg); }
.sum dt { color:var(--muted); }
.sum dd { margin:0; text-align:right; }
.sum .sum__total { margin-top:4px; padding-top:10px; border-top:1px dashed var(--line); color:var(--ink); font-size:18px; font-weight:800; }
.gate { display:flex; flex-direction:column; gap:10px; margin-top:16px; padding:16px; border:1px solid var(--yellow); border-radius:var(--r-md); background:var(--cream); }
.gate p { margin:0; font-weight:600; }
.line-enter-active, .line-leave-active, .line-move { transition:opacity .3s, transform .35s var(--ease); }
.line-enter-from, .line-leave-to { opacity:0; transform:translateX(30px); }
.line-leave-active { position:absolute; width:calc(100% - 2 * clamp(14px, 3vw, 24px)); }
</style>
