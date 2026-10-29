<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { t } from '../../i18n'
import { ApiError, commonErrorKey } from '../../api'
import { useAuth } from '../../stores/auth'
import { useCatalog } from '../../stores/catalog'
import type { Channel, OtpChallenge } from '../../types'
import { passwordError, rules, serverFieldErrors } from '../../validators'
import { checkPhone } from '../../utils/phone'
import { suggestEmail } from '../../utils/email'
import FormField from '../molecules/FormField.vue'
import PhoneField from '../molecules/PhoneField.vue'
import PasswordField from '../molecules/PasswordField.vue'
import AppButton from '../atoms/AppButton.vue'
import AppToggle from '../atoms/AppToggle.vue'
import ChannelPicker from '../molecules/ChannelPicker.vue'
import OtpStep from './OtpStep.vue'

const props = withDefaults(defineProps<{ mode?: 'login' | 'register' }>(), { mode: 'login' })
const route = useRoute(), router = useRouter(), auth = useAuth(), catalog = useCatalog()
const channels = computed<Channel[]>(() => catalog.config.otpChannels?.length ? catalog.config.otpChannels : ['email'])
const channel = ref<Channel>(channels.value[0])
// настройки сервера приходят позже — канал всегда должен быть из разрешённых
watch(channels, (list) => { if (!list.includes(channel.value)) channel.value = list[0] })
const challenge = ref<OtpChallenge | null>(null) // пока не null — показываем шаг ввода кода
const isReg = computed(() => props.mode === 'register')

type Field = 'name' | 'phone' | 'address' | 'email' | 'password' | 'confirm' | 'consent'
const FIELDS: Field[] = ['name', 'phone', 'address', 'email', 'password', 'confirm', 'consent']
const form = reactive({ name: '', phone: '', address: '', email: '', password: '', confirm: '', consent: false })
const errors = reactive<Record<Field, string>>({ name: '', phone: '', address: '', email: '', password: '', confirm: '', consent: '' })
const formError = ref('')
const emailSuggestion = ref('')
const busy = ref(false)
const phoneOk = computed(() => checkPhone(form.phone).ok)
const pwContext = computed(() => ({ name: form.name, email: form.email, phone: form.phone }))

/** Текст ошибки поля по текущему значению ('' — поле в порядке). Те же правила проверяет сервер. */
function messageFor(f: Field): string {
  const r = (rule: true | string) => (rule === true ? '' : rule)
  switch (f) {
    case 'name': return r(rules.name(form.name))
    case 'phone': return r(rules.phone(form.phone))
    case 'address': return form.address.trim() ? r(rules.address(form.address)) : '' // необязательное поле
    case 'email': return r(isReg.value ? rules.email(form.email) : rules.emailLoose(form.email))
    case 'password': return isReg.value ? passwordError(form.password, pwContext.value) : form.password ? '' : t('errors.passwordRequired')
    case 'confirm': return form.confirm === form.password ? '' : t('errors.confirm')
    case 'consent': return form.consent ? '' : t('errors.consent')
  }
}
const check = (f: Field) => !(errors[f] = messageFor(f))
const visible = (): Field[] => (isReg.value ? FIELDS : ['email', 'password'])

/** Проверка при уходе из поля: пустое поле не ругаем, пока человек не нажал кнопку. */
function onBlur(f: Field) {
  if (f === 'email') emailSuggestion.value = suggestEmail(form.email) ?? ''
  if (form[f] !== '') check(f)
}
// поле стало верным — его ошибка сразу исчезает (и ошибка сервера тоже, раз значение изменили)
for (const f of FIELDS) watch(() => form[f], () => { if (errors[f] && !messageFor(f)) errors[f] = '' })
watch(() => form.password, () => { if (errors.confirm && !messageFor('confirm')) errors.confirm = '' })
watch(() => form.email, () => { if (emailSuggestion.value && suggestEmail(form.email) !== emailSuggestion.value) emailSuggestion.value = '' })
watch(() => props.mode, () => {
  FIELDS.forEach((f) => (errors[f] = ''))
  formError.value = ''; emailSuggestion.value = ''; challenge.value = null
})

function applySuggestion() {
  form.email = emailSuggestion.value
  emailSuggestion.value = ''
  check('email')
}

// только путь внутри сайта: «//evil.com» и «/\evil.com» браузер считает ссылкой на чужой домен
const redirect = computed(() => {
  const r = String(route.query.redirect || '')
  return /^\/(?![/\\])/.test(r) ? r : '/'
})

async function submit() {
  if (busy.value) return
  formError.value = ''
  if (!visible().map(check).every(Boolean)) return // map, а не every: подсветить все ошибки сразу
  busy.value = true
  try {
    if (isReg.value) {
      const { name, email, phone, password, consent } = form
      const address = form.address.trim() || undefined
      challenge.value = await auth.register({ name, email, phone, password, consent, channel: channel.value, address })
    } else {
      challenge.value = await auth.login(form.email, form.password)
      if (!challenge.value) router.push(redirect.value) // доверенное устройство: код не нужен
    }
  } catch (e) {
    const err = e instanceof ApiError ? e : null
    const code = err?.code ?? ''
    if (code === 'VALIDATION') {
      const fe = serverFieldErrors(err?.issues)
      if (Object.keys(fe).length) { Object.assign(errors, fe); return } // ошибка — под тем полем, к которому относится
    }
    if (code === 'EXISTS') { errors.email = t('auth.exists'); return }
    if (code === 'PHONE_EXISTS') { errors.phone = t('auth.phoneExists'); return }
    formError.value =
      code === 'INVALID' ? t('auth.invalid')
        : code === 'OTP_RATE_LIMIT' ? t('otp.tooMany')
        : code === 'OTP_SEND_FAILED' ? t('otp.sendFailed')
        : t(commonErrorKey(e))
  } finally { busy.value = false }
}
function onVerified() {
  form.password = ''
  form.confirm = ''
  router.push(redirect.value)
}
</script>

<template>
  <div v-if="challenge" class="auth">
    <OtpStep :challenge="challenge" :purpose="mode" @done="onVerified" @back="challenge = null" />
  </div>
  <form v-else class="auth" novalidate @submit.prevent="submit">
    <h1>{{ isReg ? $t('auth.register') : $t('auth.login') }}</h1>
    <FormField v-if="isReg" v-model="form.name" :label="$t('auth.name')" :error="errors.name" autocomplete="name" maxlength="80" @blur="onBlur('name')" />
    <PhoneField v-if="isReg" v-model="form.phone" :label="$t('auth.phone')" :error="errors.phone" :valid="phoneOk" @blur="onBlur('phone')" />
    <FormField
      v-if="isReg" v-model="form.address" :label="$t('auth.address')" :error="errors.address" :placeholder="$t('checkout.addressPlaceholder')"
      autocomplete="street-address" maxlength="200" @blur="onBlur('address')"
    />
    <small v-if="isReg && !errors.address" class="auth__note">{{ $t('auth.addressHint') }}</small>
    <FormField
      v-model="form.email" type="email" :label="$t('auth.email')" :error="errors.email" autocomplete="email"
      inputmode="email" autocapitalize="off" spellcheck="false" @blur="onBlur('email')"
    />
    <p v-if="emailSuggestion" class="auth__suggest">
      {{ $t('auth.didYouMean') }} <button type="button" @click="applySuggestion">{{ emailSuggestion }}</button>
    </p>
    <PasswordField
      v-model="form.password" :label="$t('auth.password')" :error="errors.password" :policy="isReg" :context="pwContext"
      :autocomplete="isReg ? 'new-password' : 'current-password'" @blur="onBlur('password')"
    />
    <PasswordField v-if="isReg" v-model="form.confirm" :label="$t('auth.confirm')" :error="errors.confirm" autocomplete="new-password" @blur="onBlur('confirm')" />
    <ChannelPicker v-if="isReg && channels.length > 1" v-model="channel" :channels="channels" :label="$t('otp.channelLabel')" />
    <p v-else-if="isReg" class="auth__channel"><span aria-hidden="true">{{ channel === 'email' ? '✉️' : '📱' }}</span>{{ $t('otp.single.' + channel) }}</p>
    <AppToggle v-if="isReg" v-model="form.consent" :invalid="!!errors.consent">
      {{ $t('privacy.consentBefore') }}<RouterLink to="/privacy" target="_blank" rel="noopener">{{ $t('privacy.linkText') }}</RouterLink>{{ $t('privacy.consentAfter') }}
    </AppToggle>
    <small v-if="isReg && errors.consent" class="auth__field-err" role="alert">{{ errors.consent }}</small>
    <p v-if="formError" class="auth__err" role="alert">{{ formError }}</p>
    <AppButton type="submit" size="lg" block :disabled="busy">{{ busy ? $t('common.sending') : isReg ? $t('otp.sendCode') : $t('auth.loginBtn') }}</AppButton>
    <p class="muted auth__switch">
      <template v-if="isReg">{{ $t('auth.hasAccount') }} <RouterLink :to="{ path: '/login', query: route.query }">{{ $t('auth.login') }}</RouterLink></template>
      <template v-else>{{ $t('auth.noAccount') }} <RouterLink :to="{ path: '/register', query: route.query }">{{ $t('auth.registerBtn') }}</RouterLink></template>
    </p>
  </form>
</template>

<style scoped>
.auth { display:flex; flex-direction:column; gap:14px; max-width:440px; margin:12px auto 32px; padding:clamp(18px, 4vw, 30px); border:1px solid var(--line); border-radius:var(--r-lg); background:#fff; box-shadow:var(--shadow-md); animation:rise .7s var(--ease) backwards; }
h1 { margin:0 0 4px; }
.auth__err { margin:0; padding:10px 12px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:13px; }
.auth__switch { margin:0; text-align:center; }
.auth__field-err { margin-top:-8px; color:var(--red); font-size:12px; }
.auth__switch a { color:var(--yellow-lo); font-weight:700; }
.auth__suggest { margin:-6px 0 0; font-size:13px; color:var(--muted); }
.auth__note { margin-top:-8px; color:var(--muted); font-size:12px; }
.auth__channel { display:flex; align-items:center; gap:8px; margin:0; padding:10px 12px; border-radius:var(--r-md); background:var(--cream); font-size:13px; }
.auth__suggest button { padding:0; border:0; background:none; color:var(--yellow-lo); font-weight:700; text-decoration:underline; }
</style>
