// Проверка почты на сайте: тот же строгий формат, что на сервере (merkhanut-api/src/lib/email.ts),
// плюс подсказка при опечатке в популярном домене. Существует ли домен, проверяет сервер (DNS).

const LOCAL = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,24}|xn--[a-z0-9-]{2,59})$/

export function isEmailFormat(input: string): boolean {
  const email = input.trim().toLowerCase()
  const at = email.lastIndexOf('@')
  if (at < 1 || email.length > 254) return false
  const local = email.slice(0, at), domain = email.slice(at + 1)
  return local.length <= 64 && LOCAL.test(local) && DOMAIN.test(domain)
}

const POPULAR = [
  'gmail.com', 'googlemail.com', 'mail.ru', 'yandex.ru', 'yandex.com', 'ya.ru', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'live.com', 'icloud.com', 'me.com', 'inbox.ru', 'list.ru', 'bk.ru', 'rambler.ru', 'proton.me', 'protonmail.com', 'gmx.com', 'aol.com',
]

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1) // перестановка «gmial»
    }
  }
  return d[a.length][b.length]
}

/** «anna@gmial.com» → «anna@gmail.com»; null, если домен популярный без ошибок или похожего нет. */
export function suggestEmail(input: string): string | null {
  const email = input.trim().toLowerCase()
  const at = email.lastIndexOf('@')
  if (at < 1) return null
  const local = email.slice(0, at), domain = email.slice(at + 1)
  if (!domain || POPULAR.includes(domain)) return null
  let best: string | null = null, bestD = 3
  for (const p of POPULAR) {
    const dd = distance(domain, p)
    if (dd < bestD) { best = p; bestD = dd }
  }
  return best && bestD <= (domain.length >= 6 ? 2 : 1) ? `${local}@${best}` : null
}
