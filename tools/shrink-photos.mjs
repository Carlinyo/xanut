// Готовит фотографии товаров в public/img/art: длинная сторона — не больше 1000 px (на странице товара фото
// занимает до ~380 px, этого хватает и для экранов ×2–×3), формат webp (прозрачный фон сохраняется).
// Новые фото можно класть в jpg или png: они станут .webp с тем же именем, а исходный файл удаляется —
// в scripts/catalog.json (бэкенд) пишите путь с .webp. Файлы webp, которые уже не больше 1000 px (в том числе рисунки
// 800×800), не трогает — запускать можно сколько угодно раз.
// Запуск (нужен sharp): node tools/shrink-photos.mjs   — после того как положили новые фото в public/img/art
import { createRequire } from 'node:module'
import { existsSync, readdirSync, renameSync, statSync, unlinkSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
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
