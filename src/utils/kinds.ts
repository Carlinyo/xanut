import type { Product, ProductKind } from '../types'

// Вид мяса у хороваца: кнопки-фильтры «Խոզ / Տավար / Հավ…» в каталоге и порядок показа. Тот же список — на сервере
// (merkhanut-api/src/config.ts → PRODUCT_KINDS). Без вида — «прочее» (в конце).
export const KINDS: readonly ProductKind[] = ['pork', 'beef', 'lamb', 'chicken', 'turkey', 'fish', 'rabbit', 'veg']
export type KindFilter = ProductKind | 'other'
export const KIND_FILTERS: readonly KindFilter[] = [...KINDS, 'other']
export const KIND_ICON: Record<KindFilter, string> = {
  pork: '🐖', beef: '🐄', lamb: '🐑', chicken: '🐔', turkey: '🦃', fish: '🐟', rabbit: '🐇', veg: '🍆', other: '🍢',
}

export const kindOf = (p: Pick<Product, 'kind'>): KindFilter => (p.kind && KINDS.includes(p.kind) ? p.kind : 'other')
export const isKindFilter = (v: unknown): v is KindFilter => typeof v === 'string' && (KIND_FILTERS as readonly string[]).includes(v)
/** Место вида в порядке показа: свинина, говядина, баранина, курица, индейка, рыба, кролик, овощи, прочее. */
export const kindRank = (p: Pick<Product, 'kind'>): number => KIND_FILTERS.indexOf(kindOf(p))
