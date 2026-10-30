import { t } from '../i18n'
import { money } from './format'
import type { CustomerLevel, Perks, Segment, SegmentRules } from '../types'

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

/** Сколько осталось до следующей группы: «Եվս 2 պատվեր՝ …». Пусто — выше некуда или группа назначена магазином. */
export function nextLevelText(level: CustomerLevel): string {
  const next = level.next
  if (!next || next.ordersLeft <= 0) return ''
  const name = t('segments.names.' + next.segment)
  return next.spentLeft ? t('segments.nextOr', { n: next.ordersLeft, sum: money(next.spentLeft), name }) : t('segments.next', { n: next.ordersLeft, name })
}

/** Как попасть в группу: «3 պատվերից», «10 պատվերից կամ 100,000 ֏ գնումներից». */
export function ruleText(s: Segment, r?: SegmentRules): string {
  if (!r || s === 'new') return t('segments.rule.new')
  if (s === 'regular') return t('segments.rule.regular', { n: r.regularOrders })
  return r.vipSpent > 0 ? t('segments.rule.vipOr', { n: r.vipOrders, sum: money(r.vipSpent) }) : t('segments.rule.vip', { n: r.vipOrders })
}
