<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { t } from '../../i18n'
import { useCart } from '../../stores/cart'
import { useUI } from '../../stores/ui'
import { useAuth } from '../../stores/auth'
import { useBonus } from '../../stores/bonus'
import { useLogout } from '../../composables/useLogout'
import AppLogo from '../atoms/AppLogo.vue'
import AppButton from '../atoms/AppButton.vue'
import AppBadge from '../atoms/AppBadge.vue'
import SearchBar from '../molecules/SearchBar.vue'
import AccountMenu from '../molecules/AccountMenu.vue'
import NavLinks from '../molecules/NavLinks.vue'
import type { NavItem } from '../../types'

const cart = useCart(), ui = useUI(), auth = useAuth(), bonus = useBonus(), route = useRoute(), router = useRouter()
const items = computed<NavItem[]>(() => [
  { label: t('nav.home'), to: '/' }, { label: t('nav.products'), to: '/products' },
  { label: t('nav.offers'), to: '/offers' }, { label: '🎁 ' + t('nav.bonus'), to: '/bonus' }, { label: t('nav.about'), to: '/about' },
  { label: t('nav.contact'), to: '/contact' }, { label: '🍢 ' + t('nav.kebab'), id: 'kebab' },
])
function onQuery(v: string) {
  ui.query = v
  if (!['/products', '/offers'].includes(route.path)) router.push('/products')
}
const logout = useLogout() // спрашивает «Выйти?» и после выхода ведёт на главную

const scrolled = ref(false)
const onScroll = () => (scrolled.value = window.scrollY > 8)
onMounted(() => { onScroll(); window.addEventListener('scroll', onScroll, { passive: true }) })
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header class="top" :class="{ 'top--scrolled': scrolled }">
    <div class="wrap top__bar">
      <AppLogo class="top__logo" />
      <SearchBar class="top__search" :model-value="ui.query" @update:model-value="onQuery" />
      <AccountMenu :user="auth.user" :points="bonus.loaded ? bonus.available : undefined" @logout="logout" />
      <AppButton variant="icon" data-cart-target :aria-label="$t('common.cart')" @click="ui.cartOpen = true">
        🛒<AppBadge v-if="cart.count" :key="cart.count" tone="count" class="top__count">{{ cart.count }}</AppBadge>
      </AppButton>
    </div>
    <div class="wrap">
      <NavLinks :items="items" :city="$t('nav.city')" @action="ui.kebabOpen = true" />
    </div>
  </header>
</template>

<style scoped>
.top { position:sticky; top:0; z-index:40; background:rgb(14 26 25 / .94); backdrop-filter:blur(12px); color:#fff; transition:box-shadow .3s; }
.top--scrolled { box-shadow:0 8px 24px -10px rgb(0 0 0 / .6); }
.top__bar { display:flex; align-items:center; gap:clamp(10px, 2vw, 24px); padding-block:12px; transition:padding .35s var(--ease); }
.top--scrolled .top__bar { padding-block:7px; }
.top--scrolled { background:rgb(14 26 25 / .86); }
.top__search { flex:1; max-width:560px; }
.top__count { position:absolute; top:-4px; right:-4px; }
.top__bar > :nth-child(3) { margin-left:auto; }
@media (max-width:700px) {
  .top { position:static; }
  .top__bar { flex-wrap:wrap; gap:10px 12px; padding-block:10px; }
  .top__logo { margin-right:auto; }
  .top__search { order:3; flex:1 1 100%; max-width:none; }
  .top__bar > :nth-child(3) { margin-left:0; }
}
</style>
