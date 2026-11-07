<script setup lang="ts">
// «Забыли пароль»: почта → код на подтверждённую почту или телефон аккаунта → новый пароль → сразу вход.
// Сервер при этом закрывает все прежние сессии: если пароль знал кто-то чужой, он из аккаунта выйдет.
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { t } from '../../i18n'
import { ApiError, commonErrorKey } from '../../api'
import { useAuth } from '../../stores/auth'
import type { OtpChallenge } from '../../types'
import { passwordError, rules, serverFieldErrors } from '../../validators'
import { checkPhone } from '../../utils/phone'
import { firebaseErrorKey, phoneVerification } from '../../utils/firebasePhone'
import FormField from '../molecules/FormField.vue'
import PhoneField from '../molecules/PhoneField.vue'
import PasswordField from '../molecules/PasswordField.vue'
import OtpInput from '../molecules/OtpInput.vue'
import AppButton from '../atoms/AppButton.vue'

const route = useRoute(), router = useRouter(), auth = useAuth()

// SMS через Firebase (код аккаунта по телефону): номер целиком сервер не раскрывает — покупатель вводит его сам,
// Firebase отправляет на него SMS, а сервер сверяет подтверждённый номер с номером аккаунта.
const recaptcha = ref<HTMLElement | null>(null)
const fv = phoneVerification(() => recaptcha.value)
const fb = reactive({ phone: '', sent: false, sending: false, error: '', token: '' })
const viaFirebase = computed(() => challenge.value?.provider === 'firebase')
onUnmounted(() => fv.dispose())
async function sendSms() {
  if (fb.sending) return
  const p = checkPhone(fb.phone)
  if (!p.ok) { fb.error = t('errors.phone'); return }
  fb.sending = true
  fb.error = ''
  try {
    await fv.send(p.e164)
    Object.assign(fb, { sent: true, token: '' })
    form.code = ''
    startTimer(challenge.value?.resendIn || 60)
  } catch (e) {
    fb.error = t(firebaseErrorKey(e))
  } finally { fb.sending = false }
}
const step = ref<'email' | 'code' | 'done'>('email')
const challenge = ref<OtpChallenge | null>(null)
// почту, введённую на странице входа, страница передаёт через состояние истории (не через адрес — он попадает в журналы)
const form = reactive({ email: typeof history.state?.email === 'string' ? (history.state.email as string) : '', code: '', password: '', confirm: '' })
const errors = reactive({ email: '', code: '', password: '', confirm: '', form: '' })
const notFound = ref(false)
const busy = ref(false)
const expired = ref(false) // код истёк или исчерпаны попытки — только «начать заново»
const info = ref('')
const devCode = ref('') // тестовый режим: письмо и SMS не отправлялись, код показываем на экране
const pwContext = computed(() => ({ email: form.email }))
const passwordBox = ref<HTMLElement | null>(null)
const card = ref<HTMLElement | null>(null)
// шаги разной высоты: после смены шага начало карточки должно быть на экране (иначе на телефоне виден только подвал)
watch(step, () => nextTick(() => {
  const top = card.value?.getBoundingClientRect().top ?? 0
  if (top < 0 || top > innerHeight * 0.6) card.value?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}))

// только путь внутри сайта: «//evil.com» и «/\evil.com» браузер считает ссылкой на чужой домен
const redirect = computed(() => {
  const r = String(route.query.redirect || '')
  return /^\/(?![/\\])/.test(r) ? r : '/'
})

const wait = ref(0) // «отправить ещё раз» — через столько секунд
let timer: ReturnType<typeof setInterval> | undefined
function startTimer(sec: number) {
  wait.value = sec
  clearInterval(timer)
  timer = setInterval(() => { if (--wait.value <= 0) clearInterval(timer) }, 1000)
}
onUnmounted(() => clearInterval(timer))

watch(() => form.email, () => { errors.email = ''; notFound.value = false })
watch(() => form.code, (v) => { if (v) errors.code = '' }) // начали вводить заново — подсказка уходит (очистка после ошибки её не прячет)
watch(() => [form.password, form.confirm], () => {
  if (errors.password && !passwordError(form.password, pwContext.value)) errors.password = ''
  if (errors.confirm && form.confirm === form.password) errors.confirm = ''
})

async function sendCode() {
  if (busy.value) return
  errors.form = ''
  const ok = rules.emailLoose(form.email)
  if (ok !== true) { errors.email = ok; return }
  busy.value = true
  try {
    const c = await auth.resetStart(form.email.trim())
    challenge.value = c
    devCode.value = c.devCode ?? ''
    Object.assign(form, { code: '', password: '', confirm: '' })
    expired.value = false
    info.value = ''
    Object.assign(fb, { phone: '', sent: false, error: '', token: '' })
    if (c.provider === 'firebase') { fv.dispose(); wait.value = 0 } // SMS ещё не отправлена: сначала номер
    else startTimer(c.resendIn)
    step.value = 'code'
  } catch (e) {
    const code = e instanceof ApiError ? e.code : ''
    if (code === 'NOT_FOUND') { notFound.value = true; errors.email = t('reset.notFound') }
    else if (code === 'VALIDATION') errors.email = t('errors.email')
    else errors.form = t(code === 'OTP_RATE_LIMIT' ? 'otp.tooMany' : code === 'OTP_SEND_FAILED' ? 'otp.sendFailed' : commonErrorKey(e))
  } finally { busy.value = false }
}

/** Код введён — сразу к новому паролю (после того как поле кода само вернёт себе фокус). */
function toPassword() {
  setTimeout(() => passwordBox.value?.querySelector('input')?.focus(), 0)
}

async function save() {
  if (busy.value || !challenge.value || expired.value) return
  errors.form = ''
  info.value = ''
  errors.code = form.code.length === 6 ? '' : t('reset.codeRequired')
  errors.password = passwordError(form.password, pwContext.value)
  errors.confirm = form.confirm === form.password ? '' : t('errors.confirm')
  if (errors.code || errors.password || errors.confirm) return
  busy.value = true
  try {
    if (viaFirebase.value) {
      // код проверяет Firebase; подтверждение храним: если сервер отклонит пароль, повторно вводить код не нужно
      if (!fb.token) {
        try { fb.token = await fv.confirm(form.code) } catch (e) { errors.code = t(firebaseErrorKey(e)); form.code = ''; return }
      }
      await auth.resetConfirm(challenge.value.challengeId, { firebaseToken: fb.token }, form.password)
    } else {
      await auth.resetConfirm(challenge.value.challengeId, form.code, form.password)
    }
    Object.assign(form, { code: '', password: '', confirm: '' })
    step.value = 'done'
  } catch (e) {
    const err = e instanceof ApiError ? e : null
    const code = err?.code ?? ''
    const fe = code === 'VALIDATION' ? serverFieldErrors(err?.issues) : {}
    if (fe.password) errors.password = fe.password // пароль из утечек или не по правилам — код при этом не потрачен
    else if (code === 'PHONE_MISMATCH') { Object.assign(fb, { sent: false, token: '' }); form.code = ''; fb.error = t('phone.resetMismatch') }
    else if (code === 'OTP_INVALID') { errors.code = t('otp.invalid'); form.code = ''; fb.token = '' }
    else if (code === 'OTP_EXPIRED' || code === 'OTP_LOCKED') { expired.value = true; errors.form = t(code === 'OTP_LOCKED' ? 'otp.locked' : 'otp.expired') }
    else errors.form = t(commonErrorKey(e))
  } finally { busy.value = false }
}

const resending = ref(false) // двойной клик не должен отправлять код дважды
async function resend() {
  if (resending.value || wait.value > 0 || !challenge.value) return
  errors.form = ''
  info.value = ''
  resending.value = true
  if (viaFirebase.value) { // SMS заново отправляет Firebase
    try { await sendSms(); if (!fb.error) info.value = t('otp.resent') } finally { resending.value = false }
    return
  }
  try {
    const r = await auth.resend(challenge.value.challengeId)
    devCode.value = r.devCode ?? ''
    form.code = ''
    info.value = t('otp.resent')
    startTimer(r.resendIn)
  } catch (e) {
    const c = e instanceof ApiError ? e.code : ''
    if (c === 'OTP_EXPIRED') { expired.value = true; errors.form = t('otp.expired') }
    else if (c === 'OTP_COOLDOWN') {
      errors.form = t('otp.wait')
      const retryIn = Number((e as ApiError).details.retryIn)
      if (retryIn > 0) startTimer(retryIn)
    }
    else errors.form = t(c === 'OTP_RESEND_LIMIT' || c === 'OTP_RATE_LIMIT' ? 'otp.tooMany' : commonErrorKey(e))
  } finally { resending.value = false }
}

function restart() {
  step.value = 'email'
  challenge.value = null
  errors.form = ''
  expired.value = false
}
</script>

<template>
  <div ref="card" class="rs">
    <form v-if="step === 'email'" class="rs__step" novalidate @submit.prevent="sendCode">
      <span class="rs__icon" aria-hidden="true">🔑</span>
      <h1>{{ $t('reset.title') }}</h1>
      <p class="muted">{{ $t('reset.lead') }}</p>
      <FormField
        v-model="form.email" type="email" :label="$t('auth.email')" :error="errors.email" autocomplete="email"
        inputmode="email" autocapitalize="off" spellcheck="false"
      />
      <p v-if="notFound" class="rs__alt">
        {{ $t('auth.noAccount') }} <RouterLink :to="{ path: '/register', query: route.query }">{{ $t('auth.registerBtn') }}</RouterLink>
      </p>
      <p v-if="errors.form" class="rs__err" role="alert">{{ errors.form }}</p>
      <AppButton type="submit" size="lg" block :disabled="busy">{{ busy ? $t('common.sending') : $t('otp.sendCode') }}</AppButton>
      <p class="rs__switch"><RouterLink :to="{ path: '/login', query: route.query }">← {{ $t('reset.backToLogin') }}</RouterLink></p>
    </form>

    <form v-else-if="step === 'code' && challenge" class="rs__step" novalidate @submit.prevent="save">
      <span class="rs__icon" aria-hidden="true">{{ challenge.channel === 'email' ? '✉️' : '📱' }}</span>
      <h1>{{ $t('reset.newTitle') }}</h1>
      <p v-if="viaFirebase && !fb.sent" class="muted">{{ $t('phone.resetLead', { to: challenge.destination }) }}</p>
      <p v-else class="muted">{{ $t(challenge.channel === 'email' ? 'otp.sentEmail' : 'otp.sentPhone', { to: challenge.destination }) }}</p>

      <!-- SMS через Firebase: сначала свой номер (сервер его не показывает), потом код -->
      <template v-if="viaFirebase && !fb.sent">
        <PhoneField v-model="fb.phone" :label="$t('checkout.phone')" :error="fb.error" :valid="checkPhone(fb.phone).ok" />
        <AppButton size="lg" block :disabled="fb.sending" @click="sendSms">{{ fb.sending ? $t('common.sending') : $t('phone.sendSms') }}</AppButton>
        <div class="rs__links"><button type="button" class="rs__link" @click="restart">{{ $t('reset.changeEmail') }}</button></div>
      </template>
      <template v-else>
      <p v-if="fb.error" class="rs__err" role="alert">{{ fb.error }}</p>

      <div v-if="devCode" class="rs__dev" role="note">
        <b>🧪 {{ $t('otp.devTitle') }}</b>
        <span>{{ $t('otp.devText') }}</span>
        <button type="button" class="rs__devcode" @click="form.code = devCode; toPassword()">{{ devCode }} <small>· {{ $t('otp.devFill') }}</small></button>
      </div>

      <div class="rs__code">
        <OtpInput v-model="form.code" :label="$t('otp.label')" :invalid="!!errors.code" :disabled="busy || expired" @complete="toPassword" />
        <Transition name="err"><small v-if="errors.code" class="rs__field-err" role="alert">{{ errors.code }}</small></Transition>
      </div>
      <div ref="passwordBox" class="rs__fields">
        <PasswordField v-model="form.password" :label="$t('reset.password')" :error="errors.password" policy :context="pwContext" autocomplete="new-password" />
        <PasswordField v-model="form.confirm" :label="$t('reset.confirm')" :error="errors.confirm" autocomplete="new-password" />
      </div>

      <p v-if="errors.form" class="rs__err" role="alert">{{ errors.form }}</p>
      <p v-else-if="info" class="rs__ok" role="status">{{ info }}</p>
      <AppButton v-if="!expired" type="submit" size="lg" block :disabled="busy">{{ busy ? $t('common.sending') : $t('reset.save') }}</AppButton>
      <AppButton v-else size="lg" block @click="restart">{{ $t('otp.restart') }}</AppButton>
      <div v-if="!expired" class="rs__links">
        <button type="button" class="rs__link" :disabled="wait > 0 || resending" @click="resend">
          {{ wait > 0 ? $t('otp.resendIn', { sec: wait }) : $t('otp.resend') }}
        </button>
        <button type="button" class="rs__link" @click="restart">{{ $t('reset.changeEmail') }}</button>
      </div>
      <p class="muted rs__hint">{{ $t(viaFirebase ? 'phone.hint' : 'otp.hint') }}</p>
      </template>
      <!-- невидимая проверка reCAPTCHA для SMS от Firebase (одна на оба шага: номер и код) -->
      <div v-if="viaFirebase" ref="recaptcha" />
    </form>

    <div v-else class="rs__step rs__done" role="status">
      <span class="rs__icon rs__icon--ok" aria-hidden="true">✓</span>
      <h1>{{ $t('reset.doneTitle') }}</h1>
      <p class="muted">{{ $t('reset.doneText') }}</p>
      <AppButton size="lg" block @click="router.push(redirect)">{{ $t('reset.continue') }}</AppButton>
    </div>
  </div>
</template>

<style scoped>
.rs { max-width:440px; margin:12px auto 32px; scroll-margin-top:90px; padding:clamp(18px, 4vw, 30px); border:1px solid var(--line); border-radius:var(--r-lg); background:#fff; box-shadow:var(--shadow-md); animation:rise .7s var(--ease) backwards; }
.rs__step { display:flex; flex-direction:column; gap:14px; animation:rise .45s var(--ease) backwards; }
.rs__icon { display:grid; place-items:center; width:64px; height:64px; margin:0 auto; border-radius:50%; background:var(--cream); font-size:30px; }
.rs__icon--ok { background:#e6f4ea; color:var(--green); font-weight:800; }
h1 { margin:0; text-align:center; }
p { margin:0; }
.rs__step > .muted { text-align:center; line-height:1.5; }
.rs__code { display:flex; flex-direction:column; gap:6px; }
.rs__fields { display:flex; flex-direction:column; gap:14px; }
.rs__field-err { color:var(--red); font-size:12px; text-align:center; }
.rs__alt { margin-top:-6px; font-size:13px; color:var(--muted); }
.rs__alt a, .rs__switch a { color:var(--yellow-lo); font-weight:700; }
.rs__switch { text-align:center; font-size:14px; }
.rs__err { padding:10px 12px; border-radius:var(--r-md); background:#fdecea; color:var(--red); font-size:13px; }
.rs__ok { padding:10px 12px; border-radius:var(--r-md); background:#e8f6ec; color:var(--green); font-size:13px; }
.rs__links { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.rs__link { padding:4px 0; border:0; background:none; color:var(--yellow-lo); font-size:14px; font-weight:700; }
.rs__link:disabled { color:var(--muted); font-weight:600; cursor:default; }
.rs__hint { font-size:12px; text-align:center; }
.rs__dev { display:flex; flex-direction:column; align-items:center; gap:6px; padding:12px 14px; border:1.5px dashed #c99a2e; border-radius:var(--r-md); background:var(--cream); font-size:13px; text-align:center; }
.rs__devcode { padding:6px 14px; border:0; border-radius:var(--pill); background:var(--yellow); color:#1b1500; font-weight:800; font-size:18px; letter-spacing:.18em; }
.rs__devcode small { font-size:12px; letter-spacing:0; font-weight:700; }
.rs__done { text-align:center; }
@media (prefers-reduced-motion:reduce) { .rs, .rs__step { animation:none; } }
</style>
