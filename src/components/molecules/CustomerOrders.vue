<script setup lang="ts">
// Заказы одного клиента в его карточке (раздел «Հաճախորդներ»): что, сколько и когда купил — новые первыми.
// Заказы прошедших месяцев, удалённые после выгрузки, есть только в файлах «Հաշվետվություններ» — о них подсказка внизу.
import { onMounted, ref } from 'vue'
import { t } from '../../i18n'
import { commonErrorKey } from '../../api'
import { useAdmin } from '../../stores/admin'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import { formatSlot, money } from '../../utils/format'
import { discountLabel } from '../../utils/segments'
import type { AdminOrder } from '../../types'

const props = defineProps<{ userId: string }>()
const admin = useAdmin(), authError = useAuthRedirect()
const orders = ref<AdminOrder[]>([])
const archived = ref(0)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await admin.loadUserOrders(props.userId)
    orders.value = r.orders
    archived.value = r.archived
  } catch (e) {
    if (!authError(e)) error.value = t(commonErrorKey(e))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}` }
const nf = (n: number) => n.toLocaleString('en-US')
const group = (o: AdminOrder) => (o.status === 'done' ? 'done' : o.status === 'cancelled' ? 'cancelled' : 'active')
</script>

<template>
  <section class="co" :aria-busy="loading || undefined">
    <p v-if="loading" class="co__muted">{{ $t('state.loading') }}</p>
    <p v-else-if="error" class="co__err" role="alert">
      {{ error }} <button type="button" class="co__retry" @click="load">{{ $t('state.retry') }}</button>
    </p>
    <template v-else>
      <p v-if="!orders.length" class="co__muted">{{ $t('admin.customers.noOrders') }}</p>
      <ol v-else class="co__list">
        <li v-for="o in orders" :key="o.id" class="co__order" :class="`is-${group(o)}`">
          <div class="co__head">
            <b class="co__num">№{{ o.id }}</b>
            <span class="co__date">{{ stamp(o.createdAt) }}</span>
            <span class="co__status">{{ $t('orderStatus.' + o.status) }}</span>
            <span v-if="o.paid === false && o.status !== 'cancelled'" class="co__pay is-unpaid">💳 {{ $t('payment.unpaid') }}</span>
            <span v-else-if="o.paid && o.status !== 'cancelled'" class="co__pay is-paid">✓ {{ $t('payment.paid') }}</span>
            <b class="co__total">{{ money(o.total) }}</b>
          </div>
          <ul class="co__items">
            <li v-for="(i, n) in o.items" :key="n">
              <span>{{ i.kind === 'bonus' ? '🎁 ' : '' }}{{ i.name }} <span class="co__qty">× {{ i.qty }}</span></span>
              <span class="co__sum">{{ i.kind === 'bonus' ? $t('bonus.points', { n: nf((i.points ?? 0) * i.qty) }) : money(i.unitPrice * i.qty) }}</span>
            </li>
          </ul>
          <div class="co__meta">
            <span v-if="o.time">🕘 {{ formatSlot(o.time, o.exactTime) }}</span>
            <span>{{ o.delivery === 'pickup' ? '🏪 ' + $t('cart.pickup') : '🚚 ' + (o.address || $t('cart.delivery')) }}</span>
            <span v-if="o.discount">🏷 {{ discountLabel(o.segment) }}՝ −{{ money(o.discount) }}</span>
            <span v-if="o.delivery !== 'pickup'">{{ $t('cart.delivery') }}՝ {{ o.deliveryFee ? money(o.deliveryFee) : $t('cart.free') }}</span>
            <span v-if="o.bonus?.earned">⭐ +{{ nf(o.bonus.earned) }}</span>
            <span v-if="o.comment">💬 {{ o.comment }}</span>
          </div>
        </li>
      </ol>
      <p v-if="archived" class="co__muted">📁 {{ $t('admin.customers.archived', { n: archived }) }}</p>
    </template>
  </section>
</template>

<style scoped>
.co { display:flex; flex-direction:column; gap:10px; padding-top:12px; border-top:1.5px dashed var(--line); }
.co__muted { margin:0; color:var(--muted); font-size:13px; }
.co__err { margin:0; color:var(--red); font-size:13px; }
.co__retry { padding:0; border:0; background:none; color:inherit; font-weight:700; text-decoration:underline; }
.co__list { display:flex; flex-direction:column; gap:8px; margin:0; padding:0; list-style:none; }
.co__order { position:relative; padding:10px 12px 10px 16px; border:1px solid var(--line); border-radius:var(--r-md); background:#fffdf8; font-size:13.5px; overflow:hidden; }
/* полоса слева — как в списке заказов: жёлтая «в процессе», зелёная «готово», серая «отменён» */
.co__order::before { content:''; position:absolute; inset:0 auto 0 0; width:4px; background:var(--yellow); }
.co__order.is-done::before { background:var(--green); }
.co__order.is-cancelled { opacity:.6; }
.co__order.is-cancelled::before { background:var(--line); }
.co__head { display:flex; flex-wrap:wrap; align-items:center; gap:4px 10px; }
.co__num { font-size:15px; font-variant-numeric:tabular-nums; }
.co__date { color:var(--muted); font-variant-numeric:tabular-nums; }
.co__status { padding:1px 8px; border-radius:var(--pill); background:var(--cream); color:#7a5600; font-size:12px; font-weight:700; }
.is-done .co__status { background:#e6f4ea; color:var(--green); }
.is-cancelled .co__status { background:var(--bg); color:var(--muted); }
.co__pay { padding:1px 8px; border-radius:var(--pill); font-size:12px; font-weight:700; }
.co__pay.is-unpaid { background:#fdecea; color:var(--red); }
.co__pay.is-paid { background:#e6f4ea; color:var(--green); }
.co__total { margin-left:auto; font-size:15px; font-variant-numeric:tabular-nums; }
.co__items { margin:6px 0 0; padding:0; list-style:none; }
.co__items li { display:flex; justify-content:space-between; gap:12px; padding:3px 0; border-bottom:1px solid var(--bg); }
.co__qty { color:var(--muted); font-weight:700; white-space:nowrap; }
.co__sum { flex:none; font-variant-numeric:tabular-nums; white-space:nowrap; }
.co__meta { display:flex; flex-wrap:wrap; gap:2px 14px; margin-top:6px; color:var(--muted); font-size:12.5px; overflow-wrap:anywhere; }
</style>
