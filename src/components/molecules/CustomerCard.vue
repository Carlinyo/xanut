<script setup lang="ts">
// Клиент в админке: контакты, покупки, баллы и группа. Группу можно назначить вручную или вернуть «по покупкам».
// «Պատվերներ» раскрывает его заказы: что, сколько и когда купил; «± Միավորներ» — начислить или снять баллы вручную.
import { computed, ref } from 'vue'
import { t } from '../../i18n'
import { money } from '../../utils/format'
import { formatPhone } from '../../utils/phone'
import { lastDayText, SEGMENT_ICON, SEGMENTS } from '../../utils/segments'
import type { AdminUser, Segment } from '../../types'
import AppInput from '../atoms/AppInput.vue'
import CustomerOrders from './CustomerOrders.vue'
import BonusAdjustForm from './BonusAdjustForm.vue'

/** Список заказов клиента открыт (загружается при первом открытии). */
const showOrders = ref(false)
/** Форма «начислить / снять баллы» открыта. */
const showBonus = ref(false)

const props = defineProps<{ user: AdminUser; busy?: boolean }>()
// role: worker — сделать работником (раздел заказов для работников), manager — младшим администратором
// (админка без клиентов, акций и отчётов), customer — снова покупатель;
// bonus — баллы начислены (points > 0) или сняты: user — клиент уже с новым балансом;
// gifts — открыть (true) или закрыть подарки за баллы до первого полученного заказа
const emit = defineEmits<{ segment: [value: Segment | null]; role: [role: 'worker' | 'manager' | 'customer']; bonus: [user: AdminUser, points: number]; gifts: [on: boolean] }>()
function bonusDone(user: AdminUser, points: number) {
  showBonus.value = false
  emit('bonus', user, points)
}

const u = computed(() => props.user)
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB')
const nf = (n: number) => n.toLocaleString('en-US')
/** 'auto' — группа считается сама по покупкам. */
const choice = computed(() => (u.value.segmentManual ? u.value.segment : 'auto'))
const options = computed(() => [
  { value: 'auto', label: t('admin.customers.auto', { group: t('segments.short.' + u.value.autoSegment) }) },
  ...SEGMENTS.map((s) => ({ value: s, label: `${SEGMENT_ICON[s]} ${t('segments.names.' + s)}` })),
])
const pick = (v: string) => { if (v !== choice.value) emit('segment', v === 'auto' ? null : (v as Segment)) }
</script>

<template>
  <article class="cu" :class="`is-${u.segment}`" :aria-busy="busy || undefined">
    <div class="cu__main">
      <div class="cu__name">
        <b>{{ u.name }}</b>
        <span class="cu__seg" :class="`is-${u.segment}`">{{ SEGMENT_ICON[u.segment] }} {{ $t('segments.short.' + u.segment) }}</span>
        <span v-if="u.segmentManual" class="cu__tag">{{ $t('admin.customers.manual') }}</span>
        <span v-if="u.role === 'admin'" class="cu__tag">⚙ {{ $t('admin.link') }}</span>
        <span v-else-if="u.role === 'manager'" class="cu__tag is-worker">🛠 {{ $t('admin.customers.role.manager') }}</span>
        <span v-else-if="u.role === 'worker'" class="cu__tag is-worker">🧑‍🍳 {{ $t('admin.customers.role.worker') }}</span>
      </div>
      <div class="cu__contacts">
        <a :href="`mailto:${u.email}`">✉ {{ u.email }}<span v-if="u.emailVerified" class="cu__ok" :title="$t('admin.customers.verified')"> ✓</span></a>
        <a :href="`tel:${u.phone}`">📞 {{ formatPhone(u.phone) }}</a>
        <span v-if="u.address">📍 {{ u.address }}</span>
      </div>
      <dl class="cu__stats">
        <div>
          <dt>{{ $t('admin.customers.orders') }}</dt>
          <dd>{{ u.orders }}<small v-if="u.cancelled"> · {{ $t('admin.customers.cancelled', { n: u.cancelled }) }}</small></dd>
        </div>
        <div v-if="u.month">
          <dt>{{ $t('admin.customers.month') }}</dt>
          <dd>{{ u.month.regular }}<small v-if="u.month.vip"> · VIP՝ {{ u.month.vip }}</small></dd>
        </div>
        <div v-if="!u.segmentManual && u.autoUntil">
          <dt>{{ $t('admin.customers.until') }}</dt>
          <dd>{{ lastDayText(u.autoUntil) }}</dd>
        </div>
        <div><dt>{{ $t('admin.customers.spent') }}</dt><dd>{{ money(u.spent) }}</dd></div>
        <div><dt>{{ $t('admin.customers.last') }}</dt><dd>{{ u.lastOrderAt ? day(u.lastOrderAt) : '—' }}</dd></div>
        <div>
          <dt>{{ $t('admin.customers.points') }}</dt>
          <dd>⭐ {{ nf(u.bonus.available) }}<small v-if="u.bonus.pending"> · +{{ nf(u.bonus.pending) }}</small></dd>
        </div>
        <div><dt>{{ $t('admin.customers.since') }}</dt><dd>{{ day(u.createdAt) }}</dd></div>
        <!-- подарки за баллы: обычно после первого полученного заказа; главный администратор может открыть раньше -->
        <div v-if="u.canRedeem !== undefined">
          <dt>{{ $t('admin.customers.gifts.label') }}</dt>
          <dd :class="{ 'cu__gifts-off': !u.canRedeem }">
            {{ $t(u.giftsUnlocked ? 'admin.customers.gifts.openByAdmin' : u.canRedeem ? 'admin.customers.gifts.open' : 'admin.customers.gifts.locked') }}
          </dd>
        </div>
      </dl>
      <div class="cu__btns">
        <button v-if="u.orders || u.cancelled" type="button" class="cu__more" :aria-expanded="showOrders" @click="showOrders = !showOrders">
          📦 {{ $t(showOrders ? 'admin.customers.hideOrders' : 'admin.customers.showOrders') }} <span aria-hidden="true">{{ showOrders ? '▴' : '▾' }}</span>
        </button>
        <button type="button" class="cu__more" :aria-expanded="showBonus" :disabled="busy" @click="showBonus = !showBonus">
          ⭐ {{ $t('admin.customers.bonus.open') }} <span aria-hidden="true">{{ showBonus ? '▴' : '▾' }}</span>
        </button>
        <!-- подарки закрыты (заказа ещё нет) — открыть; открыты администратором — можно закрыть снова -->
        <button v-if="u.canRedeem === false" type="button" class="cu__more" :disabled="busy" @click="emit('gifts', true)">{{ $t('admin.customers.gifts.unlock') }}</button>
        <button v-else-if="u.giftsUnlocked" type="button" class="cu__more" :disabled="busy" @click="emit('gifts', false)">{{ $t('admin.customers.gifts.lock') }}</button>
      </div>
    </div>
    <label class="cu__pick">
      <span>{{ $t('admin.customers.group') }}</span>
      <!-- key: если сохранить не удалось, список возвращается к сохранённому значению -->
      <AppInput :key="`${choice}-${busy}`" as="select" :model-value="choice" :disabled="busy" @update:model-value="pick">
        <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </AppInput>
    </label>
    <!-- работник: доступ только к заказам (кнопка «Готово»); младший администратор: админка без клиентов, акций и отчётов;
         главного администратора здесь не поменять -->
    <div v-if="u.role !== 'admin'" class="cu__roles">
      <button v-if="u.role === 'worker' || u.role === 'manager'" type="button" class="cu__role" :disabled="busy" @click="emit('role', 'customer')">
        ↩ {{ $t(u.role === 'worker' ? 'admin.customers.role.undo' : 'admin.customers.role.undoManager') }}
      </button>
      <template v-else>
        <button type="button" class="cu__role" :disabled="busy" @click="emit('role', 'worker')">🧑‍🍳 {{ $t('admin.customers.role.make') }}</button>
        <button type="button" class="cu__role" :disabled="busy" @click="emit('role', 'manager')">🛠 {{ $t('admin.customers.role.makeManager') }}</button>
      </template>
    </div>
    <BonusAdjustForm v-if="showBonus" :user="u" class="cu__orders" @done="bonusDone" @cancel="showBonus = false" />
    <CustomerOrders v-if="showOrders" :user-id="u.id" class="cu__orders" />
  </article>
</template>

<style scoped>
.cu { position:relative; display:flex; flex-wrap:wrap; align-items:flex-start; gap:12px 24px; padding:14px 18px 14px 24px; border:1px solid var(--line); border-radius:var(--r-lg); background:#fff; overflow:hidden; transition:opacity .2s; }
.cu::before { content:''; position:absolute; inset:0 auto 0 0; width:6px; background:#cfe6d6; }
.cu.is-regular::before { background:#f08a3c; }
.cu.is-vip::before { background:var(--yellow); }
.cu[aria-busy] { opacity:.6; cursor:progress; }
.cu__main { flex:1 1 420px; min-width:0; display:flex; flex-direction:column; gap:8px; }
.cu__name { display:flex; flex-wrap:wrap; align-items:center; gap:6px 10px; }
.cu__name b { font-size:16px; }
.cu__seg { padding:3px 10px; border-radius:var(--pill); background:#e6f4ea; color:var(--green); font-size:12.5px; font-weight:800; }
.cu__seg.is-regular { background:#fff1e6; color:#b4470b; }
.cu__seg.is-vip { background:var(--dark); color:var(--yellow); }
.cu__tag { padding:2px 9px; border:1px solid var(--line); border-radius:var(--pill); color:var(--muted); font-size:12px; font-weight:600; }
.cu__contacts { display:flex; flex-wrap:wrap; gap:4px 16px; font-size:14px; overflow-wrap:anywhere; }
.cu__contacts a:hover { color:var(--yellow-lo); }
.cu__ok { color:var(--green); font-weight:800; }
.cu__stats { display:flex; flex-wrap:wrap; gap:6px 22px; margin:0; font-size:14px; }
.cu__stats div { display:flex; flex-direction:column; }
.cu__stats dt { color:var(--muted); font-size:12px; }
.cu__stats dd { margin:0; font-weight:700; font-variant-numeric:tabular-nums; }
.cu__stats small { color:var(--muted); font-weight:500; }
.cu__stats dd.cu__gifts-off { color:var(--muted); font-weight:600; }
.cu__pick { flex:0 1 250px; display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:600; }
.cu__pick :deep(.field) { padding:9px 12px; }
.cu__btns { display:flex; flex-wrap:wrap; gap:8px; }
.cu__more:disabled { opacity:.5; cursor:not-allowed; }
.cu__more { align-self:flex-start; padding:6px 12px; border:1.5px solid var(--yellow); border-radius:var(--pill); background:var(--cream); color:#5c4100; font-size:13px; font-weight:700; transition:background .2s; }
.cu__more:hover { background:var(--yellow); }
.cu__orders { flex-basis:100%; min-width:0; }
.cu__tag.is-worker { border-color:var(--yellow); background:var(--cream); color:#7a5600; }
.cu__roles { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:2px 16px; align-self:flex-end; }
.cu__role { padding:4px 0; border:0; background:none; color:var(--muted); font-size:12.5px; font-weight:600; text-decoration:underline; text-underline-offset:3px; }
.cu__role:hover:not(:disabled) { color:var(--ink); }
.cu__role:disabled { opacity:.5; cursor:not-allowed; }
@media (max-width:640px) { .cu { padding:12px 14px 14px 20px; } .cu__pick { flex-basis:100%; } }
</style>
