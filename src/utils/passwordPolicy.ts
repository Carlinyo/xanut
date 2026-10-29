// Требования к паролю — копия merkhanut-api/src/lib/passwordPolicy.ts (меняйте оба файла вместе).
// Сервер дополнительно проверяет пароль по базе утечек; здесь — только мгновенная подсказка при вводе.

export const PASSWORD_MIN = 10
export const PASSWORD_MAX = 128

export type PasswordProblem = 'LENGTH' | 'TOO_LONG' | 'CASE' | 'DIGIT' | 'SPECIAL' | 'SPACES' | 'SEQUENCE' | 'PERSONAL' | 'COMMON'
export interface PasswordContext { name?: string; email?: string; phone?: string }

/** Ряды клавиатуры (латиница и русская раскладка), цифры и алфавит: «qwert», «asdf», «1234», «abcd» — слабые куски.
 *  Для рядов, куски которых встречаются в обычных словах («liberty» → «erty»), берём по 5 символов. */
const ROWS: [row: string, n: number][] = [
  ['qwertyuiop', 5], ['asdfghjkl', 4], ['zxcvbnm', 4], ['1234567890', 4],
  ['йцукенгшщзхъ', 5], ['фывапролджэ', 5], ['ячсмитьбю', 4], ['abcdefghijklmnopqrstuvwxyz', 4],
]

/** Слова, из которых чаще всего собирают пароли (сравнивается «основа» пароля без цифр и знаков). */
const COMMON_WORDS = new Set([
  'password', 'passwd', 'pass', 'parol', 'pasword', 'qwerty', 'qwertz', 'azerty', 'admin', 'administrator', 'root', 'user', 'login',
  'welcome', 'letmein', 'iloveyou', 'love', 'hello', 'monkey', 'dragon', 'master', 'sunshine', 'princess', 'football', 'baseball',
  'soccer', 'superman', 'batman', 'starwars', 'trustno', 'freedom', 'whatever', 'shadow', 'secret', 'summer', 'winter', 'spring',
  'autumn', 'michael', 'jennifer', 'charlie', 'jordan', 'killer', 'pokemon', 'naruto', 'google', 'facebook', 'instagram', 'apple',
  'samsung', 'computer', 'internet', 'test', 'testing', 'default', 'changeme', 'guest', 'qazwsx', 'zaqxsw', 'asdfgh', 'zxcvbn',
  'abc', 'abcd', 'armenia', 'hayastan', 'yerevan', 'erevan', 'ararat', 'mangal', 'khorovats', 'xorovac', 'shashlik', 'shashlyk',
  'jermuk', 'privet', 'parolchik', 'mypassword', 'mypass', 'newpassword',
])
/** Эти куски недопустимы даже внутри пароля: «MyPassword», «Qwerty#2026», «ILoveYou!». */
const NOTORIOUS = ['password', 'passwd', 'parol', 'qwerty', 'azerty', 'iloveyou', 'letmein', 'welcome'] // без «admin»: он внутри «badminton»

const LEET: Record<string, string> = { '@': 'a', '4': 'a', '0': 'o', '1': 'i', '!': 'i', '3': 'e', '$': 's', '5': 's', '7': 't', '+': 't', '8': 'b', '9': 'g' }
const deleet = (s: string) => [...s.toLowerCase()].map((c) => LEET[c] ?? c).join('')
const letters = (s: string) => s.replace(/[^\p{L}]+/gu, '')

function hasSequence(pw: string): boolean {
  const lower = pw.toLowerCase()
  if (/(.)\1{3,}/u.test(lower)) return true // «aaaa», «1111»
  for (const [row, n] of ROWS) {
    for (let i = 0; i + n <= row.length; i++) {
      const chunk = row.slice(i, i + n)
      if (lower.includes(chunk) || lower.includes([...chunk].reverse().join(''))) return true
    }
  }
  return false
}

function hasPersonal(pw: string, ctx: PasswordContext): boolean {
  const lower = pw.toLowerCase()
  const tokens: string[] = []
  if (ctx.name) tokens.push(...ctx.name.toLowerCase().split(/[\s\-'’.]+/u))
  if (ctx.email) {
    const local = ctx.email.toLowerCase().split('@')[0] ?? ''
    tokens.push(local, ...local.split(/[._+\-]+/))
  }
  if (tokens.some((t) => t.length >= 3 && lower.includes(t))) return true
  const digits = pw.replace(/\D/g, '')
  const phone = (ctx.phone ?? '').replace(/\D/g, '').slice(-8) // 8 цифр после +374
  return phone.length >= 6 && (digits.includes(phone) || digits.includes(phone.slice(-6)))
}

function isCommon(pw: string): boolean {
  const variants = [letters(pw.toLowerCase()), letters(deleet(pw)), letters(deleet(pw).replace(/i/g, 'l'))]
  if (variants.some((v) => COMMON_WORDS.has(v))) return true
  return variants.some((v) => NOTORIOUS.some((w) => v.includes(w)))
}

/** Все нарушения по порядку важности (пустой массив — пароль подходит). */
export function passwordProblems(pw: string, ctx: PasswordContext = {}): PasswordProblem[] {
  const p: PasswordProblem[] = []
  const len = [...pw].length
  if (len < PASSWORD_MIN) p.push('LENGTH')
  if (len > PASSWORD_MAX) p.push('TOO_LONG')
  if (!(/\p{Lu}/u.test(pw) && /\p{Ll}/u.test(pw))) p.push('CASE')
  if (!/\p{Nd}/u.test(pw)) p.push('DIGIT')
  if (!/[^\p{L}\p{N}\s]/u.test(pw)) p.push('SPECIAL')
  if (/^\s|\s$/u.test(pw)) p.push('SPACES')
  if (hasSequence(pw)) p.push('SEQUENCE')
  if (hasPersonal(pw, ctx)) p.push('PERSONAL')
  if (isCommon(pw)) p.push('COMMON')
  return p
}

/** Надёжность для индикатора: 0 — пусто, 1 — слабый, 2 — средний, 3 — хороший, 4 — сильный. */
export function passwordStrength(pw: string, problems: PasswordProblem[]): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0
  if (problems.length >= 3) return 1
  if (problems.length) return 2
  return [...pw].length >= 14 && new Set(pw).size >= 9 ? 4 : 3
}
