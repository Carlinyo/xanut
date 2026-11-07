import { t } from '../i18n'
import { money } from './format'
import type { CustomerLevel, OrderMark, Perks, Segment, SegmentRules } from '../types'

export const SEGMENTS: Segment[] = ['new', 'regular', 'vip']
export const SEGMENT_ICON: Record<Segment, string> = { new: '🌱', regular: '🔥', vip: '👑' }

export const isSegment = (v: unknown): v is Segment => (SEGMENTS as unknown[]).includes(v)

/** Цена с акцией группы — так же, как считает сервер (src/lib/segments.ts): скидка на товары,
 *  доставка (бесплатная по акции), баллы с суммы после скидки. Окончательно считает сервер. */
export function applyPerks(subtotal: number, baseDelivery: number, perks: Perks) {
  const discount = Math.min(subtotal, Math.round((subtotal * perks.discount) / 100))
  const goods = subtotal - discount
  const deliveryFee = perks.freeDelivery ? 0 : baseDelivery
  return { discount, deliveryFee, total: goods + deliveryFee, bonusEarned: Math.max(0, Math.floor((goods * perks.bonusPercent) / 100)) }
}

/** «−5% զեղչ · 3% միավորներով · անվճար առաքում» */
export function perksText(p: Perks): string {
  return [
    p.discount > 0 && t('segments.perk.discount', { n: p.discount }),
    p.bonusPercent > 0 && t('segments.perk.bonus', { n: p.bonusPercent }),
    p.freeDelivery && t('segments.perk.free'),
  ].filter(Boolean).join(' · ')
}

/** Подпись строки скидки: «Զեղչ (VIP)» или просто «Զեղչ». */
export const discountLabel = (segment?: string | null): string =>
  isSegment(segment) ? t('cart.discountFor', { group: t('segments.short.' + segment) }) : t('cart.discount')

/** Цель месяца: «Այս ամիս ևս 2 պատվեր՝ …» — до следующей группы или (keep) чтобы сохранить нынешнюю и на следующий месяц.
 *  Пусто — выше некуда или группа назначена магазином. */
export function nextLevelText(level: CustomerLevel): string {
  const next = level.next
  if (!next || next.ordersLeft <= 0) return ''
  return t(next.keep ? 'segments.keep' : 'segments.next', { n: next.ordersLeft, min: money(next.min), name: t('segments.names.' + next.segment) })
}

/** Как попасть в группу: «Ամսական 10 պատվեր՝ յուրաքանչյուրը 3,000 ֏-ից». */
export function ruleText(s: Segment, r?: SegmentRules): string {
  if (!r || s === 'new') return t('segments.rule.new')
  return s === 'regular'
    ? t('segments.rule.monthly', { n: r.regularOrders, min: money(r.regularMin) })
    : t('segments.rule.monthly', { n: r.vipOrders, min: money(r.vipMin) })
}

/** Последний день группы: until — полночь после него по времени Армении (UTC+4) → «դեկտեմբերի 31-ը». */
export function lastDayText(until: string): string {
  const last = new Date(Date.parse(until) - 1 + 4 * 3_600_000)
  const months = t('segments.months') as string[]
  return t('segments.dayOf', { month: months[last.getUTCMonth()], day: last.getUTCDate() })
}

/** Засчитан ли заказ месяца в группу: «✓ Հաշվվել է՝ Մշտական», «Չի հաշվվում՝ 3,000 ֏-ից պակաս է»… */
export const markText = (mark: OrderMark, r?: SegmentRules): string => t('segments.mark.' + mark, { min: money(r?.regularMin ?? 0) })

/** Срок группы: «Գործում է մինչև նոյեմբերի 30-ը · մնաց 29 օր». Пусто — «новый» (сроку нечего показывать) или назначена магазином. */
export function untilText(level: CustomerLevel): string {
  if (level.manual || level.segment === 'new' || !level.month) return '' // !month — сервер ещё старый (выкладка)
  const left = level.month.daysLeft <= 1 ? t('segments.lastDay') : t('segments.daysLeft', { n: level.month.daysLeft })
  return `${t('segments.until', { day: lastDayText(level.month.until) })} · ${left}`
}
