// Рыба и кролик на развес (сервер: merkhanut-api/src/lib/weighRules.ts): покупатель заказывает порции, работник взвешивает
// и присылает вес, покупатель получает чек и подтверждает его (заказ принят; онлайн — дальше оплата) или отказывается.
// Без ответа за answerMinutes заказ отменяется сам.
import { t } from '../i18n'
import { money } from './format'
import { acceptNote } from './orderNote'
import type { ConfirmOptions, NoteField } from '../stores/confirm'
import type { Order, OrderItemWeigh, WeighConfig } from '../types'

/** Пределы — как на сервере (config.ts → WEIGH); сервер присылает их в /api/config → weigh. */
export const WEIGH_DEFAULT: WeighConfig = { maxPortions: 20, answerMinutes: 30, minKg: 0.05, maxKg: 50 }
/** На развес по умолчанию (без галочки в админке): виды мяса и рисунки разделов — как на сервере (WEIGH.kinds). */
export const WEIGH_KINDS: readonly string[] = ['fish', 'rabbit']

export const isValidPortions = (n: number, max = WEIGH_DEFAULT.maxPortions): boolean => Number.isInteger(n) && n >= 1 && n <= max

/** Взвешивание не закончено: работник ещё не взвесил или покупатель ещё не ответил на чек. */
export const weighOpen = (o: Pick<Order, 'status' | 'weigh'>): boolean =>
  o.status === 'new' && (o.weigh?.state === 'pending' || o.weigh?.state === 'sent')
/** Чек отправлен — ждём ответ покупателя. */
export const awaitingAnswer = (o: Pick<Order, 'status' | 'weigh'>): boolean => o.status === 'new' && o.weigh?.state === 'sent'
/** Срок ответа на чек истёк (сервер отменит заказ при следующем чтении). */
export const answerOverdue = (o: Pick<Order, 'status' | 'weigh'>, now = Date.now()): boolean =>
  awaitingAnswer(o) && !!o.weigh?.expiresAt && Date.parse(o.weigh.expiresAt) <= now

/** Вес до грамма — как на сервере. */
export const roundKg = (kg: number): number => Math.round(kg * 1000) / 1000
/** Вес из поля ввода: «1,25» и «1.25» → 1.25; пусто или не число — NaN. */
export function parseKg(s: string): number {
  const t = s.trim().replace(',', '.')
  return t && /^\d*\.?\d+$/.test(t) ? Number(t) : NaN
}
export const isValidWeight = (kg: number, cfg: WeighConfig = WEIGH_DEFAULT): boolean => Number.isFinite(kg) && kg >= cfg.minKg && kg <= cfg.maxKg
/** Цена позиции по весу — как на сервере: цена за кг × вес + добавки шашлыка. */
export const weighedPrice = (w: OrderItemWeigh, kg: number): number => Math.round(w.perKg * roundKg(kg)) + w.extras

/** Сколько осталось до срока: «12:05» (минуты:секунды); null — срок вышел или неизвестен. */
export function timeLeft(expiresAt: string | null | undefined, now: number): string | null {
  const ms = expiresAt ? Date.parse(expiresAt) - now : NaN
  if (!(ms > 0)) return null
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
/** Время «18:30» по часам устройства. */
export const clockOf = (iso: string): string => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

/** Окно «Ուղարկե՞լ քաշը» (работник и админ): каждая позиция на развес — вес и цена; комментарий покупателю — как при
 *  «Ընդունել». */
export function weighDialog(o: Order, lines: { index: number; kg: number }[], cfg: WeighConfig = WEIGH_DEFAULT): ConfirmOptions & { note: NoteField } {
  const rows = lines.flatMap(({ index, kg }) => {
    const it = o.items[index]
    return it?.weigh ? [{ label: it.name, value: `${t('weigh.kgShort', { kg: roundKg(kg) })} · ${money(weighedPrice(it.weigh, kg))}` }] : []
  })
  return {
    icon: '⚖️', title: t('weigh.sendTitle', { id: o.id }), text: t('weigh.sendText', { min: cfg.answerMinutes }), rows,
    yes: t('weigh.sendYes'), note: acceptNote(),
  }
}

/** Текст ошибки отправки веса или шага заказа, которому мешает взвешивание. undefined — не про взвешивание. */
export function weighErrorText(code: string, cfg: WeighConfig = WEIGH_DEFAULT): string | undefined {
  if (code === 'INVALID_WEIGHT') return t('weigh.errors.INVALID_WEIGHT', { min: cfg.minKg, max: cfg.maxKg })
  if (code === 'WEIGHT_MISSING' || code === 'WEIGH_CLOSED' || code === 'WEIGH_PENDING') return t(`weigh.errors.${code}`)
  return undefined
}
