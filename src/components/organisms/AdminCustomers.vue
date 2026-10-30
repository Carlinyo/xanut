<script setup lang="ts">
// Клиенты: все зарегистрированные пользователи, их покупки и группы (новый, постоянный, VIP) с акциями групп.
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { t } from '../../i18n'
import { commonErrorKey } from '../../api'
import { useAdmin } from '../../stores/admin'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import { perksText, ruleText, SEGMENT_ICON, SEGMENTS } from '../../utils/segments'
import type { AdminUser, Segment } from '../../types'
import CustomerCard from '../molecules/CustomerCard.vue'
import SegmentPerksForm from '../molecules/SegmentPerksForm.vue'
import AppButton from '../atoms/AppButton.vue'
import AppInput from '../atoms/AppInput.vue'

type Filter = 'all' | Segment
type Sort = 'recent' | 'spent' | 'orders' | 'last'
const PAGE = 60 // столько карточек сразу; остальные — по кнопке «Ещё»

const admin = useAdmin(), authError = useAuthRedirect()
const filter = ref<Filter>('all')
const query = ref('')
const sort = ref<Sort>('recent')
const limit = ref(PAGE)
const loading = ref(false)
const error = ref('')
const editing = ref(false)
const busy = ref<Set<string>>(new Set())

// статистика меняется с каждым заказом — при каждом открытии раздела загружаем заново
async function load() {
  loading.value = true
  error.value = ''
  try { await admin.loadUsers() } catch (e) { if (!authError(e)) error.value = t(commonErrorKey(e)) } finally { loading.value = false }
}
onMounted(load)

const counts = computed(() => {
  const c: Record<Filter, number> = { all: admin.users.length, new: 0, regular: 0, vip: 0 }
  for (const u of admin.users) c[u.segment]++
  return c
})
const sorters: Record<Sort, (a: AdminUser, b: AdminUser) => number> = {
  recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
  spent: (a, b) => b.spent - a.spent,
  orders: (a, b) => b.orders - a.orders || b.spent - a.spent,
  last: (a, b) => (b.lastOrderAt ?? '').localeCompare(a.lastOrderAt ?? ''),
}
const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')
  return admin.users
    .filter((u) => (filter.value === 'all' || u.segment === filter.value) && (!q
      || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      || (digits.length >= 3 && u.phone.replace(/\D/g, '').includes(digits))))
    .sort(sorters[sort.value])
})
const visible = computed(() => shown.value.slice(0, limit.value))
const pickFilter = (f: Filter) => { filter.value = filter.value === f && f !== 'all' ? 'all' : f; limit.value = PAGE }

// итог действия — сообщением над списком
const notice = ref<{ tone: 'ok' | 'bad'; text: string } | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | undefined
function say(tone: 'ok' | 'bad', text: string) {
  notice.value = { tone, text }
  clearTimeout(noticeTimer)
  if (tone === 'ok') noticeTimer = setTimeout(() => (notice.value = null), 6000)
}
onUnmounted(() => clearTimeout(noticeTimer))

const groupName = (s: Segment) => t('segments.names.' + s)
async function setSegment(u: AdminUser, segment: Segment | null) {
  busy.value.add(u.id)
  try {
    const r = await admin.setSegment(u.id, segment)
    say('ok', segment ? t('admin.customers.setManual', { name: r.name, group: groupName(r.segment) }) : t('admin.customers.setAuto', { name: r.name, group: groupName(r.segment) }))
  } catch (e) {
    if (!authError(e)) say('bad', `${u.name}: ${t(commonErrorKey(e))}`)
  } finally {
    busy.value.delete(u.id)
  }
}
function saved() {
  editing.value = false
  say('ok', t('admin.segments.saved'))
}
</script>

<template>
  <section class="ac">
    <div class="ac__groups" role="group" :aria-label="$t('admin.customers.filterLabel')">
      <button
        v-for="s in SEGMENTS" :key="s" type="button" class="grp" :class="[`is-${s}`, { on: filter === s }]" :aria-pressed="filter === s"
        @click="pickFilter(s)"
      >
        <span class="grp__top"><span>{{ SEGMENT_ICON[s] }} {{ $t('segments.names.' + s) }}</span><b class="grp__num">{{ counts[s] }}</b></span>
        <small class="grp__rule">{{ ruleText(s, admin.segments?.rules) }}</small>
        <small class="grp__perks">{{ (admin.segments && perksText(admin.segments.perks[s])) || $t('admin.customers.noPerks') }}</small>
      </button>
    </div>

    <div class="ac__bar">
      <button type="button" class="ac__all" :class="{ on: filter === 'all' }" :aria-pressed="filter === 'all'" @click="pickFilter('all')">
        {{ $t('admin.filter.all') }} <span class="ac__num">{{ counts.all }}</span>
      </button>
      <AppInput v-model="query" class="ac__search" type="search" :placeholder="$t('admin.customers.search')" :aria-label="$t('admin.customers.search')" />
      <AppInput v-model="sort" as="select" class="ac__sort" :aria-label="$t('admin.customers.sortLabel')">
        <option v-for="o in (['recent', 'spent', 'orders', 'last'] as Sort[])" :key="o" :value="o">{{ $t('admin.customers.sort.' + o) }}</option>
      </AppInput>
      <div class="ac__tools">
        <AppButton size="sm" :variant="editing ? 'primary' : 'light'" :disabled="!admin.segments" :aria-expanded="editing" @click="editing = !editing">
          🏷 {{ $t('admin.segments.open') }}
        </AppButton>
        <AppButton size="sm" variant="light" :disabled="loading" @click="load">🔄 {{ $t('admin.refresh') }}</AppButton>
      </div>
    </div>

    <SegmentPerksForm v-if="editing && admin.segments" :value="admin.segments" @done="saved" @cancel="editing = false" />

    <Transition name="nt">
      <div v-if="notice" class="ac__notice" :class="`is-${notice.tone}`" role="status">
        <span>{{ notice.tone === 'ok' ? '✓' : '⚠' }} {{ notice.text }}</span>
        <button type="button" class="ac__x" :aria-label="$t('common.close')" @click="notice = null">×</button>
      </div>
    </Transition>
    <p v-if="error" class="ac__error" role="alert">{{ error }}</p>
    <p v-if="loading && !admin.usersLoaded" class="muted">{{ $t('state.loading') }}</p>
    <template v-else-if="admin.usersLoaded">
      <p v-if="!shown.length" class="ac__empty">{{ query.trim() ? $t('admin.customers.emptySearch') : $t('admin.customers.empty') }}</p>
      <div v-else class="ac__list">
        <CustomerCard v-for="u in visible" :key="u.id" :user="u" :busy="busy.has(u.id)" @segment="setSegment(u, $event)" />
      </div>
      <div v-if="shown.length > limit" class="ac__more">
        <AppButton variant="light" @click="limit += PAGE">{{ $t('admin.customers.more', { n: shown.length - limit }) }}</AppButton>
      </div>
    </template>
  </section>
</template>

<style scoped>
.ac__groups { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:12px; margin-bottom:14px; }
.grp { display:flex; flex-direction:column; gap:4px; padding:14px 16px; border:1.5px solid var(--line); border-radius:var(--r-lg); background:#fff; text-align:left; transition:border-color .2s, box-shadow .2s, transform .2s var(--ease); }
.grp:hover { border-color:var(--yellow); }
.grp.on { border-color:var(--dark); box-shadow:0 0 0 3px rgb(246 178 26 / .45); }
.grp__top { display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:15px; font-weight:800; }
.grp__num { min-width:34px; padding:2px 10px; border-radius:var(--pill); background:var(--bg); font-size:15px; text-align:center; font-variant-numeric:tabular-nums; }
.grp__rule { color:var(--muted); font-size:12.5px; }
.grp__perks { color:var(--green); font-size:13px; font-weight:700; }
.grp.is-regular { background:linear-gradient(160deg, #fff, #fff4ea); }
.grp.is-vip { border-color:var(--dark); background:radial-gradient(220px 120px at 90% 0%, rgb(246 178 26 / .3), transparent 70%), var(--dark); color:#fff; }
.grp.is-vip .grp__num { background:var(--yellow); color:#1b1500; }
.grp.is-vip .grp__rule { color:#cbd6d3; }
.grp.is-vip .grp__perks { color:var(--yellow); }
.ac__bar { display:flex; flex-wrap:wrap; align-items:center; gap:10px 12px; margin-bottom:16px; }
.ac__all { display:inline-flex; align-items:center; gap:7px; padding:8px 14px; border:1.5px solid var(--line); border-radius:var(--pill); background:#fff; font-size:14px; font-weight:600; }
.ac__all.on { border-color:var(--dark); background:var(--dark); color:#fff; }
.ac__num { min-width:22px; padding:1px 7px; border-radius:var(--pill); background:var(--bg); color:var(--ink); font-size:12px; font-weight:800; text-align:center; }
.ac__all.on .ac__num { background:var(--yellow); color:#1b1500; }
.ac__search { flex:1 1 220px; max-width:340px; padding:9px 14px; }
.ac__sort { flex:0 1 210px; width:auto; padding:9px 12px; }
.ac__tools { display:flex; gap:8px; margin-left:auto; }
.ac__notice { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px; padding:12px 14px 12px 16px; border-radius:var(--r-md); font-size:14px; font-weight:600; line-height:1.45; }
.ac__notice.is-ok { background:#e6f4ea; color:var(--green); }
.ac__notice.is-bad { background:#fdecea; color:var(--red); }
.ac__x { flex:none; width:28px; height:28px; margin:-4px -6px 0 0; border:0; border-radius:50%; background:none; color:inherit; font-size:20px; line-height:1; }
.ac__x:hover { background:rgb(0 0 0 / .06); }
.nt-enter-active, .nt-leave-active { transition:opacity .3s, transform .3s var(--ease); }
.nt-enter-from, .nt-leave-to { opacity:0; transform:translateY(-6px); }
.ac__error { padding:10px 14px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:14px; }
.ac__empty { padding:28px 18px; border:1.5px dashed var(--line); border-radius:var(--r-lg); color:var(--muted); text-align:center; }
.ac__list { display:flex; flex-direction:column; gap:10px; }
.ac__more { display:flex; justify-content:center; margin-top:16px; }
@media (max-width:860px) { .ac__groups { grid-template-columns:1fr; } .grp { flex-direction:row; flex-wrap:wrap; align-items:baseline; gap:2px 12px; } .grp__top { flex:1 1 100%; } }
@media (max-width:700px) { .ac__search { max-width:none; } .ac__sort { flex:1 1 160px; } .ac__tools { width:100%; margin-left:0; } .ac__tools > * { flex:1; } }
@media (prefers-reduced-motion:reduce) { .grp { transition:none; } }
</style>
