<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { t } from '../../i18n'
import { ApiError, commonErrorKey } from '../../api'
import { useCart } from '../../stores/cart'
import { useAuth } from '../../stores/auth'
import { useCatalog } from '../../stores/catalog'
import { rules, serverFieldErrors } from '../../validators'
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
const cart = useCart(), auth = useAuth(), catalog = useCatalog()
const form = reactive({ name: auth.user?.name || '', phone: auth.user?.phone || '', address: '', slot: '', payment: 'cash' as 'cash' | 'card' })
const errors = reactive({ name: '', phone: '', address: '', slot: '', form: '' })
const phoneOk = computed(() => checkPhone(form.phone).ok)
function checkPhoneField() { // проверка, когда покупатель ушёл из поля
  if (!form.phone) return
  const r = rules.phone(form.phone)
  errors.phone = r === true ? '' : r
}
// ошибка поля исчезает, как только значение исправили
watch(() => form.phone, () => { if (errors.phone && phoneOk.value) errors.phone = '' })
watch(() => form.name, () => { if (errors.name && rules.name(form.name) === true) errors.name = '' })
watch(() => form.address, () => { errors.address = '' }) // прежний результат проверки относится к старому тексту
watch(() => form.slot, (v) => { if (v) errors.slot = '' })
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
/** null — адрес изменили во время проверки: новый текст проверится при уходе из поля или отправке. */
function applyAddress(ok: boolean | null) {
  if (ok === null) return
  errors.address = ok ? '' : addrState.value === 'unavailable' ? t('errors.addressUnavailable') : t('errors.addressInvalid')
}
async function verifyAddress() { // проверка, когда пользователь закончил вводить адрес
  if (rules.address(form.address) !== true) return
  try { applyAddress(await checkAddr()) } catch (e) { await fail(e) }
}
async function fail(e: unknown) {
  const err = e instanceof ApiError ? e : null
  const code = err?.code ?? ''
  if (err?.status === 401) { errors.form = t('cart.needLogin'); auth.user = null; return } // сессия истекла: корзина предложит войти
  if (code === 'SLOT_FULL' || code === 'INVALID_SLOT') { // окно заняли или оно прошло, пока клиент оформлял
    errors.slot = t(code === 'SLOT_FULL' ? 'errors.slotFull' : 'errors.slotInvalid')
    form.slot = ''
    void loadSlots()
    return
  }
  if (code === 'INVALID_PRODUCT' || code === 'NOT_ORDERABLE' || code === 'INVALID_KEBAB') {
    // корзина устарела (товар скрыли, меню шашлыка изменилось): обновляем каталог и убираем недоступное
    await catalog.load(true)
    cart.sync()
    errors.form = t('cart.changed')
    return
  }
  if (code === 'VALIDATION') {
    const fe = serverFieldErrors(err?.issues)
    if (fe.name || fe.phone || fe.address) {
      if (fe.name) errors.name = fe.name
      if (fe.phone) errors.phone = fe.phone
      if (fe.address) errors.address = fe.address
      return
    }
  }
  if (code === 'ADDRESS_INVALID') errors.address = t('errors.addressInvalid')
  else if (code === 'ADDRESS_UNAVAILABLE') errors.address = t('errors.addressUnavailable')
  else errors.form = t(commonErrorKey(e))
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
    await fail(e)
  } finally { busy.value = false }
}
</script>

<template>
  <form class="co" novalidate @submit.prevent="submit">
    <FormField v-model="form.name" :label="$t('checkout.name')" :error="errors.name" autocomplete="name" maxlength="80" />
    <PhoneField v-model="form.phone" :label="$t('checkout.phone')" :error="errors.phone" :valid="phoneOk" :hint="$t('checkout.phoneHint')" @blur="checkPhoneField" />
    <FormField
      v-model="form.address" :label="$t('checkout.address')" :error="errors.address" :hint="addrState === 'ok' ? addrFormatted : ''"
      :placeholder="$t('checkout.addressPlaceholder')" autocomplete="street-address" maxlength="200" @blur="verifyAddress"
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
