<script setup lang="ts">
// Акции групп клиентов: скидка на товары, баллы с покупки, бесплатная доставка, и с какого числа заказов клиент
// становится постоянным и VIP. Сохраняется после подтверждения: новые цены действуют со следующих заказов.
import { reactive, ref, watch } from 'vue'
import { t } from '../../i18n'
import { commonErrorKey } from '../../api'
import { useAdmin } from '../../stores/admin'
import { useConfirm } from '../../stores/confirm'
import { useAuthRedirect } from '../../composables/useAuthRedirect'
import { SEGMENT_ICON, SEGMENTS } from '../../utils/segments'
import type { Segment, SegmentSettings } from '../../types'
import FormField from './FormField.vue'
import AppToggle from '../atoms/AppToggle.vue'
import AppButton from '../atoms/AppButton.vue'

const props = defineProps<{ value: SegmentSettings }>()
const emit = defineEmits<{ done: []; cancel: [] }>()
const admin = useAdmin(), confirm = useConfirm(), authError = useAuthRedirect()

// числа — строками: поле можно очистить и набрать заново (проверяем при сохранении)
const str = (n: number) => String(n)
const form = reactive({
  perks: Object.fromEntries(SEGMENTS.map((s) => {
    const p = props.value.perks[s]
    return [s, { discount: str(p.discount), bonusPercent: str(p.bonusPercent), freeDelivery: p.freeDelivery }]
  })) as Record<Segment, { discount: string; bonusPercent: string; freeDelivery: boolean }>,
  rules: { regularOrders: str(props.value.rules.regularOrders), vipOrders: str(props.value.rules.vipOrders), vipSpent: str(props.value.rules.vipSpent) },
})
const errors = reactive<Record<string, string>>({})
const formError = ref('')
const saving = ref(false)
// исправили поле — его ошибка больше не нужна (порог VIP сверяется с порогом постоянного — сбрасываем и его)
const fields = (): Record<string, string> => ({
  ...Object.fromEntries(SEGMENTS.flatMap((s) => [[`${s}.discount`, form.perks[s].discount], [`${s}.bonusPercent`, form.perks[s].bonusPercent]])),
  ...form.rules,
})
watch(fields, (now, before) => {
  for (const k of Object.keys(now)) if (now[k] !== before[k]) delete errors[k]
  if (now.regularOrders !== before.regularOrders) delete errors.vipOrders
})

const int = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN)
function check(key: string, v: string, min: number, max: number, msg: string): number {
  const n = int(v)
  if (!(n >= min && n <= max)) errors[key] = msg
  return n
}
function validate(): SegmentSettings | null {
  for (const k of Object.keys(errors)) delete errors[k]
  formError.value = ''
  const perks = {} as SegmentSettings['perks']
  for (const s of SEGMENTS) {
    const f = form.perks[s]
    perks[s] = {
      discount: check(`${s}.discount`, f.discount, 0, 50, t('admin.segments.errors.discount')),
      bonusPercent: check(`${s}.bonusPercent`, f.bonusPercent, 0, 30, t('admin.segments.errors.bonus')),
      freeDelivery: f.freeDelivery,
    }
  }
  const regularOrders = check('regularOrders', form.rules.regularOrders, 1, 1000, t('admin.segments.errors.orders'))
  const vipOrders = check('vipOrders', form.rules.vipOrders, 1, 10_000, t('admin.segments.errors.orders'))
  const vipSpent = check('vipSpent', form.rules.vipSpent, 0, 100_000_000, t('admin.segments.errors.spent'))
  if (!errors.regularOrders && !errors.vipOrders && vipOrders < regularOrders) errors.vipOrders = t('admin.segments.errors.vipBeforeRegular', { n: regularOrders })
  return Object.keys(errors).length ? null : { perks, rules: { regularOrders, vipOrders, vipSpent } }
}

async function save() {
  if (saving.value) return
  const value = validate()
  if (!value) return
  if (!(await confirm.ask({ icon: '🏷', title: t('admin.segments.confirm.title'), text: t('admin.segments.confirm.text'), yes: t('admin.segments.confirm.yes') }))) return
  saving.value = true
  try {
    await admin.saveSegments(value)
    emit('done')
  } catch (e) {
    if (!authError(e)) formError.value = t(commonErrorKey(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="pf" novalidate @submit.prevent="save">
    <header class="pf__head">
      <h3>🏷 {{ $t('admin.segments.title') }}</h3>
      <p>{{ $t('admin.segments.lead') }}</p>
    </header>
    <div class="pf__grid">
      <fieldset v-for="s in SEGMENTS" :key="s" class="pf__seg" :class="`is-${s}`">
        <legend>{{ SEGMENT_ICON[s] }} {{ $t('segments.names.' + s) }}</legend>
        <p v-if="s === 'new'" class="pf__rule">{{ $t('segments.rule.new') }}</p>
        <FormField
          v-else-if="s === 'regular'" v-model="form.rules.regularOrders" :label="$t('admin.segments.regularOrders')" :error="errors.regularOrders"
          inputmode="numeric" maxlength="4"
        />
        <template v-else>
          <FormField v-model="form.rules.vipOrders" :label="$t('admin.segments.vipOrders')" :error="errors.vipOrders" inputmode="numeric" maxlength="5" />
          <FormField
            v-model="form.rules.vipSpent" :label="$t('admin.segments.vipSpent')" :error="errors.vipSpent" inputmode="numeric" maxlength="9"
            :placeholder="$t('admin.segments.vipSpentOff')"
          />
        </template>
        <div class="pf__nums">
          <FormField v-model="form.perks[s].discount" :label="$t('admin.segments.discount')" :error="errors[`${s}.discount`]" inputmode="numeric" maxlength="2" />
          <FormField v-model="form.perks[s].bonusPercent" :label="$t('admin.segments.bonus')" :error="errors[`${s}.bonusPercent`]" inputmode="numeric" maxlength="2" />
        </div>
        <AppToggle v-model="form.perks[s].freeDelivery">🚚 {{ $t('admin.segments.freeDelivery') }}</AppToggle>
      </fieldset>
    </div>
    <p class="pf__note">{{ $t('admin.segments.note') }}</p>
    <p v-if="formError" class="pf__err" role="alert">{{ formError }}</p>
    <div class="pf__act">
      <AppButton type="submit" :disabled="saving">{{ saving ? $t('state.loading') : $t('admin.segments.save') }}</AppButton>
      <AppButton variant="light" type="button" :disabled="saving" @click="emit('cancel')">{{ $t('admin.rewards.form.cancel') }}</AppButton>
    </div>
  </form>
</template>

<style scoped>
.pf { margin-bottom:18px; padding:clamp(14px, 2.4vw, 22px); border:1.5px solid var(--yellow); border-radius:var(--r-lg); background:#fffdf6; animation:rise .4s var(--ease); }
.pf__head h3 { margin:0 0 4px; font-size:18px; }
.pf__head p { max-width:75ch; margin:0 0 14px; color:var(--muted); font-size:14px; line-height:1.5; }
.pf__grid { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:14px; }
.pf__seg { display:flex; flex-direction:column; gap:12px; min-width:0; margin:0; padding:14px; border:1px solid var(--line); border-radius:var(--r-md); background:#fff; }
.pf__seg legend { padding:0 6px; font-weight:800; }
.pf__seg.is-vip { border-color:var(--dark); }
.pf__rule { margin:0; padding:10px 12px; border-radius:var(--r-md); background:var(--bg); color:var(--muted); font-size:13px; }
/* акции — внизу каждой колонки, на одной линии во всех трёх группах */
.pf__nums { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:auto; }
.pf__note { margin:12px 0 0; color:var(--muted); font-size:13px; line-height:1.5; }
.pf__err { margin:10px 0 0; padding:9px 12px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:14px; }
.pf__act { display:flex; flex-wrap:wrap; gap:10px; margin-top:14px; }
@media (max-width:900px) { .pf__grid { grid-template-columns:1fr; } }
</style>
