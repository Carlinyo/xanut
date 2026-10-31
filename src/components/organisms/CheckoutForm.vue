<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { t } from '../../i18n'
import { ApiError, commonErrorKey } from '../../api'
import { useCart } from '../../stores/cart'
import { useAuth } from '../../stores/auth'
import { useBonus } from '../../stores/bonus'
import { useCatalog } from '../../stores/catalog'
import { useConfirm, type ConfirmOptions } from '../../stores/confirm'
import { formatSlot, hourRange, money } from '../../utils/format'
import { discountLabel } from '../../utils/segments'
import { rules, serverFieldErrors } from '../../validators'
import { checkPhone, formatPhone } from '../../utils/phone'
import { uuid } from '../../utils/id'
import { useSlots } from '../../composables/useSlots'
import { useAddressCheck } from '../../composables/useAddressCheck'
import FormField from '../molecules/FormField.vue'
import PhoneField from '../molecules/PhoneField.vue'
import SlotPicker from '../molecules/SlotPicker.vue'
import PrivacyNote from '../molecules/PrivacyNote.vue'
import AppButton from '../atoms/AppButton.vue'
import AppToggle from '../atoms/AppToggle.vue'
import ChoiceToggle from '../molecules/ChoiceToggle.vue'
import type { PickerDay } from '../../types'

const emit = defineEmits<{ done: [] }>()
const cart = useCart(), auth = useAuth(), bonus = useBonus(), catalog = useCatalog(), confirm = useConfirm()
const form = reactive({ name: '', phone: '', address: '', slot: '', payment: 'cash' as 'cash' | 'card', comment: '' })
const errors = reactive({ name: '', phone: '', address: '', slot: '', form: '' })

// «Мои данные» — имя, телефон и адрес из аккаунта (сохранены при регистрации и прошлых заказах); «Новые данные» — ввести другие
type Who = 'saved' | 'new'
const saved = computed(() => (auth.user?.name && checkPhone(auth.user.phone ?? '').ok ? auth.user : null))
const who = ref<Who>(saved.value ? 'saved' : 'new')
const saveProfile = ref(false)
const whoOptions = computed(() => [
  { value: 'saved' as Who, label: t('checkout.useSaved'), icon: '👤' },
  { value: 'new' as Who, label: t('checkout.useNew'), icon: '✏️' },
])
const savedHasAddress = computed(() => !!saved.value?.address)
const fixAddress = ref(false) // сохранённый адрес не прошёл проверку — показываем поле, чтобы поправить
function fillWho() {
  fixAddress.value = false
  const u = saved.value
  if (who.value === 'saved' && u) Object.assign(form, { name: u.name, phone: u.phone, address: u.address ?? '' })
  else Object.assign(form, { name: '', phone: '', address: '' })
  errors.name = errors.phone = errors.address = ''
}
fillWho()
watch(who, fillWho)
watch(saved, (u) => { if (!u) who.value = 'new' })
// самовывоз из магазина: адрес не нужен и не проверяется (выбор — в корзине над итогом)
const pickup = computed(() => cart.method === 'pickup')
watch(pickup, () => { errors.address = '' })
// поля показываем, когда вводят новые данные; в «моих» — только адрес, если его ещё нет в аккаунте
const showContact = computed(() => who.value === 'new')
const showAddress = computed(() => !pickup.value && (who.value === 'new' || !savedHasAddress.value || fixAddress.value))
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

// В корзине только мясо — любое время с 10:00 до 22:00 с шагом 30 минут, без ограничения мест; есть хоровац — часовые
// окна (не больше 2 заказов в окно). Сменился состав корзины — SlotPicker сам сбросит время, которого больше нет в списке.
// Старый сервер времени для мяса не присылает — тогда окна.
const exact = computed(() => cart.exactTime && !!slotData.value?.times)
const pickerDays = computed<PickerDay[]>(() => (exact.value
  ? (slotData.value?.times ?? []).map((d) => ({ date: d.date, slots: d.slots.map((s) => ({ key: s.key, label: s.time })) }))
  : (slotData.value?.days ?? []).map((d) => ({ date: d.date, slots: d.slots.map((s) => ({ key: s.key, label: hourRange(s.hour), left: s.left })) }))))

// Пока заказ отправляется, кнопка заблокирована, а повторные нажатия и Enter игнорируются.
// requestId одинаков для повторов одной и той же попытки (двойной клик, повтор после обрыва сети),
// поэтому сервер создаст один заказ; если покупатель меняет данные или корзину — это уже новая попытка.
const busy = ref(false)
let requestId = uuid()
watch([form, () => cart.items, () => cart.method], () => { if (!busy.value) requestId = uuid() }, { deep: true })

function validate(): boolean {
  for (const k of ['name', 'phone', 'address'] as const) { const r = rules[k](form[k]); errors[k] = r === true ? '' : r }
  if (pickup.value) errors.address = ''
  errors.slot = form.slot ? '' : t('errors.slot')
  return !errors.name && !errors.phone && !errors.address && !errors.slot
}
/** null — адрес изменили во время проверки: новый текст проверится при уходе из поля или отправке. */
function applyAddress(ok: boolean | null) {
  if (ok === null) return
  errors.address = ok ? '' : addrState.value === 'unavailable' ? t('errors.addressUnavailable') : t('errors.addressInvalid')
  if (!ok && !showAddress.value) fixAddress.value = true // сохранённый адрес больше не проходит проверку — даём его поправить
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
  if (code === 'INVALID_PRODUCT' || code === 'NOT_ORDERABLE' || code === 'INVALID_KEBAB' || code === 'OUT_OF_STOCK') {
    // корзина устарела (товар скрыли или он закончился, меню шашлыка изменилось): обновляем каталог и убираем недоступное
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
      if (fe.address) { if (pickup.value) errors.form = fe.address; else errors.address = fe.address } // поле адреса скрыто при самовывозе
      return
    }
  }
  if (code === 'ADDRESS_INVALID') errors.address = t('errors.addressInvalid')
  else if (code === 'ADDRESS_UNAVAILABLE') errors.address = t('errors.addressUnavailable')
  else if (code === 'PHONE_EXISTS') errors.phone = t('auth.phoneExists') // «запомнить» номер, который уже у другого аккаунта
  else errors.form = t(commonErrorKey(e))
}
/** Сводка заказа для окна «Подтвердить заказ?»: кто, как и когда получает, сколько платит. */
function summary(): ConfirmOptions {
  const p = checkPhone(form.phone)
  const rows: ConfirmOptions['rows'] = [
    { label: t('confirm.order.who'), value: `${form.name.trim()}, ${p.ok ? formatPhone(p.e164) : form.phone}` },
    { label: t('cart.methodLabel'), value: pickup.value ? `🏪 ${t('cart.pickup')}` : `🚚 ${t('cart.delivery')}` },
    pickup.value ? { label: t('confirm.order.shop'), value: t('contact.address') } : { label: t('checkout.address'), value: form.address.trim() },
    { label: t(pickup.value ? 'slots.titlePickup' : 'slots.title'), value: formatSlot(form.slot, exact.value) },
    { label: t('checkout.payment'), value: form.payment === 'cash' ? t('checkout.cash') : t(pickup.value ? 'checkout.cardPickup' : 'checkout.card') },
    { label: t('cart.items'), value: t('confirm.order.items', { n: cart.count, sum: money(cart.subtotal) }) },
  ]
  if (cart.discount) rows.push({ label: discountLabel(bonus.level?.segment), value: `−${money(cart.discount)}` })
  if (!pickup.value) rows.push({ label: t('cart.delivery'), value: cart.delivery ? money(cart.delivery) : t('cart.free') })
  if (form.comment.trim()) rows.push({ label: t('checkout.comment'), value: form.comment.trim() })
  rows.push({ label: t('cart.total'), value: money(cart.total), strong: true })
  return { icon: '🧾', title: t('confirm.order.title'), text: t('confirm.order.text'), rows, yes: t('confirm.order.yes'), no: t('confirm.order.no') }
}

async function submit() {
  if (busy.value) return
  errors.form = ''
  if (!validate()) return
  busy.value = true
  try {
    // свежие баланс и группа покупателя: цена в окне подтверждения — та же, что посчитает сервер
    await bonus.load()
    if (!pickup.value) {
      const ok = await checkAddr()
      applyAddress(ok)
      if (!ok) return
    }
    // всё проверено — последний шаг: покупатель видит сводку и подтверждает заказ
    busy.value = false
    if (!(await confirm.ask(summary()))) return
    busy.value = true
    const order = await cart.checkout({
      ...form, delivery: cart.method, address: pickup.value ? '' : form.address, comment: form.comment.trim() || undefined,
      saveProfile: who.value === 'new' ? saveProfile.value : showAddress.value, // «мои данные» с новым или исправленным адресом — запоминаем его
    }, requestId)
    if (order.user) auth.user = order.user // сервер запомнил данные (или первый адрес) — в следующий раз подставятся сами
    void bonus.load() // новые «ожидающие» баллы
    // сначала «заказ принят», потом очистка: пустая корзина убирает эту форму, и событие из убранной формы Vue уже не доставит
    emit('done')
    cart.clear()
  } catch (e) {
    await fail(e)
  } finally { busy.value = false }
}
</script>

<template>
  <form class="co" novalidate @submit.prevent="submit">
    <ChoiceToggle v-if="saved" v-model="who" :options="whoOptions" :label="$t(pickup ? 'checkout.whoLabelPickup' : 'checkout.whoLabel')" />
    <div v-if="saved && who === 'saved'" class="co__saved">
      <b>{{ saved.name }}</b>
      <span>📞 {{ formatPhone(saved.phone) }}</span>
      <span v-if="!pickup && saved.address && !fixAddress">📍 {{ saved.address }}</span>
      <small v-if="errors.name" class="co__fielderr" role="alert">{{ errors.name }}</small>
      <small v-if="errors.phone" class="co__fielderr" role="alert">{{ errors.phone }}</small>
      <small v-if="!pickup && !saved.address" class="muted">{{ $t('checkout.savedNoAddress') }}</small>
    </div>
    <template v-if="showContact">
      <FormField v-model="form.name" :label="$t('checkout.name')" :error="errors.name" autocomplete="name" maxlength="80" />
      <PhoneField v-model="form.phone" :label="$t('checkout.phone')" :error="errors.phone" :valid="phoneOk" :hint="$t(pickup ? 'checkout.phoneHintPickup' : 'checkout.phoneHint')" @blur="checkPhoneField" />
    </template>
    <FormField
      v-if="showAddress"
      v-model="form.address" :label="$t('checkout.address')" :error="errors.address" :hint="addrState === 'ok' ? addrFormatted : ''"
      :placeholder="$t('checkout.addressPlaceholder')" autocomplete="street-address" maxlength="200" @blur="verifyAddress"
    />
    <small v-if="!pickup && addrState === 'checking'" class="co__checking">{{ $t('checkout.addressChecking') }}</small>
    <AppToggle v-if="saved && who === 'new'" v-model="saveProfile">{{ $t('checkout.saveProfile') }}</AppToggle>
    <SlotPicker
      v-model="form.slot" :label="$t(pickup ? 'slots.titlePickup' : 'slots.title')" :days="pickerDays" :today="slotData?.today ?? ''"
      :hint="$t(exact ? 'slots.hintMeat' : 'slots.hint')" :compact="exact"
      :loading="slotsLoading" :failed="slotsFailed" :error="errors.slot" @retry="loadSlots"
    />
    <FormField v-model="form.payment" as="select" :label="$t('checkout.payment')">
      <option value="cash">{{ $t('checkout.cash') }}</option>
      <option value="card">{{ $t(pickup ? 'checkout.cardPickup' : 'checkout.card') }}</option>
    </FormField>
    <FormField v-model="form.comment" as="textarea" rows="2" maxlength="300" :label="$t('checkout.comment')" :placeholder="$t('checkout.commentPlaceholder')" />
    <p v-if="errors.form" class="co__err" role="alert">{{ errors.form }}</p>
    <PrivacyNote />
    <AppButton type="submit" size="lg" block :disabled="busy">{{ busy ? $t('common.sending') : $t('checkout.submit') }}</AppButton>
  </form>
</template>

<style scoped>
.co { display:flex; flex-direction:column; gap:12px; margin-top:16px; }
.co__err { margin:0; padding:10px 12px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:13px; }
.co__saved { display:flex; flex-direction:column; gap:4px; padding:12px 14px; border:1.5px solid var(--yellow-lo); border-radius:var(--r-md); background:var(--cream); font-size:14px; overflow-wrap:anywhere; animation:rise .4s var(--ease) backwards; }
.co__saved .muted { font-size:12px; }
.co__fielderr { color:var(--red); font-size:12px; }
.co__checking { margin-top:-6px; color:var(--muted); font-size:12px; }
</style>
