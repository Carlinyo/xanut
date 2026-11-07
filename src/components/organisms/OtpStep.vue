<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { t } from '../../i18n'
import { ApiError, commonErrorKey } from '../../api'
import { useAuth } from '../../stores/auth'
import { firebaseErrorKey, phoneVerification } from '../../utils/firebasePhone'
import type { OtpChallenge } from '../../types'
import OtpInput from '../molecules/OtpInput.vue'
import AppButton from '../atoms/AppButton.vue'
import AppToggle from '../atoms/AppToggle.vue'

const props = defineProps<{ challenge: OtpChallenge; purpose: 'login' | 'register' }>()
const emit = defineEmits<{ done: []; back: [] }>()
const auth = useAuth()
const code = ref('')
const trust = ref(false)
const error = ref('')
const info = ref('')
const busy = ref(false)
const expired = ref(false)
const finished = ref(false) // код уже принят: повторные срабатывания игнорируем
const devCode = ref(props.challenge.devCode ?? '') // тестовый режим: письмо/SMS не отправлялись

// SMS через Firebase: код отправляет и проверяет Firebase в браузере, серверу уходит его подтверждение (ID-токен)
const viaFirebase = props.challenge.provider === 'firebase'
const recaptcha = ref<HTMLElement | null>(null)
const fv = viaFirebase ? phoneVerification(() => recaptcha.value) : null
const sending = ref(false)
const smsSent = ref(!viaFirebase)

// таймер «отправить ещё раз»
const wait = ref(viaFirebase ? 0 : props.challenge.resendIn)
let timer: ReturnType<typeof setInterval> | undefined
function startTimer(sec: number) {
  wait.value = sec
  clearInterval(timer)
  timer = setInterval(() => { if (--wait.value <= 0) clearInterval(timer) }, 1000)
}
if (!viaFirebase) startTimer(props.challenge.resendIn)
onUnmounted(() => { clearInterval(timer); fv?.dispose() })

/** Firebase: отправить SMS на номер проверки (при входе и регистрации сервер присылает его целиком). */
async function sendSms() {
  if (!fv || sending.value) return
  if (!props.challenge.phone) { error.value = t('otp.sendFailed'); return }
  sending.value = true
  error.value = ''
  try {
    await fv.send(props.challenge.phone)
    smsSent.value = true
    startTimer(props.challenge.resendIn || 60)
  } catch (e) {
    error.value = t(firebaseErrorKey(e))
  } finally { sending.value = false }
}
onMounted(() => { if (viaFirebase) void sendSms() })

const sentTo = computed(() => (viaFirebase && !smsSent.value
  ? t('phone.sending', { to: props.challenge.destination })
  : t(props.challenge.channel === 'email' ? 'otp.sentEmail' : 'otp.sentPhone', { to: props.challenge.destination })))

async function submit() {
  if (code.value.length !== 6 || busy.value || finished.value) return
  error.value = ''
  info.value = ''
  busy.value = true
  try {
    if (fv) {
      let firebaseToken: string
      try { firebaseToken = await fv.confirm(code.value) } catch (e) { code.value = ''; error.value = t(firebaseErrorKey(e)); return }
      await auth.verify(props.challenge.challengeId, { firebaseToken }, trust.value)
    } else {
      await auth.verify(props.challenge.challengeId, code.value, trust.value)
    }
    finished.value = true
    emit('done')
  } catch (e) {
    const c = e instanceof ApiError ? e.code : ''
    code.value = ''
    if (c === 'OTP_INVALID') error.value = t('otp.invalid')
    else if (c === 'PHONE_MISMATCH') error.value = t('phone.mismatch')
    else if (c === 'OTP_EXPIRED' || c === 'OTP_LOCKED') { expired.value = true; error.value = t(c === 'OTP_LOCKED' ? 'otp.locked' : 'otp.expired') }
    else if (c === 'EXISTS') error.value = t('auth.exists')
    else if (c === 'PHONE_EXISTS') error.value = t('auth.phoneExists')
    else error.value = t(commonErrorKey(e))
  } finally { busy.value = false }
}

const resending = ref(false) // двойной клик не должен отправлять код дважды
async function resend() {
  if (resending.value || wait.value > 0) return
  error.value = ''
  info.value = ''
  if (fv) { // SMS заново отправляет Firebase
    resending.value = true
    try { await sendSms(); if (!error.value) { code.value = ''; info.value = t('otp.resent') } } finally { resending.value = false }
    return
  }
  resending.value = true
  try {
    const r = await auth.resend(props.challenge.challengeId)
    devCode.value = r.devCode ?? ''
    code.value = ''
    info.value = t('otp.resent')
    startTimer(r.resendIn)
  } catch (e) {
    const c = e instanceof ApiError ? e.code : ''
    if (c === 'OTP_EXPIRED') { expired.value = true; error.value = t('otp.expired') }
    else if (c === 'OTP_COOLDOWN') {
      error.value = t('otp.wait')
      const retryIn = Number((e as ApiError).details.retryIn)
      if (retryIn > 0) startTimer(retryIn) // сервер сказал, сколько ждать — показываем обратный отсчёт
    }
    else error.value = t(c === 'OTP_RESEND_LIMIT' || c === 'OTP_RATE_LIMIT' ? 'otp.tooMany' : commonErrorKey(e))
  } finally { resending.value = false }
}
</script>

<template>
  <form class="otp-step" novalidate @submit.prevent="submit">
    <span class="otp-step__icon" aria-hidden="true">{{ challenge.channel === 'email' ? '✉️' : '📱' }}</span>
    <h1>{{ $t('otp.title') }}</h1>
    <p class="muted" role="status">{{ sentTo }}</p>

    <div v-if="devCode" class="otp-step__dev" role="note">
      <b>🧪 {{ $t('otp.devTitle') }}</b>
      <span>{{ $t('otp.devText') }}</span>
      <button type="button" class="otp-step__devcode" @click="code = devCode; submit()">{{ devCode }} <small>· {{ $t('otp.devFill') }}</small></button>
    </div>

    <OtpInput v-model="code" :label="$t('otp.label')" :invalid="!!error" :disabled="busy || expired || finished || !smsSent" @complete="submit" />

    <AppToggle v-if="!expired" v-model="trust">{{ $t('otp.trust') }}</AppToggle>
    <p v-if="error" class="otp-step__err" role="alert">{{ error }}</p>
    <p v-else-if="info" class="otp-step__ok" role="status">{{ info }}</p>

    <AppButton v-if="viaFirebase && !smsSent && !expired" size="lg" block :disabled="sending" @click="sendSms">
      {{ sending ? $t('common.sending') : $t('phone.sendSms') }}
    </AppButton>
    <AppButton v-else-if="!expired" type="submit" size="lg" block :disabled="busy || finished || code.length !== 6">{{ busy ? $t('common.sending') : $t('otp.confirm') }}</AppButton>
    <AppButton v-else size="lg" block @click="emit('back')">{{ $t('otp.restart') }}</AppButton>

    <div v-if="!expired" class="otp-step__links">
      <button v-if="smsSent" type="button" class="otp-step__link" :disabled="wait > 0 || resending" @click="resend">
        {{ wait > 0 ? $t('otp.resendIn', { sec: wait }) : $t('otp.resend') }}
      </button>
      <button type="button" class="otp-step__link" @click="emit('back')">{{ purpose === 'register' ? $t('otp.changeData') : $t('otp.back') }}</button>
    </div>
    <p class="muted otp-step__hint">{{ $t(viaFirebase ? 'phone.hint' : 'otp.hint') }}</p>
    <!-- невидимая проверка reCAPTCHA для SMS от Firebase -->
    <div v-if="viaFirebase" ref="recaptcha" class="otp-step__captcha" />
  </form>
</template>

<style scoped>
.otp-step { display:flex; flex-direction:column; gap:14px; text-align:center; animation:rise .5s var(--ease) backwards; }
.otp-step__icon { display:grid; place-items:center; width:64px; height:64px; margin:0 auto; border-radius:50%; background:var(--cream); font-size:30px; }
h1 { margin:0; }
p { margin:0; }
.otp-step__err { padding:10px 12px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:13px; }
.otp-step__ok { padding:10px 12px; border-radius:var(--r-md); background:#e8f6ec; color:var(--green); font-size:13px; }
.otp-step__links { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.otp-step__link { padding:4px 0; border:0; background:none; color:var(--yellow-lo); font-size:14px; font-weight:700; }
.otp-step__link:disabled { color:var(--muted); font-weight:600; cursor:default; }
.otp-step__hint { font-size:12px; }
.otp-step__dev { display:flex; flex-direction:column; align-items:center; gap:6px; padding:12px 14px; border:1.5px dashed #c99a2e; border-radius:var(--r-md); background:var(--cream); font-size:13px; }
.otp-step__devcode { padding:6px 14px; border:0; border-radius:var(--pill); background:var(--yellow); color:#1b1500; font-weight:800; font-size:18px; letter-spacing:.18em; }
.otp-step__devcode small { font-size:12px; letter-spacing:0; font-weight:700; }
.otp-step :deep(.toggle) { text-align:left; }
</style>
