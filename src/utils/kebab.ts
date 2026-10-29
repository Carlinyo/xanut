import type { KebabConfig, KebabSelection } from '../types'

// Ограничения шашлыка — те же, что в схеме заказа на сервере (merkhanut-api/src/schemas.ts → kebabLine).
export const KEBAB_KG = { min: 0.5, max: 50, step: 0.5 }
export const KEBAB_COMMENT_MAX = 300

export const isValidKg = (kg: number): boolean =>
  Number.isFinite(kg) && kg >= KEBAB_KG.min && kg <= KEBAB_KG.max && Number.isInteger(kg / KEBAB_KG.step)

/** Цена порции — та же формула, что на сервере (merkhanut-api/src/lib/pricing.ts → priceKebab).
 *  null — такого выбора больше нет в меню (или он нарушает ограничения), сервер его не примет. */
export function kebabPrice(cfg: KebabConfig, sel: KebabSelection): number | null {
  const meat = cfg.meats.find((m) => m.id === sel.meat)
  if (!meat || !cfg.marinades.includes(sel.marinade) || !isValidKg(sel.kg)) return null
  if ((sel.comment?.length ?? 0) > KEBAB_COMMENT_MAX) return null
  let extras = 0
  for (const id of new Set(sel.extras)) {
    const e = cfg.extras.find((x) => x.id === id)
    if (!e) return null
    extras += e.price
  }
  return Math.round(meat.perKg * sel.kg) + extras
}
