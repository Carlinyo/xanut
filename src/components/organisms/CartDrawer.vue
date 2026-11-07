<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { t } from '../../i18n'
import { useCart, type DeliveryMethod } from '../../stores/cart'
import { useCatalog } from '../../stores/catalog'
import { useAuth } from '../../stores/auth'
import { useBonus } from '../../stores/bonus'
import { useConfirm } from '../../stores/confirm'
import { money } from '../../utils/format'
import { discountLabel, perksText, SEGMENT_ICON } from '../../utils/segments'
import OverlayShell from '../molecules/OverlayShell.vue'
import CartLine from '../molecules/CartLine.vue'
import ProductArt from '../atoms/ProductArt.vue'
import ChoiceToggle from '../molecules/ChoiceToggle.vue'
import AppButton from '../atoms/AppButton.vue'
import CheckoutForm from './CheckoutForm.vue'
import type { CartItem } from '../../types'

const emit = defineEmits<{ close: [] }>()
const cart = useCart(), auth = useAuth(), route = useRoute(), catalog = useCatalog(), bonus = useBonus(), confirm = useConfirm()
/** Заказ принят: ok — как обычно; payLater — онлайн-оплата не открылась, оплатить можно из «Իմ հաշիվը». */
const done = ref<'' | 'ok' | 'payLater'>('')
// дальняя доставка: подпись, пока адрес не выбран (выбран дальний — цена уже в итоге)
const far = computed(() => catalog.config.deliveryFar)
async function change(i: CartItem, delta: number) {
  if (i.qty + delta <= 0 && !(await confirm.ask({ title: t('confirm.removeLine.title'), text: i.name, yes: t('confirm.removeLine.yes'), tone: 'danger' }))) return
  cart.change(i.id, delta)
}
// доставка курьером (+deliveryFee, бесплатно от порога) или самовывоз из магазина
const method = computed({ get: () => cart.method, set: (m: DeliveryMethod) => cart.setMethod(m) })
// группа покупателя и её акция (скидка, баллы, бесплатная доставка) — строкой под итогом
const level = computed(() => (auth.isAuth ? bonus.level : null))
const showPerks = computed(() => !!level.value && (level.value.segment !== 'new' || cart.discount > 0) && !!perksText(level.value.perks))
const methodOptions = computed(() => [
  { value: 'delivery' as DeliveryMethod, label: `${t('cart.delivery')} ${cart.deliveryPrice ? '+' + money(cart.deliveryPrice) : '· ' + t('cart.free')}`, icon: '🚚' },
  { value: 'pickup' as DeliveryMethod, label: t('cart.pickup'), icon: '🏪' },
])
</script>

<template>
  <OverlayShell side="right" :label="$t('cart.title')" @close="emit('close')">
    <div class="drawer">
      <header class="drawer__head">
        <h2>🛒 {{ $t('cart.title') }}</h2>
        <AppButton variant="close" :aria-label="$t('common.close')" @click="emit('close')">✕</AppButton>
      </header>

      <p v-if="done" class="drawer__ok" :class="{ 'is-warn': done === 'payLater' }" role="status">
        {{ $t(done === 'payLater' ? 'cart.donePayLater' : 'cart.done') }}
        <RouterLink v-if="done === 'payLater'" to="/account" @click="emit('close')">{{ $t('account.mine') }} →</RouterLink>
      </p>
      <p v-else-if="!cart.items.length" class="muted">{{ $t('cart.empty') }}</p>

      <template v-else>
        <TransitionGroup name="line" tag="ul" class="drawer__lines">
          <CartLine v-for="i in cart.items" :key="i.id" :item="i" @change="change(i, $event)" />
          <!-- обязательный «Լավաշ + աման» к шашлыку: считается сам, убрать его нельзя -->
          <li v-if="cart.pack" key="pack" class="pack">
            <span class="pack__art" aria-hidden="true"><ProductArt kind="bread" /></span>
            <div class="pack__body">
              <b>{{ cart.pack.name }}</b>
              <small>{{ $t('cart.pack', { kg: catalog.kebab.pack?.perKg ?? 3 }) }}</small>
              <em>{{ money(cart.pack.price) }}</em>
            </div>
            <span class="pack__qty">× {{ cart.pack.qty }}</span>
          </li>
        </TransitionGroup>

        <ChoiceToggle v-model="method" :options="methodOptions" :label="$t('cart.methodLabel')" class="drawer__method" />
        <p v-if="cart.method === 'pickup'" class="drawer__pickup">🏪 {{ $t('cart.pickupHint', { address: $t('contact.address') }) }}</p>
        <p v-else class="drawer__pickup">{{ catalog.config.onlinePay ? '💳 ' + $t('cart.deliveryOnline') : '💵 ' + $t('cart.deliveryCash') }}</p>

        <dl class="sum">
          <dt>{{ $t('cart.items') }}</dt><dd>{{ money(cart.subtotal) }}</dd>
          <template v-if="cart.discount">
            <dt>🏷 {{ discountLabel(level?.segment) }}</dt><dd class="sum__disc">−{{ money(cart.discount) }}</dd>
          </template>
          <dt>{{ $t(cart.method === 'pickup' ? 'cart.pickup' : 'cart.delivery') }}</dt><dd>{{ cart.delivery ? money(cart.delivery) : $t('cart.free') }}</dd>
          <dt class="sum__total">{{ $t('cart.total') }}</dt><dd class="sum__total">{{ money(cart.total) }}</dd>
        </dl>
        <p v-if="showPerks && level" class="drawer__perk">
          {{ SEGMENT_ICON[level.segment] }} <b>{{ $t('segments.names.' + level.segment) }}</b> · {{ perksText(level.perks) }}
        </p>
        <p v-if="cart.delivery && !cart.far" class="muted">{{ $t('cart.freeFrom', { amount: catalog.config.freeDeliveryFrom.toLocaleString('en-US') }) }}</p>
        <p v-if="cart.method === 'delivery' && far" class="muted">
          {{ $t(cart.far ? 'cart.farApplied' : 'cart.farNote', { km: far.overKm, fee: money(far.fee) }) }}
        </p>
        <p v-if="cart.pointsEarned" class="drawer__earn">{{ $t(auth.isAuth ? 'bonus.earnHint' : 'bonus.guestEarn', { n: cart.pointsEarned.toLocaleString('en-US') }) }}</p>

        <CheckoutForm v-if="auth.isAuth" @done="done = $event" />
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
.drawer__method { margin-bottom:12px; }
.drawer__pickup { margin:-4px 0 12px; padding:9px 12px; border-radius:var(--r-md); background:var(--cream); color:#7a5600; font-size:13px; font-weight:600; }
.drawer__ok { padding:14px; border-radius:var(--r-md); background:#e8f6ec; color:var(--green); font-weight:700; animation:rise .5s var(--ease); }
.drawer__ok.is-warn { background:var(--cream); color:#7a5600; }
.drawer__ok a { display:inline-block; margin-top:6px; text-decoration:underline; text-underline-offset:2px; }
.sum { display:grid; grid-template-columns:1fr auto; gap:8px; margin:0; padding:14px; border-radius:var(--r-md); background:var(--bg); }
.sum dt { color:var(--muted); }
.sum dd { margin:0; text-align:right; }
.sum .sum__total { margin-top:4px; padding-top:10px; border-top:1px dashed var(--line); color:var(--ink); font-size:18px; font-weight:800; }
.sum .sum__disc { color:var(--green); font-weight:700; }
.drawer__perk { margin:10px 0 0; padding:9px 12px; border-radius:var(--r-md); background:var(--dark); color:#e9efed; font-size:13px; line-height:1.45; }
.drawer__perk b { color:var(--yellow); }
.drawer__earn { margin:10px 0 0; padding:9px 12px; border-radius:var(--r-md); background:var(--cream); color:#7a5600; font-size:13px; font-weight:600; }
.gate { display:flex; flex-direction:column; gap:10px; margin-top:16px; padding:16px; border:1px solid var(--yellow); border-radius:var(--r-md); background:var(--cream); }
.gate p { margin:0; font-weight:600; }
.line-enter-active, .line-leave-active, .line-move { transition:opacity .3s, transform .35s var(--ease); }
.line-enter-from, .line-leave-to { opacity:0; transform:translateX(30px); }
.line-leave-active { position:absolute; width:calc(100% - 2 * clamp(14px, 3vw, 24px)); }
.pack { display:flex; align-items:center; gap:12px; padding-bottom:14px; border-bottom:1px solid var(--line); }
.pack__art { display:grid; place-items:center; flex:none; width:52px; height:52px; border-radius:var(--r-md); background:var(--cream); }
.pack__art > * { width:80%; height:80%; }
.pack__body { flex:1; min-width:0; display:flex; flex-direction:column; font-size:14px; overflow-wrap:anywhere; }
.pack__body small { color:var(--muted); font-size:12px; }
.pack__body em { margin-top:2px; font-style:normal; font-weight:800; }
.pack__qty { flex:none; padding:6px 12px; border-radius:var(--pill); background:var(--bg); font-size:14px; font-weight:800; }
@media (max-width:480px) { .pack__art { width:44px; height:44px; } .pack { gap:8px; } }
</style>
