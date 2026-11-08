<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch, watchEffect } from 'vue'
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
import { distanceKm, GeoError, geoErrorKey, inZone, locate, reverseAddress } from '../../utils/geo'
import { paymentLabel } from '../../utils/payment'
import FormField from '../molecules/FormField.vue'
import PhoneField from '../molecules/PhoneField.vue'
import SlotPicker from '../molecules/SlotPicker.vue'
import PrivacyNote from '../molecules/PrivacyNote.vue'
import OrderFlow from '../molecules/OrderFlow.vue'
import AppButton from '../atoms/AppButton.vue'
import AppToggle from '../atoms/AppToggle.vue'
import ChoiceToggle from '../molecules/ChoiceToggle.vue'
import AddressMapPicker from './AddressMapPicker.vue'
import type { GeoPoint, PaymentMethod, PickerDay } from '../../types'

/** done: ok — заказ принят; online — принят с онлайн-оплатой: платить можно, когда магазин его примет (придёт письмо). */
const emit = defineEmits<{ done: [result: 'ok' | 'online'] }>()
const cart = useCart(), auth = useAuth(), bonus = useBonus(), catalog = useCatalog(), confirm = useConfirm()
const form = reactive({ name: '', phone: '', address: '', point: null as GeoPoint | null, slot: '', payment: 'cash' as PaymentMethod, comment: '' })
const errors = reactive({ name: '', phone: '', address: '', slot: '', form: '' })
const geoMsg = ref('') // ошибка геолокации или подсказка «допишите адрес»
const geoErr = ref(false) // geoMsg — ошибка (красным), а не подсказка
function showGeo(text: string, error = true) { geoMsg.value = text; geoErr.value = error }

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
// поле адреса в «моих данных»: покупатель хочет другой адрес или сохранённый не прошёл проверку
const editAddress = ref(false)

// Точка доставки на карте (геолокация или выбор на карте) — по ней курьер найдёт место, а текст адреса — описание к ней.
// Дописали к тексту подъезд или квартиру — точка остаётся; переписали адрес — точка снимается (она про другое место).
let pointText = ''
function setPoint(p: GeoPoint | null, text = '') { form.point = p; pointText = text }
watch(() => form.address, (v) => { if (form.point && !v.includes(pointText)) setPoint(null) })

function fillWho() {
  editAddress.value = false
  geoMsg.value = ''
  const u = saved.value
  if (who.value === 'saved' && u) {
    Object.assign(form, { name: u.name, phone: u.phone, address: u.address ?? '' })
    setPoint(u.address ? u.addressGeo ?? null : null, u.address ?? '')
  } else {
    Object.assign(form, { name: '', phone: '', address: '' })
    setPoint(null)
  }
  errors.name = errors.phone = errors.address = ''
}
fillWho()
watch(who, fillWho)
watch(saved, (u) => { if (!u) who.value = 'new' })
// самовывоз из магазина: адрес не нужен и не проверяется (выбор — в корзине над итогом)
const pickup = computed(() => cart.method === 'pickup')
watch(pickup, () => { errors.address = '' })
// Оплата: при доставке — наличными курьеру или картой онлайн (AmeriaBank); «картой в магазине» — только при самовывозе.
// Онлайн-оплаты нет, пока магазин не получил данные банка (сервер говорит об этом в /api/config).
const online = computed(() => catalog.config.onlinePay === true)
const payOptions = computed<PaymentMethod[]>(() => [
  'cash', ...(pickup.value ? ['card' as const] : []), ...(online.value ? ['online' as const] : []),
])
watch(payOptions, (list) => { if (!list.includes(form.payment)) form.payment = 'cash' })

// Цена доставки зависит от расстояния: точка на карте — считаем сами, адрес текстом — по ответу проверки адреса
const { data: slotData, loading: slotsLoading, failed: slotsFailed, load: loadSlots } = useSlots()
const { state: addrState, formatted: addrFormatted, km: addrKm, check: checkAddr } = useAddressCheck(() => form.address)
watchEffect(() => {
  const z = catalog.config.zone
  cart.deliveryKm = pickup.value ? null : form.point && z ? distanceKm(z, form.point) : addrKm.value
})
onUnmounted(() => { cart.deliveryKm = null })
const farFee = computed(() => catalog.config.deliveryFar)
// поля показываем, когда вводят новые данные; в «моих» — только адрес, если его ещё нет в аккаунте
const showContact = computed(() => who.value === 'new')
const showAddress = computed(() => !pickup.value && (who.value === 'new' || !savedHasAddress.value || editAddress.value))
const phoneOk = computed(() => checkPhone(form.phone).ok)
function checkPhoneField() { // проверка, когда покупатель ушёл из поля
  if (!form.phone) return
  const r = rules.phone(form.phone)
  errors.phone = r === true ? '' : r
}
// ошибка поля исчезает, как только значение исправили
watch(() => form.phone, () => { if (errors.phone && phoneOk.value) errors.phone = '' })
watch(() => form.name, () => { if (errors.name && rules.name(form.name) === true) errors.name = '' })
watch(() => form.address, () => { errors.address = ''; geoMsg.value = '' }) // прежний результат проверки относится к старому тексту
watch(() => form.slot, (v) => { if (v) errors.slot = '' })

// «Моё местоположение» и «Отметить на карте»
const zone = computed(() => catalog.config.zone)
const ACCURATE_M = 100 // геолокация точнее — сразу подставляем адрес; грубее (компьютер, Wi‑Fi) — открываем карту, чтобы поправить
const outOfZone = () => t('map.outOfZone', { km: zone.value?.radiusKm ?? '' })
const locating = ref(false)
const map = reactive({ open: false, start: null as GeoPoint | null, accuracy: undefined as number | undefined, note: '' })
function openMap(start: GeoPoint | null = form.point, accuracy?: number, note = '') {
  Object.assign(map, { open: true, start, accuracy, note })
}
/** Точка выбрана: адрес места — в поле (если геокодер его знает), иначе просим покупателя написать адрес самому. */
function usePoint(p: GeoPoint, text: string) {
  if (text) form.address = text
  setPoint({ lat: p.lat, lon: p.lon }, text)
  showGeo(text ? '' : t('checkout.pointNoAddress'), false)
  errors.address = ''
}
function onMapPick(p: GeoPoint, text: string) {
  map.open = false
  usePoint(p, text)
}
async function useMyLocation() {
  if (locating.value) return
  geoMsg.value = ''
  locating.value = true
  try {
    const here = await locate()
    if (here.accuracy > ACCURATE_M) { openMap(here, here.accuracy, t('map.refine')); return }
    if (!inZone(zone.value, here)) { showGeo(outOfZone()); return }
    let text = ''
    try {
      const r = await reverseAddress(here)
      if (!r.inZone) { showGeo(outOfZone()); return }
      text = r.formatted
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) throw e
      // адрес места не узнали (геокодер или сеть) — точку всё равно ставим, адрес покупатель напишет сам
    }
    usePoint(here, text)
  } catch (e) {
    if (e instanceof GeoError) showGeo(t(geoErrorKey(e)))
    else await fail(e)
  } finally {
    locating.value = false
  }
}

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
  if (!errors.address && form.point && !inZone(zone.value, form.point)) errors.address = t('errors.addressOutOfZone')
  if (pickup.value) errors.address = ''
  if (errors.address && !showAddress.value) editAddress.value = true // ошибка в сохранённом адресе — показываем поле
  errors.slot = form.slot ? '' : t('errors.slot')
  return !errors.name && !errors.phone && !errors.address && !errors.slot
}
/** null — адрес изменили во время проверки: новый текст проверится при уходе из поля или отправке. */
function applyAddress(ok: boolean | null) {
  if (ok === null) return
  errors.address = ok ? '' : addrState.value === 'unavailable' ? t('errors.addressUnavailable') : t('errors.addressInvalid')
  if (!ok && !showAddress.value) editAddress.value = true // сохранённый адрес больше не проходит проверку — даём его поправить
}
async function verifyAddress() { // проверка, когда пользователь закончил вводить адрес (с точкой на карте текст не проверяем)
  if (form.point || rules.address(form.address) !== true) return
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
  if (code === 'VALIDATION' && err?.issues?.some((i) => i.path === 'payment')) { // «картой в магазине» при доставке нельзя
    form.payment = online.value ? 'online' : 'cash'
    errors.form = t(online.value ? 'checkout.cardOnlineError' : 'checkout.cashOnlyError')
    return
  }
  if (code === 'ONLINE_UNAVAILABLE') { // магазин выключил онлайн-оплату, пока покупатель оформлял заказ
    await catalog.load(true)
    form.payment = 'cash'
    errors.form = t('checkout.onlineUnavailable')
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
  else if (code === 'ADDRESS_OUT_OF_ZONE') { errors.address = t('errors.addressOutOfZone'); editAddress.value = true }
  else if (code === 'ADDRESS_UNAVAILABLE') errors.address = t('errors.addressUnavailable')
  else if (code === 'PHONE_EXISTS') errors.phone = t('auth.phoneExists') // «запомнить» номер, который уже у другого аккаунта
  else if (code === 'TOO_MANY_ACTIVE') errors.form = t('checkout.tooManyActive', { max: Number(err?.details.max ?? 3), phone: t('contact.phone') })
  else errors.form = t(commonErrorKey(e))
}
/** Сводка заказа для окна «Подтвердить заказ?»: кто, как и когда получает, сколько платит. */
function summary(): ConfirmOptions {
  const p = checkPhone(form.phone)
  const rows: ConfirmOptions['rows'] = [
    { label: t('confirm.order.who'), value: `${form.name.trim()}, ${p.ok ? formatPhone(p.e164) : form.phone}` },
    { label: t('cart.methodLabel'), value: pickup.value ? `🏪 ${t('cart.pickup')}` : `🚚 ${t('cart.delivery')}` },
    pickup.value ? { label: t('confirm.order.shop'), value: t('contact.address') }
      : { label: t('checkout.address'), value: form.address.trim() + (form.point ? ` · 📌 ${t('checkout.pointShort')}` : '') },
    { label: t(pickup.value ? 'slots.titlePickup' : 'slots.title'), value: formatSlot(form.slot, exact.value) },
    { label: t('checkout.payment'), value: paymentLabel(form.payment, cart.method) },
    { label: t('cart.items'), value: t('confirm.order.items', { n: cart.count, sum: money(cart.subtotal) }) },
  ]
  if (cart.discount) rows.push({ label: discountLabel(bonus.level?.segment), value: `−${money(cart.discount)}` })
  if (!pickup.value) rows.push({ label: t('cart.delivery') + (cart.far && cart.delivery ? ` (${t('cart.farShort', { km: farFee.value?.overKm ?? 5 })})` : ''), value: cart.delivery ? money(cart.delivery) : t('cart.free') })
  if (form.comment.trim()) rows.push({ label: t('checkout.comment'), value: form.comment.trim() })
  rows.push({ label: t('cart.total'), value: money(cart.total), strong: true })
  const pay = form.payment === 'online'
  return { icon: '🧾', title: t('confirm.order.title'), text: t(pay ? 'confirm.order.textOnline' : 'confirm.order.text'), rows,
    yes: t('confirm.order.yes'), no: t('confirm.order.no') }
}

async function submit() {
  if (busy.value) return
  errors.form = ''
  if (!validate()) return
  busy.value = true
  try {
    // свежие баланс и группа покупателя: цена в окне подтверждения — та же, что посчитает сервер
    await bonus.load()
    if (!pickup.value && !form.point) { // точка на карте уже задаёт место — текст геокодером не проверяем
      const ok = await checkAddr()
      applyAddress(ok)
      if (!ok) return
    }
    // всё проверено — последний шаг: покупатель видит сводку и подтверждает заказ
    busy.value = false
    if (!(await confirm.ask(summary()))) return
    busy.value = true
    const payment: PaymentMethod = !pickup.value && form.payment === 'card' ? 'cash' : form.payment
    const order = await cart.checkout({
      ...form, delivery: cart.method, address: pickup.value ? '' : form.address, point: pickup.value ? null : form.point,
      comment: form.comment.trim() || undefined, payment,
      saveProfile: who.value === 'new' ? saveProfile.value : showAddress.value, // «мои данные» с новым или исправленным адресом — запоминаем его
    }, requestId)
    if (order.user) auth.user = order.user // сервер запомнил данные (или первый адрес) — в следующий раз подставятся сами
    void bonus.load() // новые «ожидающие» баллы
    // онлайн-оплата — не сейчас: сначала магазин примет заказ, покупателю придёт письмо, и он оплатит из «Իմ հաշիվը»
    // сначала «заказ принят», потом очистка: пустая корзина убирает эту форму, и событие из убранной формы Vue уже не доставит
    emit('done', payment === 'online' ? 'online' : 'ok')
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
      <span v-if="!pickup && saved.address && !editAddress">
        📍 {{ saved.address }}<template v-if="saved.addressGeo"> · 📌</template>
        <button type="button" class="co__link" @click="editAddress = true">{{ $t('checkout.changeAddress') }}</button>
      </span>
      <small v-if="errors.name" class="co__fielderr" role="alert">{{ errors.name }}</small>
      <small v-if="errors.phone" class="co__fielderr" role="alert">{{ errors.phone }}</small>
      <small v-if="!pickup && !saved.address" class="muted">{{ $t('checkout.savedNoAddress') }}</small>
    </div>
    <template v-if="showContact">
      <FormField v-model="form.name" :label="$t('checkout.name')" :error="errors.name" autocomplete="name" maxlength="80" />
      <PhoneField v-model="form.phone" :label="$t('checkout.phone')" :error="errors.phone" :valid="phoneOk" :hint="$t(pickup ? 'checkout.phoneHintPickup' : 'checkout.phoneHint')" @blur="checkPhoneField" />
    </template>
    <template v-if="showAddress">
      <FormField
        v-model="form.address" :label="$t('checkout.address')" :error="errors.address" :hint="addrState === 'ok' ? addrFormatted : ''"
        :placeholder="$t('checkout.addressPlaceholder')" autocomplete="street-address" maxlength="200" @blur="verifyAddress"
      />
      <div class="co__geo">
        <button type="button" class="co__geo-btn" :disabled="locating" @click="useMyLocation">
          <span aria-hidden="true">🎯</span>{{ $t(locating ? 'checkout.locating' : 'checkout.myLocation') }}
        </button>
        <button type="button" class="co__geo-btn" @click="openMap()"><span aria-hidden="true">🗺️</span>{{ $t('checkout.pickOnMap') }}</button>
      </div>
      <p v-if="form.point" class="co__point">
        <span>📌 {{ $t('checkout.pointSet') }}</span>
        <button type="button" class="co__link" @click="openMap()">{{ $t('checkout.pointEdit') }}</button>
        <button type="button" class="co__x" :aria-label="$t('checkout.pointRemove')" :title="$t('checkout.pointRemove')" @click="setPoint(null)">✕</button>
      </p>
      <small v-if="geoMsg" class="co__geo-msg" :class="{ err: geoErr }" :role="geoErr ? 'alert' : 'status'">{{ geoMsg }}</small>
    </template>
    <small v-if="!pickup && addrState === 'checking'" class="co__checking">{{ $t('checkout.addressChecking') }}</small>
    <AppToggle v-if="saved && who === 'new'" v-model="saveProfile">{{ $t('checkout.saveProfile') }}</AppToggle>
    <SlotPicker
      v-model="form.slot" :label="$t(pickup ? 'slots.titlePickup' : 'slots.title')" :days="pickerDays" :today="slotData?.today ?? ''"
      :hint="$t(exact ? 'slots.hintMeat' : 'slots.hint')" :compact="exact"
      :loading="slotsLoading" :failed="slotsFailed" :error="errors.slot" @retry="loadSlots"
    />
    <small v-if="cart.far && farFee && cart.delivery" class="co__far" role="status">🚚 {{ $t('checkout.farHint', { km: farFee.overKm, fee: money(farFee.fee) }) }}</small>
    <FormField v-if="payOptions.length > 1" v-model="form.payment" as="select" :label="$t('checkout.payment')">
      <option v-for="p in payOptions" :key="p" :value="p">{{ paymentLabel(p, cart.method) }}</option>
    </FormField>
    <div v-else class="co__pay">
      <span class="co__pay-label">{{ $t('checkout.payment') }}</span>
      <p class="co__pay-cash">💵 {{ $t('checkout.cash') }}<small>{{ $t('checkout.cashOnly') }}</small></p>
    </div>
    <small v-if="form.payment === 'online'" class="co__online">🔒 {{ $t('checkout.onlineHint') }}</small>
    <small v-else-if="!pickup && online" class="co__online">{{ $t('checkout.cardOnlineOnly') }}</small>
    <FormField v-model="form.comment" as="textarea" rows="2" maxlength="300" :label="$t('checkout.comment')" :placeholder="$t('checkout.commentPlaceholder')" />
    <!-- как пойдёт заказ и о чём придут письма: шаг оплаты — только при оплате онлайн -->
    <OrderFlow :online="form.payment === 'online'" :email="auth.user?.email" />
    <p v-if="errors.form" class="co__err" role="alert">{{ errors.form }}</p>
    <PrivacyNote />
    <AppButton type="submit" size="lg" block :disabled="busy">
      {{ busy ? $t('common.sending') : $t('checkout.submit') }}
    </AppButton>
    <Teleport to="body">
      <Transition name="overlay">
        <AddressMapPicker
          v-if="map.open" :start="map.start" :accuracy="map.accuracy" :zone="zone" :note="map.note"
          @pick="onMapPick" @close="map.open = false"
        />
      </Transition>
    </Teleport>
  </form>
</template>

<style scoped>
.co { display:flex; flex-direction:column; gap:12px; margin-top:16px; }
.co__err { margin:0; padding:10px 12px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:13px; }
.co__saved { display:flex; flex-direction:column; gap:4px; padding:12px 14px; border:1.5px solid var(--yellow-lo); border-radius:var(--r-md); background:var(--cream); font-size:14px; overflow-wrap:anywhere; animation:rise .4s var(--ease) backwards; }
.co__saved .muted { font-size:12px; }
.co__fielderr { color:var(--red); font-size:12px; }
.co__checking { margin-top:-6px; color:var(--muted); font-size:12px; }
.co__link { padding:0; border:0; background:none; color:var(--yellow-lo); font:inherit; font-size:13px; font-weight:700; text-decoration:underline; text-underline-offset:2px; cursor:pointer; }
.co__saved .co__link { margin-left:8px; }
.co__geo { display:flex; flex-wrap:wrap; gap:8px; margin-top:-4px; }
.co__geo-btn { display:inline-flex; flex:1 1 180px; white-space:nowrap; align-items:center; justify-content:center; gap:6px; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--r-md); background:#fff; color:var(--ink); font:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:border-color var(--t), background var(--t); }
.co__geo-btn:hover:not(:disabled) { border-color:var(--yellow); background:var(--cream); }
.co__geo-btn:disabled { opacity:.6; cursor:progress; }
.co__point { display:flex; align-items:center; gap:10px; margin:-4px 0 0; padding:6px 6px 6px 12px; border:1.5px solid var(--yellow-lo); border-radius:var(--r-md); background:var(--cream); font-size:13px; font-weight:600; }
.co__point span { flex:1; }
.co__x { display:grid; place-items:center; width:28px; height:28px; padding:0; border:0; border-radius:50%; background:transparent; color:var(--muted); cursor:pointer; }
.co__x:hover { background:var(--line); color:var(--ink); }
.co__geo-msg { margin-top:-4px; color:var(--muted); font-size:12px; line-height:1.45; }
.co__geo-msg.err { color:var(--red); }
.co__pay { display:flex; flex-direction:column; gap:6px; font-size:14px; }
.co__pay-label { font-weight:600; }
.co__pay-cash { display:flex; flex-direction:column; gap:2px; margin:0; padding:10px 14px; border:1.5px solid var(--line); border-radius:var(--r-md); background:var(--bg); font-weight:700; }
.co__pay-cash small { color:var(--muted); font-size:12px; font-weight:500; }
.co__online { margin-top:-6px; color:var(--muted); font-size:12px; line-height:1.45; }
.co__far { margin-top:-4px; padding:8px 12px; border-radius:var(--r-md); background:var(--cream); color:#7a5600; font-size:12.5px; font-weight:600; line-height:1.45; }
</style>
