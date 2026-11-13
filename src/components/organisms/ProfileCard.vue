<script setup lang="ts">
// «Իմ տվյալները»: имя, телефон и адрес доставки из аккаунта — просмотр и изменение.
// Адрес можно отметить на карте или взять из геолокации (как при оформлении заказа): точку запоминаем вместе с адресом.
import { computed, reactive, ref } from 'vue'
import { t } from '../../i18n'
import { ApiError, commonErrorKey } from '../../api'
import { useAuth } from '../../stores/auth'
import { useGeoPoint } from '../../composables/useGeoPoint'
import { rules, serverFieldErrors } from '../../validators'
import { checkPhone, formatPhone } from '../../utils/phone'
import type { GeoPoint } from '../../types'
import InfoPanel from '../molecules/InfoPanel.vue'
import FormField from '../molecules/FormField.vue'
import PhoneField from '../molecules/PhoneField.vue'
import AppButton from '../atoms/AppButton.vue'
import AddressMapPicker from './AddressMapPicker.vue'

const auth = useAuth()
const editing = ref(false), busy = ref(false), done = ref(false)
const form = reactive({ name: '', phone: '', address: '', point: null as GeoPoint | null })
const errors = reactive({ name: '', phone: '', address: '', form: '' })
const phoneOk = computed(() => checkPhone(form.phone).ok)
const { zone, msg: geoMsg, msgError: geoErr, setPoint, map, openMap, onMapPick, locating, useMyLocation } =
  useGeoPoint(form, { onError: (e) => { errors.form = t(commonErrorKey(e)) }, onPoint: () => { errors.address = '' } })

function start() {
  const u = auth.user!
  Object.assign(form, { name: u.name, phone: checkPhone(u.phone).ok ? u.phone : '', address: u.address ?? '' })
  setPoint(u.address ? u.addressGeo ?? null : null, u.address ?? '')
  Object.assign(errors, { name: '', phone: '', address: '', form: '' })
  geoMsg.value = ''
  done.value = false
  editing.value = true
}
function validate() {
  const r = (x: true | string) => (x === true ? '' : x)
  errors.name = r(rules.name(form.name))
  errors.phone = r(rules.phone(form.phone))
  errors.address = form.address.trim() ? r(rules.address(form.address)) : ''
  return !errors.name && !errors.phone && !errors.address
}
async function save() {
  if (busy.value || !validate()) return
  busy.value = true; errors.form = ''
  const address = form.address.trim()
  try {
    // точка — только вместе с адресом; null — точку сняли (или её не было)
    await auth.updateProfile({ name: form.name.trim(), phone: form.phone, address, point: address ? form.point : null })
    editing.value = false; done.value = true
  } catch (e) {
    const err = e instanceof ApiError ? e : null
    if (err?.code === 'VALIDATION') Object.assign(errors, serverFieldErrors(err.issues))
    else if (err?.code === 'PHONE_EXISTS') errors.phone = t('auth.phoneExists')
    else if (err?.code === 'ADDRESS_UNAVAILABLE') errors.address = t('errors.addressUnavailable')
    else if (err?.code === 'ADDRESS_OUT_OF_ZONE') errors.address = t('errors.addressOutOfZone')
    else errors.form = t('errors.generic')
  } finally { busy.value = false }
}
</script>

<template>
  <InfoPanel v-if="auth.user" :title="$t('account.profile')">
    <template v-if="!editing">
      <p><b>{{ auth.user.name }}</b></p>
      <p>✉️ {{ auth.user.email }}</p>
      <p>📞 {{ formatPhone(auth.user.phone) }}</p>
      <p>
        📍 <span :class="{ muted: !auth.user.address }">{{ auth.user.address || $t('account.noAddress') }}</span>
        <span v-if="auth.user.address && auth.user.addressGeo" :title="$t('checkout.pointSet')"> · 📌</span>
      </p>
      <p v-if="done" class="pc__ok" role="status">✓ {{ $t('account.saved') }}</p>
      <div class="pc__actions"><AppButton variant="light" @click="start">✏️ {{ $t('account.edit') }}</AppButton><slot /></div>
    </template>
    <form v-else class="pc__form" novalidate @submit.prevent="save">
      <FormField v-model="form.name" :label="$t('checkout.name')" :error="errors.name" autocomplete="name" />
      <PhoneField v-model="form.phone" :label="$t('checkout.phone')" :error="errors.phone" :valid="phoneOk" />
      <FormField v-model="form.address" :label="$t('checkout.address')" :error="errors.address" :placeholder="$t('checkout.addressPlaceholder')" autocomplete="street-address" />
      <div class="pc__geo">
        <button type="button" class="pc__geo-btn" :disabled="locating" @click="useMyLocation">
          <span aria-hidden="true">🎯</span>{{ $t(locating ? 'checkout.locating' : 'checkout.myLocation') }}
        </button>
        <button type="button" class="pc__geo-btn" @click="openMap()"><span aria-hidden="true">🗺️</span>{{ $t('checkout.pickOnMap') }}</button>
      </div>
      <p v-if="form.point" class="pc__point">
        <span>📌 {{ $t('checkout.pointSet') }}</span>
        <button type="button" class="pc__link" @click="openMap()">{{ $t('checkout.pointEdit') }}</button>
        <button type="button" class="pc__x" :aria-label="$t('checkout.pointRemove')" :title="$t('checkout.pointRemove')" @click="setPoint(null)">✕</button>
      </p>
      <small v-if="geoMsg" class="pc__geo-msg" :class="{ err: geoErr }" :role="geoErr ? 'alert' : 'status'">{{ geoMsg }}</small>
      <small class="muted">{{ $t('account.emailNote') }}</small>
      <p v-if="errors.form" class="pc__err" role="alert">{{ errors.form }}</p>
      <div class="pc__actions">
        <AppButton type="submit" :disabled="busy">{{ busy ? $t('common.sending') : $t('account.save') }}</AppButton>
        <AppButton type="button" variant="light" @click="editing = false">{{ $t('account.cancel') }}</AppButton>
      </div>
    </form>
    <Teleport to="body">
      <Transition name="overlay">
        <AddressMapPicker
          v-if="map.open" :start="map.start" :accuracy="map.accuracy" :zone="zone" :note="map.note"
          @pick="onMapPick" @close="map.open = false"
        />
      </Transition>
    </Teleport>
  </InfoPanel>
</template>

<style scoped>
.pc__form { display:flex; flex-direction:column; gap:12px; }
.pc__actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:6px; }
.pc__ok { color:var(--green); font-weight:600; }
.pc__err { margin:0; padding:10px 12px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:13px; }
p { overflow-wrap:anywhere; }
/* «Моё местоположение» и «Отметить на карте» — как при оформлении заказа */
.pc__geo { display:flex; flex-wrap:wrap; gap:8px; margin-top:-4px; }
.pc__geo-btn { display:inline-flex; flex:1 1 180px; white-space:nowrap; align-items:center; justify-content:center; gap:6px; padding:9px 12px; border:1.5px solid var(--line); border-radius:var(--r-md); background:#fff; color:var(--ink); font:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:border-color var(--t), background var(--t); }
.pc__geo-btn:hover:not(:disabled) { border-color:var(--yellow); background:var(--cream); }
.pc__geo-btn:disabled { opacity:.6; cursor:progress; }
.pc__point { display:flex; align-items:center; gap:10px; margin:-4px 0 0; padding:6px 6px 6px 12px; border:1.5px solid var(--yellow-lo); border-radius:var(--r-md); background:var(--cream); font-size:13px; font-weight:600; }
.pc__point span { flex:1; }
.pc__link { padding:0; border:0; background:none; color:var(--yellow-lo); font:inherit; font-size:13px; font-weight:700; text-decoration:underline; text-underline-offset:2px; cursor:pointer; }
.pc__x { display:grid; place-items:center; width:28px; height:28px; padding:0; border:0; border-radius:50%; background:transparent; color:var(--muted); cursor:pointer; }
.pc__x:hover { background:var(--line); color:var(--ink); }
.pc__geo-msg { margin-top:-4px; color:var(--muted); font-size:12px; line-height:1.45; }
.pc__geo-msg.err { color:var(--red); }
</style>
