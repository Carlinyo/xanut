// Проверка армянского мобильного номера — те же правила, что на сервере (merkhanut-api/src/lib/phone.ts).
// Список кодов операторов приходит с сервера (/api/config → phone.mobileCodes); здесь — запасной вариант.
export const MOBILE_CODES_FALLBACK = ['33', '41', '43', '44', '49', '50', '55', '66', '77', '91', '93', '94', '95', '96', '97', '98', '99']
let mobileCodes = MOBILE_CODES_FALLBACK
export function setMobileCodes(list?: string[]) { if (list?.length) mobileCodes = list }

export type PhoneProblem = 'EMPTY' | 'FOREIGN' | 'LENGTH' | 'LANDLINE' | 'NOT_MOBILE'

/** Приводит номер к виду +37491123456. Понимает 091 123 456, 91 123 456, 374…, 00374…, +374 0… */
export function normalizePhone(input: string): string {
  const raw = input.trim().replace(/[\s\-().]/g, '')
  let d = raw.replace(/\D/g, '')
  let intl = raw.startsWith('+')
  if (!intl && d.startsWith('00')) { d = d.slice(2); intl = true }
  if (intl || (d.startsWith('374') && d.length >= 11)) {
    if (d.startsWith('3740') && d.length === 12) d = '374' + d.slice(4)
    return '+' + d
  }
  if (d.startsWith('0') && d.length === 9) return '+374' + d.slice(1)
  if (d.length === 8) return '+374' + d
  return '+' + d
}

export function checkPhone(input: string): { ok: true; e164: string } | { ok: false; problem: PhoneProblem } {
  if (!input.trim()) return { ok: false, problem: 'EMPTY' }
  const n = normalizePhone(input)
  if (!n.startsWith('+374')) return { ok: false, problem: 'FOREIGN' }
  const d = n.slice(4)
  if (!/^\d{8}$/.test(d)) return { ok: false, problem: 'LENGTH' }
  if (mobileCodes.includes(d.slice(0, 2))) return { ok: true, e164: n }
  return { ok: false, problem: /^[123]/.test(d) ? 'LANDLINE' : 'NOT_MOBILE' }
}

/** Ключ текста ошибки в locales/hy.json → errors.* */
export const PHONE_ERROR_KEY: Record<PhoneProblem, string> = {
  EMPTY: 'errors.phoneEmpty', FOREIGN: 'errors.phoneForeign', LENGTH: 'errors.phoneLength',
  LANDLINE: 'errors.phoneLandline', NOT_MOBILE: 'errors.phoneNotMobile',
}

/**
 * Восемь цифр после +374 из того, что ввёл или вставил человек:
 * убирает +374 / 374 / 00374 и ведущий 0 (091… → 91…), лишнее обрезает.
 */
export function nationalDigits(input: string): string {
  let d = input.replace(/\D/g, '')
  if (d.startsWith('00374')) d = d.slice(5)
  else if (d.startsWith('374') && (input.trim().startsWith('+') || d.length > 8)) d = d.slice(3)
  d = d.replace(/^0+/, '')
  return d.slice(0, 8)
}

/** 91123456 → «91 123 456» (по мере ввода: «91 12», «91 123 4»). */
export const formatNational = (d: string): string => [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8)].filter(Boolean).join(' ')

/** +37491123456 → «+374 91 123 456». */
export const formatPhone = (e164: string): string => (/^\+374\d{8}$/.test(e164) ? `+374 ${formatNational(e164.slice(4))}` : e164)
