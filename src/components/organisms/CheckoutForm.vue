<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { t } from '../../i18n'
import { ApiError } from '../../api'
import { useCart } from '../../stores/cart'
import { useAuth } from '../../stores/auth'
import { phoneServerError, rules } from '../../validators'
import { checkPhone } from '../../utils/phone'
import { uuid } from '../../utils/id'
import { useSlots } from '../../composables/useSlots'
import { useAddressCheck } from '../../composables/useAddressCheck'
import FormField from '../molecules/FormField.vue'
import PhoneField from '../molecules/PhoneField.vue'
import SlotPicker from '../molecules/SlotPicker.vue'
import PrivacyNote from '../molecules/PrivacyNote.vue'
import AppButton from '../atoms/AppButton.vue'

const emit = defineEmits<{ done: [] }>()
const cart = useCart(), auth = useAuth()
const form = reactive({ name: auth.user?.name || '', phone: auth.user?.phone || '', address: '', slot: '', payment: 'cash' as 'cash' | 'card' })
const errors = reactive({ name: '', phone: '', address: '', slot: '', form: '' })
const phoneOk = computed(() => checkPhone(form.phone).ok)
function checkPhoneField() { // проверка, когда покупатель ушёл из поля
  if (!form.phone) return
  const r = rules.phone(form.phone)
  errors.phone = r === true ? '' : r
}
watch(() => form.phone, () => { if (errors.phone && phoneOk.value) errors.phone = '' }) // ошибка исчезает, как только номер стал верным
const { data: slotData, loading: slotsLoading, failed: slotsFailed, load: loadSlots } = useSlots()
const { state: addrState, formatted: addrFormatted, check: checkAddr } = useAddressCheck(() => form.address)

onMounted(loadSlots) // каждое открытие корзины — свежие данные о занятых окнах

// Пока заказ отправляется, кнопка заблокирована, а повторные нажатия и Enter игнорируются.
// requestId одинаков для повторов одной и той же попытки (двойной клик, повтор после обрыва сети),
// поэтому сервер создаст один заказ; если покупатель меняет данные или корзину — это уже новая попытка.
const busy = ref(false)
let requestId = uuid()
watch([form, () => cart.items], () => { if (!busy.value) requestId = uuid() }, { deep: true })

function validate(): boolean {
  for (const k of ['name', 'phone', 'address'] as const) { const r = rules[k](form[k]); errors[k] = r === true ? '' : r }
  errors.slot = form.slot ? '' : t('errors.slot')
  return !errors.name && !errors.phone && !errors.address && !errors.slot
}
function applyAddress(ok: boolean) {
  errors.address = ok ? '' : addrState.value === 'unavailable' ? t('errors.addressUnavailable') : t('errors.addressInvalid')
}
async function verifyAddress() { // проверка, когда пользователь закончил вводить адрес
  if (rules.address(form.address) === true) applyAddress(await checkAddr())
}
function fail(e: unknown) {
  const code = e instanceof ApiError ? e.code : ''
  if (e instanceof ApiError && e.status === 401) { auth.user = null; errors.form = t('cart.needLogin') } // сессия истекла
  else if (code === 'SLOT_FULL') { errors.slot = t('errors.slotFull'); form.slot = ''; loadSlots() } // окно заняли, пока клиент оформлял
  else if (code === 'INVALID_SLOT') { errors.slot = t('errors.slotInvalid'); form.slot = ''; loadSlots() }
  else if (code === 'VALIDATION' && phoneServerError(e instanceof ApiError ? e.issues : undefined)) errors.phone = phoneServerError((e as ApiError).issues)
  else if (code === 'ADDRESS_INVALID') errors.address = t('errors.addressInvalid')
  else if (code === 'ADDRESS_UNAVAILABLE') errors.address = t('errors.addressUnavailable')
  else errors.form = t('errors.generic')
}
async function submit() {
  if (busy.value) return
  errors.form = ''
  if (!validate()) return
  busy.value = true
  try {
    const ok = await checkAddr()
    applyAddress(ok)
    if (!ok) return
    await cart.checkout({ ...form }, requestId)
    emit('done')
  } catch (e) {
    fail(e)
  } finally { busy.value = false }
}
</script>

<template>
  <form class="co" novalidate @submit.prevent="submit">
    <FormField v-model="form.name" :label="$t('checkout.name')" :error="errors.name" autocomplete="name" />
    <PhoneField v-model="form.phone" :label="$t('checkout.phone')" :error="errors.phone" :valid="phoneOk" :hint="$t('checkout.phoneHint')" @blur="checkPhoneField" />
    <FormField
      v-model="form.address" :label="$t('checkout.address')" :error="errors.address" :hint="addrState === 'ok' ? addrFormatted : ''"
      :placeholder="$t('checkout.addressPlaceholder')" autocomplete="street-address" @blur="verifyAddress"
    />
    <small v-if="addrState === 'checking'" class="co__checking">{{ $t('checkout.addressChecking') }}</small>
    <SlotPicker
      v-model="form.slot" :label="$t('slots.title')" :days="slotData?.days ?? []" :today="slotData?.today ?? ''"
      :loading="slotsLoading" :failed="slotsFailed" :error="errors.slot" @retry="loadSlots"
    />
    <FormField v-model="form.payment" as="select" :label="$t('checkout.payment')">
      <option value="cash">{{ $t('checkout.cash') }}</option>
      <option value="card">{{ $t('checkout.card') }}</option>
    </FormField>
    <p v-if="errors.form" class="co__err" role="alert">{{ errors.form }}</p>
    <PrivacyNote />
    <AppButton type="submit" size="lg" block :disabled="busy">{{ busy ? $t('common.sending') : $t('checkout.submit') }}</AppButton>
  </form>
</template>

<style scoped>
.co { display:flex; flex-direction:column; gap:12px; margin-top:16px; }
.co__err { margin:0; padding:10px 12px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:13px; }
.co__checking { margin-top:-6px; color:var(--muted); font-size:12px; }
</style>
