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

// Только для плиток раздела «Տեսականի» на главной: рисунки «цветными карандашами» в public/img/cat
// (делает tools/render-sketches.mjs). Товары и остальные страницы показывают обычные картинки.
const SKETCHES = ['kebab', 'ribs', 'steak', 'lamb', 'chicken', 'fish', 'rabbit', 'sausage', 'veg', 'bread', 'dairy', 'spice', 'drink', 'grill']
// У рыбы и кролика на сервере рисунок общий с другими категориями (grill, steak), поэтому их рисунок — по номеру категории.
const SKETCH_BY_CATEGORY: Record<number, string> = { 13: 'fish', 14: 'rabbit' }

/** Карандашный рисунок категории; undefined — такого нет, плитка показывает обычную картинку. */
export function categorySketchUrl(id: number, art: string): string | undefined {
  const k = SKETCH_BY_CATEGORY[id] ?? art
  return SKETCHES.includes(k) ? `/img/cat/${k}.webp` : undefined
}
