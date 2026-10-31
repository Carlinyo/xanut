<script setup lang="ts">
import { ref, watch } from 'vue'
import { t } from '../../i18n'
import type { PickerDay } from '../../types'
import AppButton from '../atoms/AppButton.vue'

// Выбор времени: часовые окна (заказ с хоровацем, у окна есть left — свободные места) или точное время
// (заказ только из мяса, left не задан — мест сколько угодно). compact — узкие кнопки для «10:30».
const props = defineProps<{
  modelValue: string; days: PickerDay[]; today: string; loading: boolean; failed: boolean; label: string; hint: string; error?: string; compact?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string]; retry: [] }>()

const active = ref('')
watch(() => props.days, (days) => {
  if (!days.some((d) => d.date === active.value)) active.value = days[0]?.date ?? ''
  // выбранное окно могло занять другое лицо, оно прошло или корзина сменила вид времени — сбрасываем выбор
  const free = days.flatMap((d) => d.slots).some((s) => s.key === props.modelValue && (s.left === undefined || s.left > 0))
  if (props.modelValue && !free) emit('update:modelValue', '')
}, { immediate: true })

const tomorrow = (): string => new Date(Date.parse(props.today + 'T00:00:00Z') + 86_400_000).toISOString().slice(0, 10)
const dayLabel = (date: string): string =>
  date === props.today ? t('slots.today') : date === tomorrow() ? t('slots.tomorrow') : date.slice(8, 10) + '.' + date.slice(5, 7)
</script>

<template>
  <fieldset class="sp" :class="{ 'is-invalid': !!error }">
    <legend>{{ label }}</legend>
    <p v-if="loading && !days.length" class="muted">{{ $t('slots.loading') }}</p>
    <div v-else-if="failed" class="sp__fail">
      <span>{{ $t('state.error') }}</span>
      <AppButton size="sm" variant="light" @click="emit('retry')">{{ $t('state.retry') }}</AppButton>
    </div>
    <p v-else-if="!days.length" class="muted">{{ $t('slots.none') }}</p>
    <template v-else>
      <div class="sp__tabs" role="tablist">
        <button v-for="d in days" :key="d.date" type="button" role="tab" :aria-selected="d.date === active" class="sp__tab" :class="{ on: d.date === active }" @click="active = d.date">
          {{ dayLabel(d.date) }}
        </button>
      </div>
      <div class="sp__grid" :class="{ 'sp__grid--compact': compact }" role="radiogroup" :aria-label="label">
        <template v-for="d in days" :key="d.date">
          <template v-if="d.date === active">
            <button
              v-for="s in d.slots" :key="s.key" type="button" role="radio" class="sp__slot" :class="{ on: modelValue === s.key }"
              :aria-checked="modelValue === s.key" :disabled="s.left === 0" @click="emit('update:modelValue', s.key)"
            >
              <b>{{ s.label }}</b>
              <small v-if="s.left === 0">{{ $t('slots.full') }}</small>
            </button>
          </template>
        </template>
      </div>
      <p class="muted sp__hint">{{ hint }}</p>
    </template>
    <small v-if="error" class="sp__err" role="alert">{{ error }}</small>
  </fieldset>
</template>

<style scoped>
.sp { min-width:0; margin:0; padding:0; border:0; font-size:14px; }
legend { padding:0 0 8px; font-weight:600; }
.sp__tabs { display:flex; gap:6px; margin-bottom:10px; }
.sp__tab { padding:8px 16px; border:1.5px solid var(--line); border-radius:var(--pill); background:#fff; font-size:13px; font-weight:600; transition:background .2s, border-color .2s; }
.sp__tab.on { border-color:var(--yellow); background:var(--cream); }
.sp__grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(104px, 1fr)); gap:8px; }
.sp__grid--compact { grid-template-columns:repeat(auto-fill, minmax(72px, 1fr)); }
.sp__slot { display:flex; flex-direction:column; align-items:center; gap:2px; padding:10px 6px; border:1.5px solid var(--line); border-radius:var(--r-md); background:#fff; font-size:13px; transition:border-color .2s, background .2s, transform .2s var(--ease); }
.sp__slot:hover:not(:disabled) { border-color:var(--yellow); transform:translateY(-2px); }
.sp__slot.on { border-color:var(--yellow-lo); background:var(--yellow); }
.sp__slot:disabled { background:var(--bg); color:#9aa6a3; cursor:not-allowed; }
.sp__slot:disabled b { text-decoration:line-through; font-weight:600; }
.sp__slot small { font-size:11px; }
.sp__hint { margin:8px 0 0; font-size:12px; }
.sp__fail { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.sp__err { display:block; margin-top:6px; color:var(--red); font-size:12px; }
.is-invalid .sp__slot:not(:disabled) { border-color:#f1b9b5; }
</style>
