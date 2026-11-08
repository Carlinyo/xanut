// Готовые рисунки товаров (поле art) лежат в public/img/art. Тот же список — на сервере (merkhanut-api/src/config.ts → ART_KINDS).
export const ART_KINDS = ['steak', 'pork', 'ribs', 'lamb', 'chicken', 'sausage', 'mince', 'kebab', 'veg', 'bread', 'dairy', 'spice', 'drink', 'grill']

// Для этих рисунков показываются фотографии с другими именами файлов.
// Рисунок без строки здесь должен лежать в public/img/art под своим именем (sausage.webp, spice.webp…).
const FILES: Record<string, string> = {
  mince: 'axacac_tavar', chicken: 'tarm_hav',
  steak: 'tavari_mejq', pork: 'xozi_papuk', ribs: 'xozi_chalaxaj', lamb: 'gar',
}

/** Путь к картинке рисунка; неизвестный рисунок — стейк. */
export function artUrl(kind?: string): string {
  const k = kind && ART_KINDS.includes(kind) ? kind : 'steak'
  return `/img/art/${FILES[k] ?? k}.webp`
}

/** Маленькая копия фото из public/img/art (до 400 px, делает tools/shrink-photos.mjs) — для карточек, корзины и окон:
 *  /img/art/Vodka/a.webp → /img/art/sm/Vodka/a.webp. Остальные адреса (фото из админки, /img/cat…) — undefined. */
export function thumbUrl(src: string): string | undefined {
  const m = /^\/img\/art\/(?!sm\/)(.+)\.(?:webp|png|jpe?g)$/i.exec(src)
  return m ? `/img/art/sm/${m[1]}.webp` : undefined
}

// Рисунки категорий «цветными карандашами» (public/img/cat, делает tools/render-sketches.mjs): плитки раздела
// «Տեսականի» на главной и выбор рисунка в админке. Тот же список — на сервере (config.ts → CATEGORY_ARTS).
export const CATEGORY_ARTS = ['kebab', 'ribs', 'steak', 'lamb', 'chicken', 'fish', 'rabbit', 'sausage', 'veg', 'bread', 'dairy', 'spice', 'drink', 'grill', 'wine', 'vodka', 'cognac']

/** Карандашный рисунок категории; undefined — такого нет, плитка показывает обычную картинку. */
export function categorySketchUrl(art: string): string | undefined {
  return CATEGORY_ARTS.includes(art) ? `/img/cat/${art}.webp` : undefined
}
