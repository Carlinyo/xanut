import { t } from './i18n'
import { checkPhone, PHONE_ERROR_KEY } from './utils/phone'
import { isEmailFormat } from './utils/email'
import { passwordProblems, type PasswordContext } from './utils/passwordPolicy'

// Каждое правило возвращает true или текст ошибки (из locales/hy.json)
export type Rule = (v: string) => true | string
export const rules: Record<'name' | 'email' | 'emailLoose' | 'phone' | 'phoneAny' | 'address', Rule> = {
  name: (v) => v.trim().length >= 2 || t('errors.name'),
  // регистрация: строгий формат, как на сервере (без двойных точек, пробелов, кириллицы, с настоящей доменной зоной)
  email: (v) => isEmailFormat(v) || t('errors.email'),
  // вход: только явная ошибка — аккаунт ищется по адресу как есть
  emailLoose: (v) => /^\S+@\S+\.\S+$/.test(v.trim()) || t('errors.email'),
  // заказ и регистрация: армянский мобильный (+374 и 8 цифр с кодом оператора) — как на сервере
  phone: (v) => { const r = checkPhone(v); return r.ok || t(PHONE_ERROR_KEY[r.problem]) },
  // форма «Կապ»: любой номер, в том числе иностранный
  phoneAny: (v) => /^\+?\d[\d\s-]{7,14}$/.test(v.trim()) || t('errors.phone'),
  address: (v) => v.trim().length >= 5 || t('errors.address'),
}

/** Ошибка нового пароля ('' — подходит). Какие именно требования не выполнены, видно в списке под полем. */
export function passwordError(pw: string, ctx: PasswordContext): string {
  if (!pw) return t('errors.passwordRequired')
  return passwordProblems(pw, ctx).length ? t('password.notMet') : ''
}

type FieldName = 'name' | 'email' | 'phone' | 'password' | 'consent' | 'address' | 'message'
const EMAIL_ERROR_KEY: Record<string, string> = { FORMAT: 'errors.email', DISPOSABLE: 'errors.emailDisposable', DOMAIN: 'errors.emailDomain' }

/** Ошибки сервера (400 VALIDATION, issues с полем) → тексты под нужными полями формы. */
export function serverFieldErrors(issues?: { path: string; message: string }[]): Partial<Record<FieldName, string>> {
  const out: Partial<Record<FieldName, string>> = {}
  for (const { path, message } of issues ?? []) {
    if (path === 'phone') out.phone = t(PHONE_ERROR_KEY[message.replace(/^PHONE_/, '') as keyof typeof PHONE_ERROR_KEY] ?? 'errors.phone')
    else if (path === 'email') out.email = t(EMAIL_ERROR_KEY[message.replace(/^EMAIL_/, '')] ?? 'errors.email')
    else if (path === 'password') out.password = t(message === 'PASSWORD_PWNED' ? 'password.rule.PWNED' : 'password.notMet')
    else if (path === 'name') out.name = t('errors.name')
    else if (path === 'consent') out.consent = t('errors.consent')
    else if (path === 'address') out.address = t('errors.address')
    else if (path === 'message') out.message = t('errors.message')
  }
  return out
}
