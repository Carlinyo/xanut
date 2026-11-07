<script setup lang="ts">
// «Подтвердить телефон» в личном кабинете: SMS с кодом отправляет Firebase, сервер сверяет подтверждённый номер с номером аккаунта.
import { onUnmounted, ref } from 'vue'
import { t } from '../../i18n'
import { ApiError, commonErrorKey } from '../../api'
import { useAuth } from '../../stores/auth'
import { firebaseErrorKey, phoneVerification } from '../../utils/firebasePhone'
import { formatPhone } from '../../utils/phone'
import OtpInput from './OtpInput.vue'
import AppButton from '../atoms/AppButton.vue'

const auth = useAuth()
const recaptcha = ref<HTMLElement | null>(null)
const fv = phoneVerification(() => recaptcha.value)
onUnmounted(() => { fv.dispose(); clearInterval(timer) })
const step = ref<'idle' | 'code' | 'done'>('idle')
const code = ref('')
const busy = ref(false)
const error = ref('')
const wait = ref(0)
let timer: ReturnType<typeof setInterval> | undefined
function startTimer(sec: number) {
  wait.value = sec
  clearInterval(timer)
  timer = setInterval(() => { if (--wait.value <= 0) clearInterval(timer) }, 1000)
}

async function send() {
  if (busy.value || wait.value > 0 || !auth.user) return
  busy.value = true
  error.value = ''
  try {
    await fv.send(auth.user.phone)
    code.value = ''
    step.value = 'code'
    startTimer(60)
  } catch (e) {
    error.value = t(firebaseErrorKey(e))
  } finally { busy.value = false }
}

async function confirm() {
  if (busy.value || code.value.length !== 6) return
  busy.value = true
  error.value = ''
  try {
    let token: string
    try { token = await fv.confirm(code.value) } catch (e) { code.value = ''; error.value = t(firebaseErrorKey(e)); return }
    await auth.verifyPhone(token)
    step.value = 'done'
  } catch (e) {
    const c = e instanceof ApiError ? e.code : ''
    code.value = ''
    error.value = t(c === 'PHONE_MISMATCH' ? 'phone.mismatch' : c === 'OTP_INVALID' ? 'otp.invalid' : commonErrorKey(e))
  } finally { busy.value = false }
}
</script>

<template>
  <div class="pv">
    <p v-if="step === 'done'" class="pv__ok" role="status">✓ {{ $t('phone.verified') }}</p>
    <template v-else-if="step === 'idle'">
      <p class="pv__note">⚠ {{ $t('phone.notVerified') }}</p>
      <AppButton size="sm" variant="light" :disabled="busy" @click="send">📱 {{ busy ? $t('common.sending') : $t('phone.verify') }}</AppButton>
    </template>
    <form v-else class="pv__form" novalidate @submit.prevent="confirm">
      <small class="muted">{{ $t('otp.sentPhone', { to: formatPhone(auth.user?.phone ?? '') }) }}</small>
      <OtpInput v-model="code" :label="$t('otp.label')" :invalid="!!error" :disabled="busy" @complete="confirm" />
      <div class="pv__actions">
        <AppButton type="submit" size="sm" :disabled="busy || code.length !== 6">{{ busy ? $t('common.sending') : $t('otp.confirm') }}</AppButton>
        <button type="button" class="pv__link" :disabled="wait > 0 || busy" @click="send">{{ wait > 0 ? $t('otp.resendIn', { sec: wait }) : $t('otp.resend') }}</button>
        <button type="button" class="pv__link" @click="step = 'idle'; error = ''">{{ $t('account.cancel') }}</button>
      </div>
    </form>
    <p v-if="error" class="pv__err" role="alert">{{ error }}</p>
    <div ref="recaptcha" />
  </div>
</template>

<style scoped>
.pv { display:flex; flex-direction:column; align-items:flex-start; gap:8px; margin:2px 0 4px; }
.pv p { margin:0; }
.pv__note { color:#8a5f00; font-size:13px; font-weight:600; }
.pv__ok { color:var(--green); font-weight:700; }
.pv__form { display:flex; flex-direction:column; gap:8px; width:100%; max-width:360px; }
.pv__actions { display:flex; flex-wrap:wrap; align-items:center; gap:8px 14px; }
.pv__link { padding:4px 0; border:0; background:none; color:var(--yellow-lo); font-size:13px; font-weight:700; }
.pv__link:disabled { color:var(--muted); font-weight:600; cursor:default; }
.pv__err { padding:8px 10px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:13px; }
</style>
