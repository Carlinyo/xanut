// Подтверждение телефона по SMS через Firebase Authentication. SMS с кодом отправляет Firebase (с невидимой проверкой
// reCAPTCHA), после верного кода Firebase выдаёт ID-токен — его сайт отправляет нашему серверу, а тот сам проверяет
// подпись и номер. Библиотека Firebase большая, поэтому загружается только тогда, когда нужна.
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth'
import { useCatalog } from '../stores/catalog'

/** Ошибка Firebase → ключ текста для покупателя. */
export function firebaseErrorKey(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  if (code === 'auth/invalid-verification-code' || code === 'auth/missing-verification-code') return 'otp.invalid'
  if (code === 'auth/code-expired' || code === 'auth/session-expired') return 'otp.expired'
  if (code === 'auth/too-many-requests' || code === 'auth/quota-exceeded') return 'otp.tooMany'
  if (code === 'auth/invalid-phone-number' || code === 'auth/missing-phone-number') return 'errors.phone'
  if (code === 'auth/network-request-failed') return 'errors.network'
  if (code === 'auth/captcha-check-failed' || code === 'auth/invalid-app-credential') return 'phone.captchaFailed'
  return 'otp.sendFailed'
}

/** Firebase для подтверждения телефона включён на сервере (есть настройки веб-приложения). */
export const firebaseReady = (): boolean => !!useCatalog().config.firebase

async function loadAuth() {
  const config = useCatalog().config.firebase
  if (!config) throw Object.assign(new Error('FIREBASE_DISABLED'), { code: 'app/no-config' })
  const [{ getApps, initializeApp }, auth] = await Promise.all([import('firebase/app'), import('firebase/auth')])
  const app = getApps()[0] ?? initializeApp(config)
  const a = auth.getAuth(app)
  a.languageCode = 'hy' // SMS и reCAPTCHA — по-армянски
  return { a, auth }
}

/**
 * Одна проверка номера: send() — отправить SMS (и повторно), confirm(code) — проверить код и получить ID-токен.
 * container — элемент для невидимой reCAPTCHA (на странице он ничего не показывает). dispose() — убрать reCAPTCHA.
 */
export function phoneVerification(container: () => HTMLElement | null) {
  let verifier: RecaptchaVerifier | null = null
  let confirmation: ConfirmationResult | null = null

  async function send(phone: string): Promise<void> {
    const { a, auth } = await loadAuth()
    clearVerifier() // повторная отправка — новая проверка reCAPTCHA
    const el = container()
    if (!el) throw new Error('NO_CONTAINER')
    el.innerHTML = ''
    verifier = new auth.RecaptchaVerifier(a, el, { size: 'invisible' })
    confirmation = await auth.signInWithPhoneNumber(a, phone, verifier)
  }

  /** ID-токен Firebase: его проверяет сервер. Сразу выходим из Firebase — вход на сайт держит наша сессия. */
  async function confirm(code: string): Promise<string> {
    if (!confirmation) throw Object.assign(new Error('NO_CONFIRMATION'), { code: 'auth/code-expired' })
    const cred = await confirmation.confirm(code)
    const token = await cred.user.getIdToken()
    const { a, auth } = await loadAuth()
    void auth.signOut(a).catch(() => {})
    return token
  }

  function clearVerifier() {
    try { verifier?.clear() } catch { /* элемент reCAPTCHA уже убран со страницы */ }
    verifier = null
  }
  function dispose() {
    clearVerifier()
    confirmation = null
  }
  return { send, confirm, dispose, get sent() { return confirmation !== null } }
}
