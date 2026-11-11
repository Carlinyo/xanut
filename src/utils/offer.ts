import { t } from '../i18n'
import { money } from './format'
import type { ComboFar, Product } from '../types'

/** Спецпредложение: товар со скидкой или комбо. По этому правилу собирается раздел «Հատուկ առաջարկներ»
 *  (главная и /offers) и ставится табличка HOT на фото — меняйте здесь, чтобы они не разошлись. */
export const isOffer = (p: Pick<Product, 'discount' | 'combo'>): boolean => !!(p.discount || p.combo)

/** Метка доставки на карточке комбо: «Անվճար առաքում՝ մինչև 5 կմ» (дальше — со скидкой); far — catalog.comboFar,
 *  null (старый сервер) — просто «Առաքումն անվճար». */
export const comboBadge = (far: ComboFar | null): string => (far ? t('combo.freeNear', { km: far.overKm }) : t('combo.free'))

/** Дальняя доставка комбо — со скидкой: «Խանութից 5 կմ-ից հեռու՝ առաքումը զեղչով՝ 1,000 ֏՝ 2,000 ֏-ի փոխարեն»;
 *  null (старый сервер: бесплатно везде) — пусто. */
export const comboFarNote = (far: ComboFar | null): string =>
  (far ? t('combo.farNote', { km: far.overKm, fee: money(far.fee), full: money(far.full) }) : '')
