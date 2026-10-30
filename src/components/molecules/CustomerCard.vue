<script setup lang="ts">
// Клиент в админке: контакты, покупки, баллы и группа. Группу можно назначить вручную или вернуть «по покупкам».
import { computed } from 'vue'
import { t } from '../../i18n'
import { money } from '../../utils/format'
import { formatPhone } from '../../utils/phone'
import { SEGMENT_ICON, SEGMENTS } from '../../utils/segments'
import type { AdminUser, Segment } from '../../types'
import AppInput from '../atoms/AppInput.vue'

const props = defineProps<{ user: AdminUser; busy?: boolean }>()
const emit = defineEmits<{ segment: [value: Segment | null] }>()

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
      </div>
      <div class="cu__contacts">
        <a :href="`mailto:${u.email}`">✉ {{ u.email }}<span v-if="u.emailVerified" class="cu__ok" :title="$t('admin.customers.verified')"> ✓</span></a>
        <a :href="`tel:${u.phone}`">📞 {{ formatPhone(u.phone) }}<span v-if="u.phoneVerified" class="cu__ok" :title="$t('admin.customers.verified')"> ✓</span></a>
        <span v-if="u.address">📍 {{ u.address }}</span>
      </div>
      <dl class="cu__stats">
        <div>
          <dt>{{ $t('admin.customers.orders') }}</dt>
          <dd>{{ u.orders }}<small v-if="u.cancelled"> · {{ $t('admin.customers.cancelled', { n: u.cancelled }) }}</small></dd>
        </div>
        <div><dt>{{ $t('admin.customers.spent') }}</dt><dd>{{ money(u.spent) }}</dd></div>
        <div><dt>{{ $t('admin.customers.last') }}</dt><dd>{{ u.lastOrderAt ? day(u.lastOrderAt) : '—' }}</dd></div>
        <div>
          <dt>{{ $t('admin.customers.points') }}</dt>
          <dd>⭐ {{ nf(u.bonus.available) }}<small v-if="u.bonus.pending"> · +{{ nf(u.bonus.pending) }}</small></dd>
        </div>
        <div><dt>{{ $t('admin.customers.since') }}</dt><dd>{{ day(u.createdAt) }}</dd></div>
      </dl>
    </div>
    <label class="cu__pick">
      <span>{{ $t('admin.customers.group') }}</span>
      <!-- key: если сохранить не удалось, список возвращается к сохранённому значению -->
      <AppInput :key="`${choice}-${busy}`" as="select" :model-value="choice" :disabled="busy" @update:model-value="pick">
        <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </AppInput>
    </label>
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
.cu__pick { flex:0 1 250px; display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:600; }
.cu__pick :deep(.field) { padding:9px 12px; }
@media (max-width:640px) { .cu { padding:12px 14px 14px 20px; } .cu__pick { flex-basis:100%; } }
</style>
