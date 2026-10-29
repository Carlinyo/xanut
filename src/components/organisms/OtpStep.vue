<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { t } from '../../i18n'
import { ApiError } from '../../api'
import { useAuth } from '../../stores/auth'
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

// таймер «отправить ещё раз»
const wait = ref(props.challenge.resendIn)
let timer: ReturnType<typeof setInterval> | undefined
function startTimer(sec: number) {
  wait.value = sec
  clearInterval(timer)
  timer = setInterval(() => { if (--wait.value <= 0) clearInterval(timer) }, 1000)
}
startTimer(props.challenge.resendIn)
onUnmounted(() => clearInterval(timer))

const sentTo = computed(() => t(props.challenge.channel === 'email' ? 'otp.sentEmail' : 'otp.sentPhone', { to: props.challenge.destination }))

async function submit() {
  if (code.value.length !== 6 || busy.value || finished.value) return
  error.value = ''
  info.value = ''
  busy.value = true
  try {
    await auth.verify(props.challenge.challengeId, code.value, trust.value)
    finished.value = true
    emit('done')
  } catch (e) {
    const c = e instanceof ApiError ? e.code : ''
    code.value = ''
    if (c === 'OTP_INVALID') error.value = t('otp.invalid')
    else if (c === 'OTP_EXPIRED' || c === 'OTP_LOCKED') { expired.value = true; error.value = t(c === 'OTP_LOCKED' ? 'otp.locked' : 'otp.expired') }
    else if (c === 'EXISTS') error.value = t('auth.exists')
    else error.value = t('errors.generic')
  } finally { busy.value = false }
}

async function resend() {
  error.value = ''
  info.value = ''
  try {
    const r = await auth.resend(props.challenge.challengeId)
    devCode.value = r.devCode ?? ''
    code.value = ''
    info.value = t('otp.resent')
    startTimer(r.resendIn)
  } catch (e) {
    const c = e instanceof ApiError ? e.code : ''
    if (c === 'OTP_EXPIRED') { expired.value = true; error.value = t('otp.expired') }
    else error.value = t(c === 'OTP_RESEND_LIMIT' || c === 'OTP_RATE_LIMIT' ? 'otp.tooMany' : c === 'OTP_COOLDOWN' ? 'otp.wait' : 'errors.generic')
  }
}
</script>

<template>
  <form class="otp-step" novalidate @submit.prevent="submit">
    <span class="otp-step__icon" aria-hidden="true">{{ challenge.channel === 'email' ? '✉️' : '📱' }}</span>
    <h1>{{ $t('otp.title') }}</h1>
    <p class="muted">{{ sentTo }}</p>

    <div v-if="devCode" class="otp-step__dev" role="note">
      <b>🧪 {{ $t('otp.devTitle') }}</b>
      <span>{{ $t('otp.devText') }}</span>
      <button type="button" class="otp-step__devcode" @click="code = devCode; submit()">{{ devCode }} <small>· {{ $t('otp.devFill') }}</small></button>
    </div>

    <OtpInput v-model="code" :label="$t('otp.label')" :invalid="!!error" :disabled="busy || expired || finished" @complete="submit" />

    <AppToggle v-if="!expired" v-model="trust">{{ $t('otp.trust') }}</AppToggle>
    <p v-if="error" class="otp-step__err" role="alert">{{ error }}</p>
    <p v-else-if="info" class="otp-step__ok" role="status">{{ info }}</p>

    <AppButton v-if="!expired" type="submit" size="lg" block :disabled="busy || finished || code.length !== 6">{{ busy ? $t('common.sending') : $t('otp.confirm') }}</AppButton>
    <AppButton v-else size="lg" block @click="emit('back')">{{ $t('otp.restart') }}</AppButton>

    <div v-if="!expired" class="otp-step__links">
      <button type="button" class="otp-step__link" :disabled="wait > 0" @click="resend">
        {{ wait > 0 ? $t('otp.resendIn', { sec: wait }) : $t('otp.resend') }}
      </button>
      <button type="button" class="otp-step__link" @click="emit('back')">{{ purpose === 'register' ? $t('otp.changeData') : $t('otp.back') }}</button>
    </div>
    <p class="muted otp-step__hint">{{ $t('otp.hint') }}</p>
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
