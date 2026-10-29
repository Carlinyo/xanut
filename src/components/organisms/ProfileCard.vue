<script setup lang="ts">
// «Իմ տվյալները»: имя, телефон и адрес доставки из аккаунта — просмотр и изменение.
import { computed, reactive, ref } from 'vue'
import { t } from '../../i18n'
import { ApiError } from '../../api'
import { useAuth } from '../../stores/auth'
import { rules, serverFieldErrors } from '../../validators'
import { checkPhone, formatPhone } from '../../utils/phone'
import InfoPanel from '../molecules/InfoPanel.vue'
import FormField from '../molecules/FormField.vue'
import PhoneField from '../molecules/PhoneField.vue'
import AppButton from '../atoms/AppButton.vue'

const auth = useAuth()
const editing = ref(false), busy = ref(false), done = ref(false)
const form = reactive({ name: '', phone: '', address: '' })
const errors = reactive({ name: '', phone: '', address: '', form: '' })
const phoneOk = computed(() => checkPhone(form.phone).ok)

function start() {
  const u = auth.user!
  Object.assign(form, { name: u.name, phone: checkPhone(u.phone).ok ? u.phone : '', address: u.address ?? '' })
  Object.assign(errors, { name: '', phone: '', address: '', form: '' })
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
  try {
    await auth.updateProfile({ name: form.name.trim(), phone: form.phone, address: form.address.trim() })
    editing.value = false; done.value = true
  } catch (e) {
    const err = e instanceof ApiError ? e : null
    if (err?.code === 'VALIDATION') Object.assign(errors, serverFieldErrors(err.issues))
    else if (err?.code === 'PHONE_EXISTS') errors.phone = t('auth.phoneExists')
    else if (err?.code === 'ADDRESS_UNAVAILABLE') errors.address = t('errors.addressUnavailable')
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
      <p>📍 <span :class="{ muted: !auth.user.address }">{{ auth.user.address || $t('account.noAddress') }}</span></p>
      <p v-if="done" class="pc__ok" role="status">✓ {{ $t('account.saved') }}</p>
      <div class="pc__actions"><AppButton variant="ghost" @click="start">{{ $t('account.edit') }}</AppButton><slot /></div>
    </template>
    <form v-else class="pc__form" novalidate @submit.prevent="save">
      <FormField v-model="form.name" :label="$t('checkout.name')" :error="errors.name" autocomplete="name" />
      <PhoneField v-model="form.phone" :label="$t('checkout.phone')" :error="errors.phone" :valid="phoneOk" />
      <FormField v-model="form.address" :label="$t('checkout.address')" :error="errors.address" :placeholder="$t('checkout.addressPlaceholder')" autocomplete="street-address" />
      <small class="muted">{{ $t('account.emailNote') }}</small>
      <p v-if="errors.form" class="pc__err" role="alert">{{ errors.form }}</p>
      <div class="pc__actions">
        <AppButton type="submit" :disabled="busy">{{ busy ? $t('common.sending') : $t('account.save') }}</AppButton>
        <AppButton type="button" variant="ghost" @click="editing = false">{{ $t('account.cancel') }}</AppButton>
      </div>
    </form>
  </InfoPanel>
</template>

<style scoped>
.pc__form { display:flex; flex-direction:column; gap:12px; }
.pc__actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:6px; }
.pc__ok { color:var(--green); font-weight:600; }
.pc__err { margin:0; padding:10px 12px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:13px; }
p { overflow-wrap:anywhere; }
</style>
