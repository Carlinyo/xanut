import type { Product } from '../types'

/** Спецпредложение: товар со скидкой или комбо. По этому правилу собирается раздел «Հատուկ առաջարկներ»
 *  (главная и /offers) и ставится табличка HOT на фото — меняйте здесь, чтобы они не разошлись. */
export const isOffer = (p: Pick<Product, 'discount' | 'combo'>): boolean => !!(p.discount || p.combo)
