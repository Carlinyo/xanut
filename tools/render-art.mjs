// Рендер изображений товаров: SVG-материалы (неровные края, рельеф, ключевой и заполняющий свет,
// затенение по краям, мраморные прожилки, влажные блики) → PNG с суперсэмплингом → WebP.
// Запуск (нужны playwright и sharp): node tools/render-art.mjs   → public/img/art/*.webp
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const sharp = require('sharp')

const OUT = new URL('../public/img/art/', import.meta.url).pathname
const PREVIEW = process.env.ART_PREVIEW_DIR // если задано, сюда кладутся PNG для просмотра
mkdirSync(OUT, { recursive: true })

const KEY = '<feDistantLight azimuth="225" elevation="46"/>'
const FILL = '<feDistantLight azimuth="40" elevation="26"/>'
const linear = (s, i) => ['R', 'G', 'B'].map((c) => `<feFunc${c} type="linear" slope="${s}" intercept="${i}"/>`).join('')

/** Тонкая полоса вокруг уровня `at`: из изолиний шума получаются прожилки. */
function band(at, width) {
  const n = 41
  return Array.from({ length: n }, (_, i) => Math.max(0, 1 - Math.abs(i / (n - 1) - at) / width).toFixed(3)).join(' ')
}

/** Материал-фильтр. Все параметры подобраны на глаз под каждый продукт. */
function material(id, o = {}) {
  const m = {
    edge: 8, edgeF: 0.014, f: '0.02 0.03', oct: 4, seed: 3, blur: 14, scale: 22, bump: 0.2,
    amb: [0.66, 0.4], spec: [0.7, 24, 0.5], sparkle: null, veins: null, vary: null, ao: 0.45, aoBlur: 22, ...o,
  }
  const s = m.seed
  const veins = m.veins ? `
  <feTurbulence type="fractalNoise" baseFrequency="${m.veins.f}" numOctaves="${m.veins.oct ?? 4}" seed="${s + 7}" result="vn"/>
  <feComponentTransfer in="vn" result="vb"><feFuncR type="table" tableValues="${band(m.veins.at ?? 0.62, m.veins.w ?? 0.035)}"/></feComponentTransfer>
  <feColorMatrix in="vb" type="matrix" values="0 0 0 0 ${m.veins.c[0]}  0 0 0 0 ${m.veins.c[1]}  0 0 0 0 ${m.veins.c[2]}  ${m.veins.k ?? 0.9} 0 0 0 0" result="vc"/>
  <feGaussianBlur in="vc" stdDeviation="${m.veins.soft ?? 0.9}" result="veins"/>` : ''
  const vary = m.vary ? `
  <feTurbulence type="fractalNoise" baseFrequency="${m.vary.f ?? 0.01}" numOctaves="3" seed="${s + 13}" result="vr"/>
  <feColorMatrix in="vr" type="matrix" values="0 0 0 0 ${m.vary.c[0]}  0 0 0 0 ${m.vary.c[1]}  0 0 0 0 ${m.vary.c[2]}  ${m.vary.k} 0 0 0 ${m.vary.t}" result="vary"/>` : ''
  const sparkle = m.sparkle ? `
  <feTurbulence type="fractalNoise" baseFrequency="${m.sparkle.f ?? 0.09}" numOctaves="2" seed="${s + 21}" result="sn"/>
  <feComposite in="b" in2="sn" operator="arithmetic" k2="1" k3="${m.sparkle.bump ?? 0.3}" result="h2"/>
  <feSpecularLighting in="h2" surfaceScale="${m.scale}" specularConstant="${m.sparkle.c ?? 1.2}" specularExponent="${m.sparkle.e ?? 60}" lighting-color="#fff" result="sp">${KEY}</feSpecularLighting>
  <feComposite in="sp" in2="shape" operator="in" result="spIn"/>
  <feColorMatrix in="spIn" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${m.sparkle.a ?? 0.7} 0" result="spark"/>` : ''
  return `<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="800" height="800" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${m.edgeF}" numOctaves="2" seed="${s + 31}" result="en"/>
  <feDisplacementMap in="SourceGraphic" in2="en" scale="${m.edge}" xChannelSelector="R" yChannelSelector="G" result="shape"/>
  <feTurbulence type="fractalNoise" baseFrequency="${m.f}" numOctaves="${m.oct}" seed="${s}" result="n"/>
  <feGaussianBlur in="shape" stdDeviation="${m.blur}" result="b"/>
  <feComposite in="b" in2="n" operator="arithmetic" k2="1" k3="${m.bump}" result="h"/>
  <feDiffuseLighting in="h" surfaceScale="${m.scale}" diffuseConstant="1.15" lighting-color="#fff" result="key">${KEY}</feDiffuseLighting>
  <feDiffuseLighting in="h" surfaceScale="${m.scale}" diffuseConstant="1" lighting-color="#ffe7c9" result="fill">${FILL}</feDiffuseLighting>
  <feComposite in="key" in2="fill" operator="arithmetic" k2="0.8" k3="0.34" result="l0"/>
  <feComponentTransfer in="l0" result="light">${linear(m.amb[0], m.amb[1])}</feComponentTransfer>${vary}${veins}
  <feMerge result="col"><feMergeNode in="shape"/>${m.vary ? '<feMergeNode in="vary"/>' : ''}${m.veins ? '<feMergeNode in="veins"/>' : ''}</feMerge>
  <feComposite in="col" in2="shape" operator="in" result="colIn"/>
  <feComposite in="colIn" in2="light" operator="arithmetic" k1="1" result="lit"/>
  <feGaussianBlur in="shape" stdDeviation="${m.aoBlur}" result="ab"/>
  <feColorMatrix in="ab" type="matrix" values="0 0 0 0 0.09  0 0 0 0 0.03  0 0 0 0 0.02  0 0 0 -${m.ao} ${m.ao}" result="ao0"/>
  <feComposite in="ao0" in2="shape" operator="in" result="aoIn"/>
  <feSpecularLighting in="h" surfaceScale="${m.scale}" specularConstant="${m.spec[0]}" specularExponent="${m.spec[1]}" lighting-color="#fff" result="s">${KEY}</feSpecularLighting>
  <feComposite in="s" in2="shape" operator="in" result="sIn"/>
  <feColorMatrix in="sIn" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${m.spec[2]} 0" result="sS"/>${sparkle}
  <feMerge><feMergeNode in="lit"/><feMergeNode in="aoIn"/><feMergeNode in="sS"/>${m.sparkle ? '<feMergeNode in="spark"/>' : ''}</feMerge>
</filter>`
}

const grad = (id, stops, radial = false) => radial
  ? `<radialGradient id="${id}" cx=".38" cy=".32" r=".85">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`
  : `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`

/** Мягкая тень + плотная контактная тень у самого основания. */
const shadow = (cx = 400, cy = 700, rx = 280, ry = 34) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#0b1210" opacity=".34" filter="url(#shSoft)"/>` +
  `<ellipse cx="${cx}" cy="${cy - 6}" rx="${rx * 0.78}" ry="${ry * 0.42}" fill="#0b1210" opacity=".42" filter="url(#shHard)"/>`

const MEAT_VEINS = { f: '0.011 0.034', at: 0.64, w: 0.03, c: [1, 0.93, 0.88], k: 0.95 }
const defs = [
  grad('gBeef', [[0, '#d9433f'], [0.55, '#ab2427'], [1, '#6e1013']], true),
  grad('gPork', [[0, '#f3a49c'], [0.6, '#dc7d77'], [1, '#b8524e']], true),
  grad('gFat', [[0, '#fffaf0'], [1, '#efd9b6']]),
  grad('gRind', [[0, '#e9c9a0'], [1, '#c99a68']]),
  grad('gBone', [[0, '#fbf4e4'], [1, '#d6c3a0']]),
  grad('gSkin', [[0, '#f3b85c'], [0.5, '#d17f22'], [1, '#9a4c0c']], true),
  grad('gSausage', [[0, '#c9683c'], [1, '#7a2c13']]),
  grad('gMince', [[0, '#d8504a'], [1, '#8e1f22']], true),
  grad('gChar', [[0, '#c9883f'], [0.5, '#93511f'], [1, '#55270c']], true),
  grad('gTomato', [[0, '#f0604e'], [1, '#b1221a']], true),
  grad('gPepper', [[0, '#79c05a'], [1, '#367324']], true),
  grad('gOnion', [[0, '#fbf2ff'], [1, '#e3c9e6']]),
  grad('gSteel', [[0, '#f7f9fa'], [0.5, '#aab5bb'], [1, '#6f7c83']]),
  grad('gPlate', [[0, '#ffffff'], [1, '#d5dde1']]),
  grad('gBoard', [[0, '#c48a52'], [1, '#7e4c22']]),
  grad('gHerb', [[0, '#5d9a3a'], [1, '#2b5a1a']]),
  grad('gPeppercorn', [[0, '#5a4636'], [1, '#1f1610']], true),
  grad('gCucumber', [[0, '#5e9e3a'], [1, '#2c5c1a']]),
  grad('gApple', [[0, '#f2d24c'], [0.5, '#e0532f'], [1, '#a5241a']], true),
  grad('gLeaf', [[0, '#8bc65a'], [1, '#3f7f27']]),
  grad('gCrust', [[0, '#e8b263'], [0.55, '#c4822e'], [1, '#86490f']], true),
  grad('gLavash', [[0, '#f7e8c4'], [1, '#d9b778']]),
  grad('gJar', [[0, '#ffffff'], [1, '#e1e8eb']]),
  grad('gCheese', [[0, '#fffaec'], [1, '#ecdcb4']]),
  grad('gLid', [[0, '#e8574a'], [1, '#9c2219']]),
  grad('gSpice', [[0, '#e0743a'], [1, '#9a3812']], true),
  grad('gSauce', [[0, '#d63a2a'], [1, '#7d1810']]),
  grad('gGlass', [[0, '#e3f3f8'], [1, '#9fc4d1']]),
  grad('gJuice', [[0, '#ffb340'], [1, '#e2701a']]),
  grad('gWater', [[0, '#c9ebf8'], [1, '#76b9d6']]),
  grad('gCoal', [[0, '#4b4b4b'], [1, '#141414']], true),
  grad('gBag', [[0, '#d8c39a'], [1, '#a88b58']]),
  // мясо
  material('mBeef', { seed: 5, edge: 10, bump: 0.22, veins: MEAT_VEINS, vary: { c: [0.35, 0.02, 0.04], k: 0.9, t: -0.42 }, sparkle: { c: 1.1, e: 70, a: 0.55 } }),
  material('mPork', { seed: 8, edge: 9, bump: 0.18, spec: [0.6, 20, 0.45], veins: { ...MEAT_VEINS, c: [1, 0.96, 0.93], k: 0.75 }, vary: { c: [0.7, 0.3, 0.3], k: 0.8, t: -0.38 }, sparkle: { c: 1, e: 70, a: 0.5 } }),
  material('mFat', { seed: 2, edge: 7, f: '0.05 0.05', blur: 10, scale: 16, bump: 0.18, spec: [0.45, 14, 0.4], ao: 0.3, aoBlur: 12 }),
  material('mBone', { seed: 4, edge: 4, f: '0.03 0.05', blur: 12, scale: 18, bump: 0.08, spec: [0.7, 22, 0.5], ao: 0.3, aoBlur: 14 }),
  material('mSkin', { seed: 6, edge: 7, f: '0.11 0.11', oct: 3, blur: 16, scale: 26, bump: 0.5, spec: [1, 22, 0.55], vary: { f: 0.03, c: [0.42, 0.18, 0.04], k: 1.4, t: -0.62 }, sparkle: { c: 1.2, e: 60, a: 0.6, f: 0.12 } }),
  material('mSausage', { seed: 7, edge: 3, f: '0.12 0.03', oct: 2, blur: 20, scale: 30, bump: 0.08, spec: [1.2, 40, 0.7], sparkle: { c: 1.3, e: 80, a: 0.7 }, ao: 0.35 }),
  material('mMince', { seed: 9, edge: 10, f: '0.07 0.07', oct: 4, blur: 22, scale: 34, bump: 0.95, spec: [0.8, 18, 0.45], veins: { f: '0.05 0.05', at: 0.6, w: 0.05, c: [1, 0.86, 0.82], k: 0.9, soft: 0.6 } }),
  material('mChar', { seed: 11, edge: 10, f: '0.04 0.04', blur: 16, scale: 24, bump: 0.35, spec: [0.9, 24, 0.5], vary: { f: 0.05, c: [0.12, 0.05, 0.02], k: 1.6, t: -0.85 }, sparkle: { c: 1.2, e: 55, a: 0.6 } }),
  material('mTomato', { seed: 12, edge: 4, f: '0.03 0.03', oct: 2, blur: 14, scale: 22, bump: 0.06, spec: [1.4, 44, 0.8], ao: 0.3 }),
  material('mOnion', { seed: 22, edge: 3, f: '0.02 0.06', oct: 2, blur: 8, scale: 12, bump: 0.08, spec: [1, 30, 0.6], ao: 0.25, aoBlur: 8 }),
  material('mSteel', { seed: 13, edge: 0, f: '0.02 0.02', oct: 1, blur: 6, scale: 12, bump: 0.02, spec: [1.5, 60, 0.9], ao: 0.15, aoBlur: 4 }),
  material('mPlate', { seed: 14, edge: 0, f: '0.01 0.01', oct: 1, blur: 30, scale: 10, bump: 0.02, spec: [0.4, 12, 0.3], ao: 0.2 }),
  material('mBoard', { seed: 23, edge: 2, f: '0.004 0.09', oct: 3, blur: 10, scale: 12, bump: 0.3, spec: [0.3, 12, 0.25], veins: { f: '0.003 0.06', at: 0.6, w: 0.05, c: [0.35, 0.18, 0.07], k: 0.6, soft: 0.5 }, ao: 0.3, aoBlur: 10 }),
  material('mHerb', { seed: 24, edge: 3, f: '0.05 0.05', oct: 2, blur: 4, scale: 8, bump: 0.2, spec: [0.6, 20, 0.4], ao: 0.25, aoBlur: 4 }),
  material('mVeg', { seed: 15, edge: 5, f: '0.03 0.03', oct: 2, blur: 14, scale: 22, bump: 0.06, spec: [1.3, 42, 0.75], vary: { f: 0.02, c: [1, 0.85, 0.4], k: 0.7, t: -0.35 } }),
  material('mCrust', { seed: 16, edge: 8, f: '0.05 0.05', oct: 4, blur: 18, scale: 26, bump: 0.35, spec: [0.6, 16, 0.4], vary: { f: 0.04, c: [0.45, 0.22, 0.06], k: 1.2, t: -0.6 } }),
  material('mSoft', { seed: 17, edge: 4, f: '0.04 0.04', oct: 3, blur: 16, scale: 18, bump: 0.12, spec: [0.4, 12, 0.35] }),
  material('mGlass', { seed: 18, edge: 0, f: '0.01 0.01', oct: 1, blur: 10, scale: 14, bump: 0.01, spec: [1.6, 60, 0.9], ao: 0.2, aoBlur: 10 }),
  material('mSpice', { seed: 19, edge: 10, f: '0.18 0.18', oct: 2, blur: 20, scale: 26, bump: 0.7, spec: [0.3, 10, 0.25] }),
  material('mCoal', { seed: 21, edge: 8, f: '0.09 0.09', oct: 3, blur: 14, scale: 24, bump: 0.6, amb: [0.8, 0.22], spec: [0.9, 20, 0.6] }),
  '<filter id="shSoft" filterUnits="userSpaceOnUse" x="0" y="0" width="800" height="800"><feGaussianBlur stdDeviation="22"/></filter>',
  '<filter id="shHard" filterUnits="userSpaceOnUse" x="0" y="0" width="800" height="800"><feGaussianBlur stdDeviation="7"/></filter>',
  '<filter id="blur2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>',
].join('')

// ---------- детали сцен ----------
const rosemary = (x, y, rot, s = 1) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" filter="url(#mHerb)">
  <path d="M0 0 L190 0" stroke="#4f6b2c" stroke-width="7" stroke-linecap="round"/>
  ${Array.from({ length: 14 }, (_, i) => { const x = 8 + i * 13, y = i % 2 ? -15 : 15; return `<ellipse cx="${x}" cy="${y}" rx="22" ry="6.5" transform="rotate(${i % 2 ? -36 : 36} ${x} ${y})" fill="url(#gHerb)"/>` }).join('')}</g>`
const peppercorns = (pts) => `<g filter="url(#mOnion)">${pts.map(([x, y, r = 9]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#gPeppercorn)"/>`).join('')}</g>`
const salt = (pts) => `<g fill="#fff" opacity=".9">${pts.map(([x, y, r = 4]) => `<rect x="${x}" y="${y}" width="${r}" height="${r}" rx="1" transform="rotate(${(x * 7) % 45} ${x} ${y})"/>`).join('')}</g>`
/** Разделочная доска, вид сверху (как на фото «flat lay»). */
const board = `<rect x="58" y="96" width="684" height="620" rx="80" fill="#0b1210" opacity=".35" filter="url(#shSoft)" transform="translate(0 18)"/>
<g filter="url(#mBoard)"><rect x="50" y="80" width="700" height="620" rx="80" fill="url(#gBoard)"/></g>`
/** Тень от продукта, лежащего на доске. */
const dropOn = (shape, dx = 12, dy = 22) => `<g transform="translate(${dx} ${dy})" opacity=".42" filter="url(#shSoft)">${shape.replace(/fill="url\(#[^)]+\)"/g, 'fill="#1a0d06"').replace(/stroke="url\(#[^)]+\)"/g, 'stroke="#1a0d06"').replace(/filter="url\(#[^)]+\)"/g, '')}</g>`

const SLAB = 'M118 392C104 250 214 168 336 160c82-6 132 30 204 18 104-18 176 66 156 190-12 78-62 158-142 196-92 44-196 52-288 20C186 556 126 496 118 392z'
/** Кусок мяса с жировым краем с одной стороны (как у настоящего стейка), опционально со шкуркой. */
function slab(grad, mat, rind) {
  const meat = `<g transform="translate(400 390) scale(.8) translate(-400 -390)">
  ${rind ? `<path d="${SLAB}" fill="url(#gRind)" filter="url(#mFat)" transform="translate(30 58)"/>` : ''}
  <path d="${SLAB}" fill="url(#gFat)" filter="url(#mFat)" transform="translate(18 36)"/>
  <path d="${SLAB}" fill="url(#${grad})" filter="url(#${mat})"/></g>`
  return `${board}${dropOn(meat)}${meat}
${rosemary(560, 640, -16, 1.25)}${peppercorns([[120, 160], [146, 176, 8], [172, 152], [640, 150, 8], [668, 168]])}${salt([[110, 600], [128, 618], [150, 596], [690, 520], [702, 540]])}`
}

/** Каре ягнёнка: жировой край сверху, косточка снизу. */
const chop = (cx, cy, sc, rot) => `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${sc}) translate(-400 -420)">
 <g filter="url(#mBone)"><rect x="372" y="500" width="56" height="190" rx="28" fill="url(#gBone)"/><circle cx="356" cy="690" r="36" fill="url(#gBone)"/><circle cx="444" cy="690" r="36" fill="url(#gBone)"/></g>
 <path d="M208 336c0-104 88-160 192-160s192 56 192 160-72 200-192 200-192-96-192-200z" fill="url(#gFat)" filter="url(#mFat)" transform="translate(0 -26)"/>
 <path d="M208 336c0-104 88-160 192-160s192 56 192 160-72 200-192 200-192-96-192-200z" fill="url(#gBeef)" filter="url(#mBeef)"/></g>`

const DIR = [Math.cos(-Math.PI / 6), Math.sin(-Math.PI / 6)]
const at = (t) => [400 + t * DIR[0], 440 + t * DIR[1]]
/** Кусок на шампуре; с charred=true добавляются следы решётки. */
function piece(t, w, h, rx, gradId, mat, charred = false) {
  const [cx, cy] = at(t)
  const marks = charred ? [-0.28, 0.02, 0.32].map((k) => `<rect x="${cx - w / 2}" y="${cy + k * h - 7}" width="${w}" height="14" rx="7" fill="#2a1206" opacity=".75"/>`).join('') : ''
  return `<g filter="url(#${mat})" transform="rotate(-30 ${cx} ${cy})"><rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${rx}" fill="url(#${gradId})"/>${marks}</g>`
}
const onion = (t) => { const [cx, cy] = at(t); return `<g filter="url(#mOnion)" transform="rotate(-30 ${cx} ${cy})"><rect x="${cx - 26}" y="${cy - 82}" width="52" height="164" rx="26" fill="url(#gOnion)"/><path d="M${cx - 10} ${cy - 70}v140M${cx + 10} ${cy - 70}v140" stroke="#d7b6dc" stroke-width="4" opacity=".8"/></g>` }

/** Точка и касательная на кубической кривой Безье — для следов решётки поперёк колбаски. */
function bez(p, t) {
  const [a, b, c, d] = p, u = 1 - t
  const pt = [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k])
  const tg = [0, 1].map((k) => 3 * u * u * (b[k] - a[k]) + 6 * u * t * (c[k] - b[k]) + 3 * t * t * (d[k] - c[k]))
  return { pt, ang: Math.atan2(tg[1], tg[0]) * 180 / Math.PI }
}
function sausage(dy) {
  const P = [[150, 400 + dy], [250, 250 + dy], [470, 190 + dy], [650, 270 + dy]]
  const d = `M${P[0]}C${P[1]} ${P[2]} ${P[3]}`
  const marks = [0.22, 0.42, 0.62, 0.82].map((t) => { const { pt, ang } = bez(P, t); return `<rect x="${pt[0] - 9}" y="${pt[1] - 50}" width="18" height="100" rx="9" fill="#341306" opacity=".7" transform="rotate(${ang + 90 - 70} ${pt[0]} ${pt[1]})"/>` }).join('')
  return `<g filter="url(#mSausage)"><path d="${d}" stroke="url(#gSausage)" stroke-width="128" stroke-linecap="round" fill="none"/>${marks}</g>`
}

const DRUM = 'M150 300C140 160 290 100 420 150C530 192 548 300 478 372C446 406 436 440 430 482L352 470C240 466 156 410 150 300Z'

const scenes = {
  steak: slab('gBeef', 'mBeef', false),
  pork: slab('gPork', 'mPork', true),
  ribs: (() => {
    const rack = `<g transform="translate(400 400) scale(.86) translate(-400 -420)">
<g filter="url(#mBone)">${[190, 295, 400, 505, 610].map((x) => `<rect x="${x - 27}" y="420" width="54" height="250" rx="27" fill="url(#gBone)"/><circle cx="${x - 20}" cy="670" r="30" fill="url(#gBone)"/><circle cx="${x + 20}" cy="670" r="30" fill="url(#gBone)"/>`).join('')}</g>
<path d="M110 280c0-70 70-112 160-112h260c90 0 160 42 160 112v200c0 50-60 80-160 80H270c-100 0-160-30-160-80z" fill="url(#gFat)" filter="url(#mFat)" transform="translate(0 -24)"/>
<path d="M110 280c0-70 70-112 160-112h260c90 0 160 42 160 112v200c0 50-60 80-160 80H270c-100 0-160-30-160-80z" fill="url(#gPork)" filter="url(#mPork)"/></g>`
    return `${board}${dropOn(rack)}${rack}${rosemary(110, 140, 8, 1.1)}${peppercorns([[660, 150], [686, 168, 8]])}`
  })(),
  lamb: (() => {
    const chops = `<g transform="translate(0 -24)">${chop(262, 400, 0.8, -10)}${chop(548, 420, 0.76, 9)}</g>`
    return `${board}${dropOn(chops)}${chops}${rosemary(500, 650, -10, 1.2)}${salt([[120, 140], [140, 158], [160, 138]])}`
  })(),
  chicken: (() => {
    const leg = `<g transform="translate(20 10) scale(.92)"><g filter="url(#mBone)"><path d="M440 450L600 610" stroke="url(#gBone)" stroke-width="66" stroke-linecap="round" fill="none"/><circle cx="650" cy="592" r="44" fill="url(#gBone)"/><circle cx="592" cy="654" r="44" fill="url(#gBone)"/></g>
<path d="${DRUM}" fill="url(#gSkin)" filter="url(#mSkin)"/></g>`
    return `${board}${dropOn(leg)}${leg}${rosemary(110, 650, -24, 1.15)}${peppercorns([[640, 170], [666, 186, 8], [612, 190, 8]])}`
  })(),
  sausage: (() => {
    const s2 = `<g transform="translate(0 30)">${sausage(0)}${sausage(190)}</g>`
    return `${board}${dropOn(s2)}${s2}${rosemary(470, 650, -6, 1.1)}${peppercorns([[130, 160], [156, 174, 8]])}`
  })(),
  mince: `${shadow(400, 690, 320, 30)}<g filter="url(#mPlate)"><ellipse cx="400" cy="610" rx="330" ry="90" fill="url(#gPlate)"/></g>
<path d="M130 600c16-176 144-282 270-282s254 106 270 282c-80 66-460 66-540 0z" fill="url(#gMince)" filter="url(#mMince)"/>
${rosemary(520, 640, -8, 1)}`,
  kebab: `${shadow(400, 712, 320, 28)}
<g filter="url(#mSteel)"><path d="M${at(-470)} L${at(430)}" stroke="url(#gSteel)" stroke-width="20" stroke-linecap="round"/><circle cx="${at(470)[0]}" cy="${at(470)[1]}" r="30" fill="none" stroke="url(#gSteel)" stroke-width="12"/></g>
${piece(-300, 160, 220, 70, 'gChar', 'mChar', true)}${onion(-180)}${piece(-80, 80, 150, 40, 'gTomato', 'mTomato')}${piece(50, 190, 250, 80, 'gChar', 'mChar', true)}${piece(185, 80, 150, 40, 'gPepper', 'mTomato')}${onion(260)}${piece(345, 140, 190, 60, 'gChar', 'mChar', true)}`,
  veg: `${shadow(400, 702, 310, 30)}
<g filter="url(#mVeg)"><path d="M150 560c40-110 190-170 330-130" stroke="url(#gCucumber)" stroke-width="96" stroke-linecap="round" fill="none"/></g>
<g filter="url(#mVeg)"><circle cx="300" cy="470" r="160" fill="url(#gTomato)"/></g>
<path d="M300 318c-24-4-58 6-74 26 30-4 50 2 74 22 22-20 44-26 74-22-16-20-50-30-74-26z" fill="url(#gLeaf)" filter="url(#mHerb)"/>
<g filter="url(#mVeg)"><path d="M560 300c-78-46-188 6-170 128 14 98 94 170 170 140 76 30 156-42 170-140 18-122-92-174-170-128z" fill="url(#gApple)"/></g>
<path d="M560 300c0-38 10-62 30-84" stroke="#6b4325" stroke-width="12" stroke-linecap="round" fill="none"/>
<path d="M592 232c34-30 76-22 92-10-24 34-62 42-92 10z" fill="url(#gLeaf)" filter="url(#mHerb)"/>`,
  bread: `${shadow(400, 702, 320, 30)}
<g filter="url(#mSoft)"><path d="M90 560c120-40 500-40 620 0 20 70-30 120-120 120H210c-90 0-140-50-120-120z" fill="url(#gLavash)"/></g>
<g filter="url(#mCrust)"><ellipse cx="400" cy="430" rx="280" ry="150" fill="url(#gCrust)"/>
<g fill="none" stroke="#f1cd8a" stroke-width="18" stroke-linecap="round">${[240, 320, 400, 480, 560].map((x) => `<path d="M${x - 30} 370 L${x + 30} 490"/>`).join('')}</g></g>`,
  dairy: `${shadow(400, 702, 310, 30)}
<g filter="url(#mGlass)"><rect x="140" y="250" width="230" height="420" rx="40" fill="url(#gJar)"/><rect x="160" y="380" width="190" height="150" rx="16" fill="#3e8fd0"/></g>
<g filter="url(#mSoft)"><rect x="128" y="210" width="254" height="70" rx="26" fill="url(#gLid)"/></g>
<g filter="url(#mSoft)"><path d="M420 640L700 640L640 400C600 360 480 360 440 400z" fill="url(#gCheese)"/>
<g fill="#e0cb98">${[[520, 480, 18], [600, 560, 22], [480, 590, 14], [640, 470, 12]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g></g>`,
  spice: `${shadow(400, 702, 310, 30)}
<g filter="url(#mBoard)"><ellipse cx="400" cy="590" rx="300" ry="90" fill="url(#gBoard)"/></g>
<g filter="url(#mSpice)"><path d="M170 560c40-150 140-230 230-230s190 80 230 230c-120 40-340 40-460 0z" fill="url(#gSpice)"/></g>
<g filter="url(#mGlass)"><rect x="520" y="180" width="150" height="230" rx="30" fill="url(#gSauce)"/></g>
<g filter="url(#mSoft)"><rect x="530" y="150" width="130" height="50" rx="16" fill="#2f2f2f"/></g>
${peppercorns([[150, 630], [178, 646, 8], [640, 640], [668, 628, 8]])}`,
  drink: `${shadow(400, 702, 290, 28)}
<g filter="url(#mGlass)"><path d="M250 200h90v60c50 40 70 80 70 140v260c0 20-16 36-36 36H216c-20 0-36-16-36-36V400c0-60 20-100 70-140z" fill="url(#gWater)"/><rect x="200" y="430" width="190" height="130" rx="12" fill="#ffffff" opacity=".9"/></g>
<g filter="url(#mSoft)"><rect x="244" y="150" width="102" height="60" rx="14" fill="#2c7fb8"/></g>
<g filter="url(#mGlass)"><path d="M460 340h220l-26 330c-2 18-16 30-34 30H520c-18 0-32-12-34-30z" fill="url(#gGlass)"/><path d="M468 420h204l-20 250c-2 14-12 22-26 22H514c-14 0-24-8-26-22z" fill="url(#gJuice)"/></g>
<path d="M560 300l40 160" stroke="#e9573f" stroke-width="16" stroke-linecap="round"/>`,
  grill: `${shadow(400, 702, 330, 30)}
<g filter="url(#mSoft)"><path d="M120 300h300l-20 380H140z" fill="url(#gBag)"/><rect x="160" y="400" width="220" height="110" rx="10" fill="#1c1c1c" opacity=".85"/></g>
<g filter="url(#mCoal)">${[[230, 290, 56], [310, 270, 48], [380, 300, 40], [270, 230, 36]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#gCoal)"/>`).join('')}</g>
<g filter="url(#mSteel)">${[0, 1, 2].map((i) => `<path d="M${470 + i * 50} 680 L${560 + i * 50} 170" stroke="url(#gSteel)" stroke-width="16" stroke-linecap="round"/><circle cx="${565 + i * 50}" cy="152" r="18" fill="none" stroke="url(#gSteel)" stroke-width="10"/>`).join('')}</g>`,
}

const only = process.argv.slice(2)
const browser = await chromium.launch()
// deviceScaleFactor 2: рендер 1600×1600 и уменьшение до 800 — сглаживание и чёткая фактура
const page = await browser.newPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 })
for (const [name, inner] of Object.entries(scenes)) {
  if (only.length && !only.includes(name)) continue
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800"><defs>${defs}</defs>${inner}</svg>`
  await page.setContent(`<body style="margin:0;background:transparent">${svg}</body>`)
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 800, height: 800 } })
  const img = sharp(png).resize(800, 800, { kernel: 'lanczos3' })
  await img.clone().webp({ quality: 86, alphaQuality: 92, effort: 5 }).toFile(`${OUT}${name}.webp`)
  if (PREVIEW) await img.clone().png().toFile(`${PREVIEW}/art-${name}.png`)
  console.log('ok', name)
}
await browser.close()
