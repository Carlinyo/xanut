<script setup lang="ts">
// Баллы клиенту вручную (карточка клиента в админке): начислить или снять, с причиной — её покупатель увидит в истории
// баллов. Снять можно не больше доступного: сервер проверяет это вместе с обменами покупателя.
// Ниже — прежние ручные начисления и подарок при регистрации: когда и кто из администраторов.
import { computed, ref, watch } from 'vue'
import { t } from '../../i18n'
import { ApiError, commonErrorKey } from '../../api'
import { useAdmin } from '../../stores/admin'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import type { AdminUser } from '../../types'
import FormField from './FormField.vue'
import AppButton from '../atoms/AppButton.vue'

const props = defineProps<{ user: AdminUser }>()
const emit = defineEmits<{ done: [user: AdminUser, points: number]; cancel: [] }>()
const admin = useAdmin(), authError = useAuthRedirect()

// число — строкой: поле можно очистить и набрать заново (проверяем при сохранении)
const amount = ref('')
const note = ref('')
const error = ref('')
const saving = ref(false)
watch(amount, () => (error.value = ''))

const nf = (n: number) => n.toLocaleString('en-US')
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB')
const history = computed(() => props.user.bonus.adjustments ?? [])

async function save(sign: 1 | -1) {
  const v = amount.value.trim()
  const n = /^\d+$/.test(v) ? Number(v) : NaN
  if (!(n >= 1 && n <= 1_000_000)) { error.value = t('admin.customers.bonus.errors.amount'); return }
  const available = Math.max(0, props.user.bonus.available)
  if (sign < 0 && n > available) { error.value = t('admin.customers.bonus.errors.tooMuch', { n: nf(available) }); return }
  error.value = ''
  saving.value = true
  try {
    emit('done', await admin.adjustBonus(props.user.id, sign * n, note.value.trim()), sign * n)
  } catch (e) {
    if (authError(e)) return
    // покупатель успел потратить баллы, пока форма была открыта, — показываем, сколько осталось на самом деле
    error.value = e instanceof ApiError && e.code === 'BONUS_INSUFFICIENT'
      ? t('admin.customers.bonus.errors.tooMuch', { n: nf(Math.max(0, Number(e.details.available ?? 0))) })
      : t(commonErrorKey(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="baf" :aria-busy="saving || undefined" @submit.prevent="save(1)">
    <p class="baf__now">⭐ {{ $t('admin.customers.bonus.now', { n: nf(Math.max(0, user.bonus.available)) }) }}</p>
    <div class="baf__fields">
      <div class="baf__amount">
        <FormField v-model="amount" :label="$t('admin.customers.bonus.amount')" inputmode="numeric" maxlength="7" autocomplete="off" />
      </div>
      <div class="baf__note">
        <FormField v-model="note" :label="$t('admin.customers.bonus.note')" :placeholder="$t('admin.customers.bonus.notePh')" maxlength="200" autocomplete="off" />
      </div>
    </div>
    <p v-if="error" class="baf__err" role="alert">{{ error }}</p>
    <div class="baf__actions">
      <AppButton type="submit" size="sm" :disabled="saving">＋ {{ $t('admin.customers.bonus.add') }}</AppButton>
      <AppButton type="button" size="sm" variant="light" :disabled="saving" @click="save(-1)">− {{ $t('admin.customers.bonus.take') }}</AppButton>
      <AppButton type="button" size="sm" variant="ghost" :disabled="saving" @click="emit('cancel')">{{ $t('admin.rewards.form.cancel') }}</AppButton>
    </div>
    <template v-if="history.length">
      <p class="baf__title">{{ $t('admin.customers.bonus.history') }}</p>
      <ul class="baf__hist">
        <li v-for="(a, i) in history" :key="`${a.at}-${i}`">
          <b :class="a.points > 0 ? 'is-plus' : 'is-minus'">{{ a.points > 0 ? '+' : '−' }}{{ nf(Math.abs(a.points)) }}</b>
          <span class="baf__why">{{ a.kind === 'welcome' ? $t('admin.customers.bonus.welcome') : a.note || '—' }}</span>
          <small>{{ day(a.at) }}<template v-if="a.by"> · {{ a.by }}</template></small>
        </li>
      </ul>
    </template>
  </form>
</template>

<style scoped>
.baf { display:flex; flex-direction:column; gap:10px; padding:14px 16px; border:1.5px solid var(--yellow); border-radius:var(--r-md); background:var(--cream); }
.baf[aria-busy] { opacity:.7; cursor:progress; }
.baf__now { margin:0; font-size:14px; font-weight:700; }
.baf__fields { display:flex; flex-wrap:wrap; gap:10px 12px; }
.baf__amount { flex:0 1 150px; }
.baf__note { flex:1 1 240px; }
.baf__err { margin:0; color:var(--red); font-size:13px; font-weight:600; }
.baf__actions { display:flex; flex-wrap:wrap; gap:8px; }
.baf__title { margin:4px 0 0; color:var(--muted); font-size:12px; font-weight:700; }
.baf__hist { display:flex; flex-direction:column; gap:4px; margin:0; padding:0; list-style:none; font-size:13px; }
.baf__hist li { display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 10px; }
.baf__hist b { min-width:56px; font-variant-numeric:tabular-nums; }
.baf__hist .is-plus { color:var(--green); }
.baf__hist .is-minus { color:var(--red); }
.baf__why { flex:1 1 160px; min-width:0; overflow-wrap:anywhere; }
.baf__hist small { color:var(--muted); overflow-wrap:anywhere; }
</style>
