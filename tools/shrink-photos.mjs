// Готовит фотографии товаров в public/img/art: длинная сторона — не больше 1000 px (на странице товара фото
// занимает до ~380 px, этого хватает и для экранов ×2–×3), формат webp (прозрачный фон сохраняется).
// Новые фото можно класть в jpg или png: они станут .webp с тем же именем, а исходный файл удаляется —
// в scripts/catalog.json (бэкенд) пишите путь с .webp. Файлы webp, которые уже не больше 1000 px (в том числе рисунки
// 800×800), не трогает — запускать можно сколько угодно раз.
// Затем — маленькие копии для карточек, корзины и окон (public/img/art/sm/, до 400 px, и для подпапок напитков):
// в карточке фото занимает ~200 px, полное фото там в 10–15 раз тяжелее. Копия пересоздаётся, если фото новее неё;
// копии удалённых фото удаляются. Сайт берёт копию сам (ProductArt.vue), а если её нет — полное фото.
// Запуск (нужен sharp): node tools/shrink-photos.mjs   — после того как положили новые фото в public/img/art
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync } from 'node:fs'
import { basename, dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const sharp = require('sharp')
sharp.cache(false) // иначе на Windows sharp держит исходный файл открытым и его нельзя удалить

const DIR = fileURLToPath(new URL('../public/img/art/', import.meta.url))
const MAX = 1000
const SOURCES = ['.webp', '.jpg', '.jpeg', '.png']

for (const f of readdirSync(DIR)) {
  const ext = extname(f).toLowerCase()
  if (!SOURCES.includes(ext)) continue
  const file = join(DIR, f)
  const { width, height } = await sharp(file).metadata()
  const convert = ext !== '.webp'
  if (!convert && Math.max(width, height) <= MAX) continue
  const out = join(DIR, basename(f, extname(f)) + '.webp')
  if (convert && existsSync(out)) { console.log(`${f}: уже есть ${basename(out)} — пропускаю, удалите лишний файл`); continue }
  const before = statSync(file).size
  await sharp(file).resize(MAX, MAX, { fit: 'inside', kernel: 'lanczos3', withoutEnlargement: true })
    .webp({ quality: 84, alphaQuality: 90, effort: 6, smartSubsample: true }).toFile(out + '.tmp')
  renameSync(out + '.tmp', out)
  if (convert) unlinkSync(file)
  const { width: w, height: h } = await sharp(out).metadata()
  console.log(`${f} → ${basename(out)}  ${width}×${height} → ${w}×${h}, ${before >> 10} КБ → ${statSync(out).size >> 10} КБ`)
}

// ---------- маленькие копии ----------
// Тот же путь, что у фото, но в sm/ и всегда .webp: /img/art/Vodka/a.webp → /img/art/sm/Vodka/a.webp (utils/art.ts → thumbUrl)
const SM = join(DIR, 'sm')
const THUMB = 400
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = join(dir, e.name)
  return e.isDirectory() ? (p === SM ? [] : walk(p)) : SOURCES.includes(extname(e.name).toLowerCase()) ? [p] : []
})
const thumbOf = (file) => join(SM, relative(DIR, dirname(file)), basename(file, extname(file)) + '.webp')

const photos = walk(DIR)
let made = 0, before = 0, after = 0
for (const file of photos) {
  const out = thumbOf(file)
  if (existsSync(out) && statSync(out).mtimeMs >= statSync(file).mtimeMs) continue
  mkdirSync(dirname(out), { recursive: true })
  await sharp(file).resize(THUMB, THUMB, { fit: 'inside', kernel: 'lanczos3', withoutEnlargement: true })
    .webp({ quality: 80, alphaQuality: 85, effort: 6, smartSubsample: true }).toFile(out + '.tmp')
  renameSync(out + '.tmp', out)
  made++; before += statSync(file).size; after += statSync(out).size
}
// копии фото, которых больше нет
const wanted = new Set(photos.map(thumbOf))
const stale = existsSync(SM) ? (function list(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? list(join(dir, e.name)) : [join(dir, e.name)]))
})(SM).filter((f) => !wanted.has(f)) : []
for (const f of stale) unlinkSync(f)
console.log(`маленькие копии: сделано ${made}${made ? ` (${before >> 10} КБ → ${after >> 10} КБ)` : ''}, удалено лишних ${stale.length}, всего фото ${photos.length}`)
