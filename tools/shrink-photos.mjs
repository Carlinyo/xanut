// Уменьшает фотографии товаров в public/img/art: длинная сторона — не больше 1000 px (на странице товара фото
// занимает до ~380 px, этого хватает и для экранов ×2–×3), webp с прозрачным фоном.
// Файлы, которые уже не больше 1000 px (в том числе рисунки 800×800), не трогает — запускать можно сколько угодно раз.
// Запуск (нужен sharp): node tools/shrink-photos.mjs   — после того как положили новые фото в public/img/art
import { createRequire } from 'node:module'
import { readdirSync, renameSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const sharp = require('sharp')

const DIR = fileURLToPath(new URL('../public/img/art/', import.meta.url))
const MAX = 1000

for (const f of readdirSync(DIR).filter((f) => f.endsWith('.webp'))) {
  const file = join(DIR, f)
  const { width, height } = await sharp(file).metadata()
  if (Math.max(width, height) <= MAX) continue
  const before = statSync(file).size
  await sharp(file).resize(MAX, MAX, { fit: 'inside', kernel: 'lanczos3' })
    .webp({ quality: 84, alphaQuality: 90, effort: 6, smartSubsample: true }).toFile(file + '.tmp')
  renameSync(file + '.tmp', file)
  console.log(`${f}  ${width}×${height}, ${before >> 10} КБ → ${statSync(file).size >> 10} КБ`)
}
