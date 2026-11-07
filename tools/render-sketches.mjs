// Рисунки «цветными карандашами» для плиток раздела «Տեսականի» (категории на главной).
// Каждый рисунок нарисован векторно (сцены ниже) в два слоя — цвет и контур, — а затем «прорисован карандашом»:
// цвет ложится штрихами с зерном бумаги, контур — графитом, чуть дрожащей линией. Фон прозрачный.
// Запуск (нужен sharp): node tools/render-sketches.mjs   → public/img/cat/<вид>.webp
// Только некоторые: node tools/render-sketches.mjs fish rabbit
// Те же сцены «кистью» (баннеры под «Հատուկ առաջարկներ» на главной): node tools/render-sketches.mjs --brush → public/img/brush/<вид>.webp
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const sharp = require('sharp')

const ARGS = process.argv.slice(2)
const BRUSH = ARGS.includes('--brush')
const OUT = fileURLToPath(new URL(BRUSH ? '../public/img/brush/' : '../public/img/cat/', import.meta.url))
mkdirSync(OUT, { recursive: true })

const W = 800 // рабочий размер (сцены рисуются в 400×400 и растрируются вдвое крупнее)
const SIZE = 400 // итоговый размер картинки
const GRAPHITE = [0.22, 0.18, 0.16]

// ───────────────────────── сцены ─────────────────────────

const E = (cx, cy, rx, ry = rx) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`
const R = (x, y, w, h, r = 0) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`
const star = (cx, cy, ro, ri, n, rot = -90) => Array.from({ length: n * 2 }, (_, i) => {
  const a = ((rot + (i * 180) / n) * Math.PI) / 180, r = i % 2 ? ri : ro
  return `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`
}).join('') + 'Z'

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), s | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
/** n точек внутри области (inside), радиус r0…r1 — пятнышки, крапинки. */
function scatter(seed, n, [x0, y0, x1, y1], inside, r0, r1) {
  const rand = rng(seed), out = []
  for (let k = 0; out.length < n && k < n * 50; k++) {
    const x = x0 + rand() * (x1 - x0), y = y0 + rand() * (y1 - y0)
    if (inside(x, y)) out.push([+x.toFixed(1), +y.toFixed(1), +(r0 + rand() * (r1 - r0)).toFixed(1)])
  }
  return out
}
const inEllipse = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1

/** Инструменты рисования одного слоя: 'color' — цвет, 'line' — контур (белые заливки закрывают линии позади). */
function kit(pass, K = 1) { // K — во сколько раз толще контуры (кисти нужны толще карандаша)
  const C = pass === 'color'
  const join = 'stroke-linejoin="round" stroke-linecap="round"'
  return {
    /** фигура с заливкой и контуром толщины lw */
    f: (d, fill, lw = 5, a = '') => C ? `<path d="${d}" fill="${fill}" ${a}/>`
      : `<path d="${d}" fill="#fff" stroke="${lw ? '#000' : 'none'}" stroke-width="${lw * K}" ${join} ${a}/>`,
    /** только цвет: тень, блик, румянец */
    p: (d, fill, a = '') => (C ? `<path d="${d}" fill="${fill}" ${a}/>` : ''),
    /** цветной штрих */
    s: (d, color, w, a = '') => (C ? `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" ${join} ${a}/>` : ''),
    /** графитовая линия */
    l: (d, w = 3, a = '') => (C ? '' : `<path d="${d}" fill="none" stroke="#000" stroke-width="${w * K}" ${join} ${a}/>`),
    /** толстая линия с контуром: сосиска, огурец, шампур */
    tube: (d, w, color, lw = 5, a = '') => C ? `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" ${a}/>`
      : `<path d="${d}" fill="none" stroke="#000" stroke-width="${w + 2 * lw * K}" stroke-linecap="round" ${a}/><path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" ${a}/>`,
    g: (t, ...xs) => `<g transform="${t}">${xs.join('')}</g>`,
  }
}

const lin = (id, a, b, [x1, y1, x2, y2] = [0, 0, 0, 1]) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
const DIAG = [0, 0, 1, 1], ACROSS = [0, 0, 1, 0]
const DEFS = [
  lin('kMeat', '#bd7442', '#7a3a1b'), lin('kTom', '#ee5c44', '#b32c21'), lin('kPep', '#74b74c', '#3f7f2b'),
  lin('pFat', '#fdf3e7', '#ebd2ba'), lin('pMeat', '#f5b3a8', '#d5736a', DIAG),
  lin('bMeat', '#cf4c40', '#8a2520', DIAG), lin('bBone', '#f7f0e2', '#d9c8a7'),
  lin('lBone', '#f8f1e3', '#dccbab', ACROSS), lin('lFat', '#fbeee0', '#e9cdb4'), lin('lMeat', '#d9645a', '#a13a34', DIAG),
  lin('cSkin', '#f7cf9c', '#d98a52', DIAG), lin('cBone', '#f8f1e3', '#dccbab', ACROSS),
  `<linearGradient id="fBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5f7f7b"/><stop offset=".36" stop-color="#a7b9b0"/><stop offset=".5" stop-color="#eaa5a9"/><stop offset=".64" stop-color="#ead2cc"/><stop offset="1" stop-color="#f4efe8"/></linearGradient>`,
  lin('fFin', '#a9b3ac', '#dcb4ae'), lin('fTail', '#7f958f', '#d3b2ab', ACROSS),
  lin('rFur', '#cdb9a3', '#957c64', DIAG), lin('rHead', '#d3c0aa', '#a38a71', DIAG),
  lin('sCase', '#b0463b', '#6b231e'), lin('sCut', '#d0635a', '#b04a42'), lin('sFrank', '#de8a55', '#b5592f'),
  `<radialGradient id="vApple" cx=".78" cy=".42" r=".85"><stop offset="0" stop-color="#e2483a"/><stop offset=".5" stop-color="#ec9a46"/><stop offset="1" stop-color="#c3d257"/></radialGradient>`,
  lin('brLav', '#f7e6bf', '#e2c48d'), lin('brLoaf', '#eab062', '#b86f2e'),
  lin('dMilk', '#fdfcf8', '#d5dce2', ACROSS), lin('dCheeseTop', '#fbe27a', '#f2cd55'), lin('dCheese', '#efbf48', '#d79f2c'),
  lin('spSauce', '#d8452f', '#9e271d', ACROSS), lin('spMound', '#e0863b', '#b45a22'), lin('spBowl', '#c99560', '#8f5f34'), lin('spChili', '#e5472f', '#a8261c'),
  lin('drWater', '#e2f2fa', '#a9d3ea', ACROSS), lin('drJuice', '#f9b04a', '#e8802a'),
  lin('gBox', '#6a6e75', '#3c3f45'), lin('gFlame', '#ffe07a', '#f06a2a'),
  lin('pigSkin', '#fbd0cd', '#e8939a', DIAG), lin('pigHead', '#fcd6d3', '#ec9ea4', DIAG), lin('pigSnout', '#f6aab0', '#de7d88'),
  lin('cowHide', '#fbf8f2', '#ddd5c8', DIAG), lin('cowNose', '#f7c6c6', '#e39a9e'),
  lin('shWool', '#fffdf7', '#e6dccb', DIAG), lin('shFace', '#7a6a61', '#4a3f39', DIAG),
  lin('henBody', '#f1b46c', '#b9682e', DIAG), lin('henHead', '#f4c07c', '#c97a3a', DIAG), lin('henWing', '#d98a46', '#9c5022', DIAG), lin('henComb', '#ef4b3a', '#b9271c'),
  lin('wBottle', '#5e2f3a', '#2a1218', ACROSS), lin('wWine', '#b3243a', '#6e1022'),
  lin('cBottle', '#e8a345', '#8f4a14', ACROSS), lin('cAmber', '#f0a83f', '#b0601a'),
].join('')

const shadow = (k, cx, cy, rx, ry = 13) => k.p(E(cx, cy, rx, ry), '#ddd6cb')

function sprig(k, x1, y1, x2, y2, n = 8, len = 15) {
  let out = k.s(`M${x1} ${y1}L${x2} ${y2}`, '#5b6e34', 3.5) + k.l(`M${x1} ${y1}L${x2} ${y2}`, 2)
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1), px = x1 + dx * t, py = y1 + dy * t
    for (const side of [-1, 1]) {
      const a = side * 0.62, ex = px + (ux * Math.cos(a) - uy * Math.sin(a)) * len, ey = py + (ux * Math.sin(a) + uy * Math.cos(a)) * len
      out += k.s(`M${px.toFixed(1)} ${py.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}`, '#5f9145', 5)
    }
  }
  return out
}
const peppers = (k, pts) => pts.map(([x, y]) => k.f(E(x, y, 5.5), '#3b302b', 2)).join('')

const scenes = {
  // Խորոված — шампур: мясо, лук, помидор, перец
  kebab(k) {
    const meat = (x) => k.g(`translate(${x} 0)`,
      k.f('M-27 -30C-27 -40 -18 -42 0 -41C20 -40 28 -36 28 -24L29 26C29 38 20 41 0 41C-20 41 -28 37 -28 26Z', 'url(#kMeat)', 5),
      k.s('M-15 -30L-4 30M6 -32L17 26', '#4a2210', 5, 'opacity=".8"'),
      k.p(E(-10, -24, 9, 5), '#f0c096', 'opacity=".55"'))
    return shadow(k, 200, 322, 140) + k.g('translate(200 196) rotate(-28) scale(.9)',
      k.f(E(-196, 0, 17) + E(-196, 0, 9), '#a9aeb6', 4, 'fill-rule="evenodd"'),
      k.f(R(-182, -4, 372, 8, 4), '#bfc4cc', 3.5),
      meat(-118), k.f(R(-86, -32, 18, 64, 9), '#f1e0ee', 4), k.s('M-77 -24V24', '#c79ac4', 3),
      meat(-38), k.f(E(6, 0, 22, 30), 'url(#kTom)', 4.5), k.p(E(-2, -12, 6, 8), '#fff', 'opacity=".6"'),
      meat(52), k.f(E(98, 0, 13, 31), 'url(#kPep)', 4.5), k.p(E(94, -12, 4, 9), '#fff', 'opacity=".45"'),
      meat(142))
  },

  // Խոզի միս — свинка (раньше — отбивная): на плитке категории — животное, из которого мясо
  ribs(k) {
    const leg = (x, y, h = 56) => k.f(R(x, y, 26, h, 11), 'url(#pigSkin)', 4.5) + k.p(R(x, y + h - 13, 26, 13, 6), '#c96f7a') + k.l(`M${x + 2} ${y + h - 13}H${x + 24}`, 2.5)
    const tail = 'M326 200C346 190 358 208 346 218C336 226 324 214 336 206'
    return shadow(k, 214, 334, 140) +
      leg(152, 258) + leg(272, 258) + leg(180, 266) + leg(300, 264) +
      k.s(tail, '#e48f96', 6) + k.l(tail, 3) +
      k.f(E(228, 220, 112, 74), 'url(#pigSkin)', 5.5) +
      k.p(E(222, 262, 74, 22), '#fde4e2', 'opacity=".75"') +
      k.p(E(270, 176, 40, 14), '#fff', 'opacity=".3" transform="rotate(-12 270 176)"') +
      k.f('M92 160L84 112C110 114 130 130 136 152Z', '#e48f96', 4.5) +
      k.f(E(120, 206, 60, 56), 'url(#pigHead)', 5.5) +
      k.f('M134 158L152 110C174 124 180 150 170 172Z', 'url(#pigSkin)', 4.5) +
      k.p('M142 154L154 124C166 136 168 152 162 164Z', '#f3a2a9') +
      k.f(E(70, 224, 25, 21), 'url(#pigSnout)', 4.5) +
      k.f(E(61, 222, 4.5, 6.5), '#8a3c46', 0) + k.f(E(78, 222, 4.5, 6.5), '#8a3c46', 0) +
      k.f(E(110, 190, 7.5, 8.5), '#2b2320', 2) + k.p(E(108, 187, 2.4), '#fff') +
      k.p(E(128, 236, 14, 8), '#f08f98', 'opacity=".6"') +
      k.l('M86 254C94 262 106 262 114 255', 3)
  },

  // Տավարի միս — корова (раньше — стейк)
  steak(k) {
    const leg = (x, y, h = 72) => k.f(R(x, y, 24, h, 9), '#f4efe6', 4.5) + k.f(R(x - 1, y + h - 14, 26, 16, 5), '#4a3b34', 3.5)
    const body = 'M120 186C120 150 152 136 202 136L302 136C342 136 356 164 354 200C352 240 334 268 294 270L178 270C142 270 120 248 120 216Z'
    const tail = 'M350 172C370 194 374 228 368 254'
    const patch = '#3a312d'
    return shadow(k, 232, 322, 140) +
      leg(150, 236) + leg(300, 236) + leg(178, 244) + leg(324, 242) +
      k.s(tail, '#6b5a50', 4) + k.l(tail, 3) + k.f(E(368, 262, 9, 14), '#4a3b34', 3) +
      k.f(body, 'url(#cowHide)', 5.5) +
      k.p('M198 140C224 150 234 176 216 196C198 214 168 204 162 182C158 164 172 146 198 140Z', patch) +
      k.p('M294 148C320 146 338 164 332 188C326 210 298 212 286 194C274 176 276 154 294 148Z', patch) +
      k.p('M242 226C264 220 284 232 280 252C278 266 256 270 240 262C226 254 226 232 242 226Z', patch) +
      k.f(E(248, 274, 22, 10), '#f2b3b5', 3.5) +
      k.f('M80 120C70 104 72 90 84 84C84 98 90 110 98 116Z', '#efe4cf', 3.5) +
      k.f('M128 120C138 104 136 90 124 84C124 98 118 110 110 116Z', '#efe4cf', 3.5) +
      k.f(E(54, 152, 24, 11), '#efe9df', 4, 'transform="rotate(-18 54 152)"') + k.p(E(50, 153, 12, 5), '#f2b3b5', 'transform="rotate(-18 54 152)"') +
      k.f(E(154, 152, 24, 11), '#efe9df', 4, 'transform="rotate(18 154 152)"') + k.p(E(158, 153, 12, 5), '#f2b3b5', 'transform="rotate(18 154 152)"') +
      k.f('M66 152C66 124 84 112 104 112C124 112 142 124 142 152L140 206C140 222 128 234 104 234C80 234 68 222 68 206Z', 'url(#cowHide)', 5.5) +
      k.p('M116 124C132 122 142 138 140 158C138 172 126 178 116 170C106 160 104 136 116 124Z', patch) +
      k.f(E(104, 212, 38, 25), 'url(#cowNose)', 4.5) +
      k.f(E(90, 212, 5, 7), '#7a3f42', 0) + k.f(E(118, 212, 5, 7), '#7a3f42', 0) +
      k.f(E(86, 164, 7.5, 8.5), '#2b2320', 2) + k.p(E(84, 161, 2.4), '#fff') +
      k.f(E(122, 164, 10, 11), '#f8f6f0', 2.5) + k.f(E(122, 165, 6.5, 7.5), '#2b2320', 0) + k.p(E(120, 162, 2.2), '#fff') +
      k.l('M96 118C100 128 108 128 112 118', 2.5)
  },

  // Գառան միս — овечка (раньше — каре ягнёнка)
  lamb(k) {
    const leg = (x, y) => k.f(R(x, y, 20, 62, 8), '#5f524b', 4) + k.p(R(x, y + 50, 20, 12, 5), '#2f2825')
    const puffs = [[166, 178, 40], [210, 158, 44], [258, 158, 44], [302, 176, 40], [324, 220, 38], [300, 262, 40], [252, 274, 42], [204, 274, 42], [158, 258, 40], [142, 218, 38], [232, 214, 66]]
    const cloud = puffs.map(([x, y, r]) => E(x, y, r)).join('')
    const curls = [[198, 196], [246, 186], [286, 210], [222, 238], [268, 248], [184, 238], [300, 240], [236, 208]]
      .map(([x, y]) => k.l(`M${x - 9} ${y + 3}C${x - 8} ${y - 6} ${x + 2} ${y - 8} ${x + 7} ${y - 2}`, 2.2)).join('')
    const tuft = [[100, 150, 15], [118, 142, 17], [136, 150, 15]].map(([x, y, r]) => E(x, y, r)).join('')
    return shadow(k, 230, 338, 140) +
      leg(160, 262) + leg(276, 262) + leg(188, 270) + leg(304, 268) +
      k.f(cloud, 'url(#shWool)', 11) + k.f(cloud, 'url(#shWool)', 0) + curls +
      k.p(E(214, 184, 46, 18), '#fff', 'opacity=".45" transform="rotate(-10 214 184)"') +
      k.f(E(80, 170, 24, 11), '#5f524b', 4, 'transform="rotate(-28 80 170)"') + k.p(E(78, 171, 13, 5), '#d9a39a', 'transform="rotate(-28 80 170)"') +
      k.f(E(116, 204, 36, 48), 'url(#shFace)', 5, 'transform="rotate(-8 116 204)"') +
      k.f(tuft, 'url(#shWool)', 9) + k.f(tuft, 'url(#shWool)', 0) +
      k.f(E(150, 176, 22, 10), '#5f524b', 4, 'transform="rotate(24 150 176)"') +
      k.f(E(102, 196, 8, 9), '#f8f6f0', 2.5) + k.f(E(102, 197, 4.5, 5.5), '#1f1a17', 0) + k.p(E(101, 195, 1.6), '#fff') +
      k.f(E(130, 194, 8, 9), '#f8f6f0', 2.5) + k.f(E(130, 195, 4.5, 5.5), '#1f1a17', 0) + k.p(E(129, 193, 1.6), '#fff') +
      k.p(E(112, 238, 14, 9), '#8b7b72') + k.l('M104 236C108 242 116 242 120 236M112 238V246', 2.5)
  },

  // Թռչնամիս — курица (раньше — две ножки)
  chicken(k) {
    const foot = (x) => k.tube(`M${x} 276L${x - 4} 322`, 7, '#f0b43c', 2.5) +
      k.tube(`M${x - 4} 322L${x - 22} 330M${x - 4} 322L${x - 2} 334M${x - 4} 322L${x + 14} 330`, 5, '#f0b43c', 2.5)
    return shadow(k, 214, 338, 130) + foot(196) + foot(236) +
      k.f('M262 196C270 146 304 112 336 108C330 140 338 170 320 206Z', '#c25a2a', 5) +
      k.f('M276 212C292 168 326 146 354 150C340 176 344 204 326 232Z', '#8f3f1f', 5) +
      k.f('M118 186C118 150 150 128 186 140C222 152 250 160 290 168C324 175 334 212 314 246C292 284 240 300 196 292C150 284 118 250 118 212Z', 'url(#henBody)', 5.5) +
      k.p(E(170, 252, 40, 22), '#f9dcae', 'opacity=".55"') +
      k.f('M196 214C230 198 272 204 292 228C272 258 228 266 198 246C188 236 188 222 196 214Z', 'url(#henWing)', 4.5) +
      k.l('M212 230C232 226 254 228 272 236M216 244C236 244 254 246 268 250', 2.5) +
      k.f('M112 122C106 102 122 92 132 104C134 86 152 84 156 100C164 88 182 94 174 116C166 126 128 130 112 122Z', 'url(#henComb)', 4.5) +
      k.f(E(140, 152, 36, 38), 'url(#henHead)', 5.5) +
      k.f('M108 146L80 156L108 166Z', '#f0b43c', 4) +
      k.f(E(112, 180, 9, 14), 'url(#henComb)', 3.5) +
      k.f(E(130, 144, 7, 8), '#2b2320', 2) + k.p(E(128, 141, 2.2), '#fff') +
      k.p(E(150, 166, 12, 7), '#f08f60', 'opacity=".45"')
  },

  // Ձուկ — форель
  fish(k) {
    const spots = scatter(11, 46, [100, 140, 312, 214], (x, y) => inEllipse(186, 200, 132, 58)(x, y) && y < 200 + (x - 60) * 0.02, 1.8, 3.2)
    return shadow(k, 210, 316, 140) + k.g('rotate(-6 210 205)',
      k.f('M310 192C330 172 352 152 374 136C356 182 356 230 376 278C352 262 330 242 310 220Z', 'url(#fTail)', 5),
      k.f('M160 148C176 116 210 106 238 112C232 126 228 138 226 148Z', 'url(#fFin)', 4.5),
      k.f('M272 162C280 152 290 150 296 154C292 162 288 168 284 172Z', 'url(#fFin)', 3.5),
      k.f('M258 250C266 264 278 272 290 274C288 260 282 252 274 246Z', 'url(#fFin)', 4),
      k.f('M196 258C204 274 216 286 230 290C230 276 224 264 214 256Z', 'url(#fFin)', 4),
      k.f('M46 208C66 170 118 146 186 142C246 139 290 160 316 188L318 222C290 248 246 262 188 262C120 262 68 246 46 208Z', 'url(#fBody)', 5.5),
      spots.map(([x, y, r]) => k.p(E(x, y, r), '#3d4946')).join(''),
      k.p('M120 168C170 154 240 154 290 176', 'none'),
      k.s('M130 220C180 232 250 230 300 214', '#fff', 5, 'opacity=".45"'),
      k.f('M112 230C124 246 136 262 150 270C150 254 142 238 128 226Z', 'url(#fFin)', 4),
      k.l('M108 176C122 196 122 224 106 244', 3.5), k.l('M48 210C58 214 66 216 76 213', 3),
      k.f(E(86, 196, 10.5), '#f8f6f0', 3), k.f(E(88, 196, 5), '#1f1a17', 0), k.p(E(86, 194, 1.8), '#fff'))
  },

  // Նապաստակի միս — кролик
  rabbit(k) {
    return shadow(k, 222, 334, 132) +
      k.f(E(326, 262, 22, 20), '#f4ede4', 4.5) +
      k.f(E(180, 112, 16, 54), 'url(#rFur)', 4.5, 'transform="rotate(20 180 112)"') +
      k.f(E(232, 264, 96, 70), 'url(#rFur)', 5.5, 'transform="rotate(-8 232 264)"') +
      k.p(E(194, 278, 34, 42), '#f1e7da', 'opacity=".9"') +
      k.s('M236 312C228 270 256 240 290 246C316 252 326 278 318 300', '#8d755e', 5, 'opacity=".55"') +
      k.l('M236 312C228 270 256 240 290 246C316 252 326 278 318 300', 3.5) +
      k.f(E(146, 196, 52, 45), 'url(#rHead)', 5.5, 'transform="rotate(-12 146 196)"') +
      k.p(E(152, 216, 26, 16), '#f1e7da', 'opacity=".75"') +
      k.f(E(160, 108, 17, 58), 'url(#rHead)', 5, 'transform="rotate(6 160 108)"') +
      k.p(E(161, 112, 8, 42), '#f0b2ab', 'transform="rotate(6 160 108)"') +
      k.f(R(150, 300, 52, 24, 12), '#ece1d3', 4.5) + k.l('M168 306V318M184 306V318', 2.5) +
      k.f(E(270, 326, 56, 14), '#ddcdb9', 4.5) +
      k.f(E(132, 184, 8, 9), '#2b2320', 2) + k.p(E(130, 181, 2.6), '#fff') +
      k.f(E(100, 200, 6, 4.5), '#e58f94', 2.5) + k.l('M104 208L72 200M104 212L74 218M102 204L76 188', 2)
  },

  // Երշիկեղեն — батон салями, кружок и две сосиски
  sausage(k) {
    const cut = scatter(5, 16, [88, -40, 132, 40], inEllipse(110, 0, 19, 37), 2, 4.2)
    const slice = scatter(9, 20, [246, 226, 318, 298], inEllipse(282, 262, 32, 32), 2, 4.6)
    const flecks = scatter(3, 40, [-140, -40, 96, 40], () => true, 1, 2)
    return shadow(k, 205, 340, 150) +
      k.g('translate(190 162) rotate(-14)',
        k.f(R(-150, -44, 262, 88, 44), 'url(#sCase)', 5.5),
        flecks.map(([x, y, r]) => k.p(E(x, y, r), '#eadbd2', 'opacity=".55"')).join(''),
        k.s('M-118 -42C-110 -14 -110 14 -118 42M-104 -43C-96 -14 -96 14 -104 43', '#d1ad72', 4.5),
        k.l('M-118 -42C-110 -14 -110 14 -118 42M-104 -43C-96 -14 -96 14 -104 43', 2),
        k.s('M-110 -26H80', '#fff', 6, 'opacity=".3"'),
        k.f(E(110, 0, 24, 44), 'url(#sCut)', 4.5),
        cut.map(([x, y, r]) => k.p(E(x, y, r), '#f7e3db')).join('')) +
      k.f(E(282, 262, 44), '#8a2f28', 5) + k.p(E(282, 262, 37), 'url(#sCut)') +
      slice.map(([x, y, r]) => k.p(E(x, y, r), '#f7e3db')).join('') +
      k.tube('M64 294C104 272 160 272 204 294', 36, 'url(#sFrank)', 5) + k.s('M76 284C112 266 156 266 194 282', '#f0b38a', 6, 'opacity=".8"') +
      k.tube('M90 332C134 312 192 312 236 332', 36, 'url(#sFrank)', 5) + k.s('M102 322C140 304 186 304 224 320', '#f0b38a', 6, 'opacity=".8"')
  },

  // Մրգեր և բանջարեղեն — огурец, яблоко, помидор
  veg(k) {
    return shadow(k, 205, 334, 150) +
      k.tube('M88 176C150 142 250 130 318 150', 54, '#4a8a3a', 5.5) +
      k.s('M100 166C160 138 250 128 306 144M104 186C160 158 252 150 310 160', '#86c264', 4.5, 'opacity=".85"') +
      [[130, 160], [170, 146], [214, 140], [256, 140], [292, 148], [150, 172], [236, 156]].map(([x, y]) => k.p(E(x, y, 2.4), '#2a5824')).join('') +
      k.f(E(346, 156, 7, 6), '#6c8a3a', 3) +
      k.g('translate(284 248) scale(.84)',
        k.f('M-18 -56C-38 -76 -80 -70 -86 -26C-92 18 -64 66 -24 62C-14 60 -8 56 0 56C8 56 14 60 24 62C64 66 92 18 86 -26C80 -70 38 -76 18 -56C10 -48 -10 -48 -18 -56Z', 'url(#vApple)', 5.5),
        k.p(E(-48, -24, 12, 20), '#fff', 'opacity=".35"'),
        k.s('M0 -50C0 -62 3 -72 8 -82', '#6b4a2b', 6), k.l('M0 -50C0 -62 3 -72 8 -82', 2.5),
        k.f('M8 -72C22 -92 48 -94 60 -82C48 -66 26 -62 8 -72Z', '#5d9e3f', 3.5), k.s('M12 -74C28 -80 42 -82 54 -82', '#8cc66a', 2.5)) +
      k.f(E(150, 256, 76, 66), 'url(#kTom)', 5.5) +
      k.p(E(118, 226, 16, 11), '#fff', 'opacity=".5" transform="rotate(-30 118 226)"') +
      k.f(star(150, 196, 32, 9, 5), '#4f9a3b', 3.5) + k.s('M150 196L152 180', '#4f7a2f', 7) + k.l('M150 196L152 180', 2.5)
  },

  // Հաց և լավաշ — лаваш и матнакаш
  bread(k) {
    const blisters = scatter(13, 18, [76, 132, 336, 236], (x, y) => y > 146 && y < 232, 3, 7)
    return shadow(k, 205, 336, 150) +
      // лаваш — мягкий сложенный лист с волнистыми краями
      k.f('M54 196C64 156 104 134 160 138C204 141 236 120 288 124C330 128 354 156 350 194C348 222 352 240 346 260C300 238 236 244 182 250C134 256 96 262 62 274C54 248 50 222 54 196Z', 'url(#brLav)', 5) +
      blisters.map(([x, y, r]) => k.p(E(x, y, r, r * 0.7), '#c99a5c', 'opacity=".7"')).join('') +
      k.l('M58 222C100 204 140 200 184 196C232 192 290 176 349 200', 3) +
      k.f('M72 270C72 214 132 192 206 192C280 192 340 214 340 270C340 306 290 324 206 324C122 324 72 306 72 270Z', 'url(#brLoaf)', 5.5) +
      k.p(E(170, 214, 70, 14), '#fbd593', 'opacity=".55"') +
      k.s('M116 232C162 220 250 220 296 232M98 260C150 247 262 247 314 260M102 290C154 279 258 279 310 290', '#9b5a22', 6) +
      k.l('M116 232C162 220 250 220 296 232M98 260C150 247 262 247 314 260M102 290C154 279 258 279 310 290', 2.5)
  },

  // Կաթնամթերք — бутылка молока и сыр
  dairy(k) {
    return shadow(k, 214, 344, 150) +
      k.f(R(118, 100, 48, 40, 4), 'url(#dMilk)', 4.5) +
      k.f('M116 132C116 150 94 162 94 192L94 320C94 332 102 340 114 340L170 340C182 340 190 332 190 320L190 192C190 162 168 150 168 132Z', 'url(#dMilk)', 5.5) +
      k.f(R(112, 82, 60, 24, 7), '#3f78c4', 4.5) +
      k.f(R(102, 218, 80, 60, 8), '#6ea6de', 4) + k.s('M112 254C126 242 140 264 154 252C162 246 168 248 174 252', '#fff', 4.5) +
      k.s('M108 196L108 312', '#fff', 7, 'opacity=".75"') +
      k.f('M176 268L344 300L344 342L176 342Z', 'url(#dCheese)', 5.5) +
      k.f('M176 268L246 228L344 300Z', 'url(#dCheeseTop)', 5) +
      [[236, 262, 12, 6], [276, 280, 9, 4.5], [212, 256, 6, 3]].map(([x, y, rx, ry]) => k.f(E(x, y, rx, ry), '#dcaa36', 2.5)).join('') +
      [[214, 314, 11, 9], [268, 326, 8, 7], [308, 320, 10, 8], [240, 297, 6, 5]].map(([x, y, rx, ry]) => k.f(E(x, y, rx, ry), '#cf982b', 2.5)).join('')
  },

  // Համեմունքներ և սոուսներ — банка аджики, миска с паприкой, перчик
  spice(k) {
    const specks = scatter(17, 34, [90, 206, 212, 260], (x, y) => y > 262 - (1 - ((x - 150) / 64) ** 2) * 56, 1.2, 2.4)
    return shadow(k, 205, 344, 150) +
      k.f(R(214, 140, 104, 172, 20), 'url(#spSauce)', 5.5) +
      k.f(R(208, 116, 116, 32, 9), '#6b4a34', 5) + k.s('M220 124V140M236 124V140M252 124V140M268 124V140M284 124V140M300 124V140', '#8a6548', 3) +
      k.f(R(228, 196, 76, 62, 6), '#f4e4c6', 3.5) + k.s('M240 214H292M240 230H282M240 244H288', '#b5532f', 4) +
      k.s('M228 160L228 296', '#fff', 7, 'opacity=".4"') +
      k.f('M84 262C96 222 128 204 150 204C172 204 204 222 216 262Z', 'url(#spMound)', 4.5) +
      specks.map(([x, y, r]) => k.p(E(x, y, r), '#7d3615')).join('') +
      k.f('M66 260L234 260C230 312 190 336 150 336C110 336 70 312 66 260Z', 'url(#spBowl)', 5.5) +
      k.s('M84 276C110 284 190 284 216 276', '#e0b585', 4, 'opacity=".8"') +
      k.f('M152 326C204 332 270 324 318 296C328 290 338 296 332 306C294 344 214 354 154 346C140 344 138 328 152 326Z', 'url(#spChili)', 5) +
      k.s('M174 334C222 336 266 326 302 308', '#ffb3a3', 4, 'opacity=".75"') +
      k.s('M150 336C136 336 126 330 120 318', '#4f8a3a', 8) + k.l('M150 336C136 336 126 330 120 318', 2.5) +
      k.f(E(152, 336, 9, 11), '#4f8a3a', 3)
  },

  // Ըմպելիքներ — бутылка воды и стакан сока с лимоном
  drink(k) {
    return shadow(k, 212, 350, 140, 12) +
      k.f('M124 108C100 122 92 146 92 172L92 330C92 342 100 348 112 348L172 348C184 348 192 342 192 330L192 172C192 146 184 122 160 108Z', 'url(#drWater)', 5.5) +
      k.f('M128 86L156 86L160 108L124 108Z', 'url(#drWater)', 4) +
      k.f(R(122, 60, 40, 28, 6), '#2f6fbf', 4.5) + k.s('M130 66V82M142 66V82M154 66V82', '#5b93d6', 3) +
      k.s('M96 186H188M96 300H188M96 316H188', '#c7e3f2', 4) +
      k.f(R(92, 214, 100, 58), '#3f86d0', 4) + k.s('M104 248C120 236 136 260 152 246C164 236 174 240 182 246', '#fff', 4.5) +
      k.s('M106 150L106 330', '#fff', 7, 'opacity=".65"') +
      k.f('M212 172L332 172L318 344C317 350 312 352 306 352L238 352C232 352 227 350 226 344Z', '#eef6f8', 5.5) +
      k.tube('M300 112L284 260', 9, '#e04a3c', 3.5) +
      k.p('M215 204L329 204L318 344C317 350 312 352 306 352L238 352C232 352 227 350 226 344Z', 'url(#drJuice)', 'opacity=".92"') +
      k.l('M215 204L329 204', 3) + k.s('M230 220L240 336', '#fff', 6, 'opacity=".45"') +
      k.f(E(330, 176, 28), '#f6d443', 4.5) + k.p(E(330, 176, 22), '#fbe88a') +
      k.s('M330 176L330 156M330 176L349 170M330 176L342 193M330 176L318 193M330 176L311 170', '#efc22e', 3)
  },

  // Գինի — бутылка и бокал красного вина
  wine(k) {
    const bottle = 'M136 74H164V130C164 148 196 158 196 198V318C196 326 190 332 182 332H118C110 332 104 326 104 318V198C104 158 136 148 136 130Z'
    const bowl = 'M220 166H320C324 226 304 262 270 264C236 262 216 226 220 166Z'
    return shadow(k, 212, 342, 150) +
      k.f(bottle, 'url(#wBottle)', 5.5) +
      k.f(R(132, 60, 36, 46, 7), '#8c2130', 4.5) + k.l('M132 92H168', 2.5) +
      k.s('M118 206V312', '#fff', 6, 'opacity=".35"') +
      k.f(R(112, 220, 76, 70, 7), '#f3e6cc', 4) +
      [[142, 244], [154, 244], [148, 255], [160, 255], [136, 255], [154, 266], [142, 266], [148, 277]].map(([x, y]) => k.f(E(x, y, 6), '#7a2a46', 2)).join('') +
      k.s('M150 238C154 228 164 226 168 230', '#5f9145', 3) +
      k.f(bowl, '#f4f8fa', 5) +
      k.p('M223 206H317C311 242 294 262 270 262C246 262 229 242 223 206Z', 'url(#wWine)') +
      k.l('M223 206H317', 3) + k.s('M236 180C232 204 236 226 248 242', '#fff', 6, 'opacity=".6"') +
      k.f(R(265, 262, 10, 52, 4), '#eef4f7', 3.5) +
      k.f(E(270, 318, 36, 9), '#eef4f7', 4)
  },

  // Օղի — бутылка водки и рюмка
  vodka(k) {
    const bottle = 'M150 56H176V96C176 108 198 116 198 140V320C198 328 192 334 184 334H142C134 334 128 328 128 320V140C128 116 150 108 150 96Z'
    const shot = 'M230 244H302L294 326C294 330 290 334 286 334H246C242 334 238 330 238 326Z'
    return shadow(k, 216, 344, 140) +
      k.f(bottle, 'url(#drWater)', 5.5) +
      k.f(R(147, 40, 32, 30, 6), '#c3c8cf', 4.5) + k.l('M147 52H179M147 60H179', 2) +
      k.s('M140 150V312', '#fff', 7, 'opacity=".6"') +
      k.f(R(134, 196, 58, 80, 5), '#fbfcfd', 4) +
      k.p(R(134, 214, 58, 14), '#c0392b') + k.l('M134 214H192M134 228H192', 2) +
      k.l('M146 244H180M150 254H176M154 264H172', 2) +
      k.f(shot, '#eef6f8', 5) +
      k.p('M233 268H299L294 326C294 330 290 334 286 334H246C242 334 238 330 238 326Z', '#cfe6f2') +
      k.l('M233 268H299', 2.5) + k.s('M244 252L250 322', '#fff', 5, 'opacity=".7"')
  },

  // Կոնյակ — бутылка коньяка и бокал-снифтер
  cognac(k) {
    const bottle = 'M110 62H138V112C138 124 178 136 178 176V318C178 326 172 332 164 332H86C78 332 72 326 72 318V176C72 136 110 124 110 112Z'
    const glass = 'M218 158H290C306 180 318 202 318 228C318 266 290 290 254 290C218 290 190 266 190 228C190 202 202 180 218 158Z'
    return shadow(k, 206, 344, 150) +
      k.f(bottle, 'url(#cBottle)', 5.5) +
      k.f(R(106, 46, 36, 28, 6), '#3c2416', 4.5) +
      k.s('M86 186V312', '#fff', 6, 'opacity=".3"') +
      k.f(R(84, 204, 82, 66, 7), '#f3e6cc', 4) +
      [104, 125, 146].map((x) => k.f(star(x, 226, 8, 3.5, 5), '#d9a531', 2)).join('') +
      k.l('M98 248H152M104 258H146', 2) +
      k.f(glass, '#f4f8fa', 5) +
      k.p('M193 240H315C310 270 286 290 254 290C222 290 198 270 193 240Z', 'url(#cAmber)') +
      k.l('M193 240H315', 3) + k.s('M210 186C202 206 202 228 210 248', '#fff', 6, 'opacity=".6"') +
      k.f(R(249, 290, 10, 26, 4), '#eef4f7', 3.5) +
      k.f(E(254, 320, 34, 8), '#eef4f7', 4)
  },

  // Մանղալի պարագաներ — мангал с углями и шампурами
  grill(k) {
    const skewer = (x) => k.tube(`M${x - 40} ${238}L${x + 52} ${174}`, 5, '#c3c7cd', 3) + k.f(E(x - 48, 244, 10) + E(x - 48, 244, 4.5), '#a9aeb6', 3, 'fill-rule="evenodd"')
    const flame = (x, y, s) => k.f(`M${x} ${y}c${-12 * s} ${-10 * s} ${-10 * s} ${-26 * s} 0 ${-40 * s}c${2 * s} ${12 * s} ${12 * s} ${16 * s} ${10 * s} ${28 * s}c${2 * s} ${-6 * s} ${6 * s} ${-8 * s} ${8 * s} ${-12 * s}c${4 * s} ${14 * s} ${-4 * s} ${24 * s} ${-18 * s} ${24 * s}Z`, 'url(#gFlame)', 3)
    return shadow(k, 214, 346, 150) +
      k.f(R(126, 230, 9, 92, 3), '#4a4b50', 3.5) + k.f(R(334, 210, 9, 100, 3), '#4a4b50', 3.5) +
      k.f('M312 214L352 186L342 240L300 272Z', '#43464c', 5) +
      k.f('M80 214L120 186L352 186L312 214Z', '#2e2e31', 5) +
      [[130, 204, 12], [162, 196, 13], [196, 204, 12], [228, 196, 13], [262, 204, 12], [296, 196, 12], [320, 192, 9]].map(([x, y, r]) =>
        k.p(E(x, y, r, r * 0.6), '#3a3a3d') + k.p(E(x + 2, y - 1, r * 0.55, r * 0.3), '#f08a2a', 'opacity=".9"')).join('') +
      flame(150, 202, 0.9) + flame(214, 200, 1.1) + flame(282, 198, 0.85) +
      k.f('M80 214L312 214L300 272L92 272Z', 'url(#gBox)', 5.5) +
      [130, 166, 202, 238, 274].map((x) => k.f(E(x, 246, 6), '#2a2b2e', 2)).join('') +
      k.f(R(92, 268, 10, 78, 3), '#4a4b50', 4) + k.f(R(290, 268, 10, 78, 3), '#4a4b50', 4) +
      [136, 192, 248, 304].map(skewer).join('')
  },
}

// ───────────────────────── карандаш ─────────────────────────

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b

function hash(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 982451653)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}
function vnoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}
/** Шум → равномерное распределение 0…1. */
function equalize(a) {
  const BINS = 2048, hist = new Float64Array(BINS)
  let lo = Infinity, hi = -Infinity
  for (const v of a) { if (v < lo) lo = v; if (v > hi) hi = v }
  const k = (BINS - 1) / (hi - lo || 1)
  for (const v of a) hist[Math.round((v - lo) * k)]++
  for (let i = 1; i < BINS; i++) hist[i] += hist[i - 1]
  return a.map((v) => hist[Math.round((v - lo) * k)] / a.length)
}
/** Значение слоя в дробной точке (билинейно), за краем — 0. */
function sample(a, x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0
  const at = (xx, yy) => (xx < 0 || yy < 0 || xx >= W || yy >= W ? 0 : a[yy * W + xx])
  return (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy
}

/** tf — сдвиг и масштаб сцены (кисть вписывает рисунок в подложку сама), K — толщина контуров. */
async function raster(kind, pass, { tf = "translate(0 0)", K = 1 } = {}) {
  const k = kit(pass, K)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 400 400"><defs>${DEFS}</defs>` +
    `${pass === 'line' ? '<rect width="400" height="400" fill="#fff"/>' : ''}<g transform="${tf}">${scenes[kind](k)}</g></svg>`
  const { data } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return data
}

function pencil(color, lines, seed) {
  const N = W * W
  const cr = new Float32Array(N), cg = new Float32Array(N), cb = new Float32Array(N), ca = new Float32Array(N), ink = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    ca[i] = color[i * 4 + 3] / 255
    cr[i] = color[i * 4] / 255; cg[i] = color[i * 4 + 1] / 255; cb[i] = color[i * 4 + 2] / 255
    ink[i] = 1 - lum(lines[i * 4], lines[i * 4 + 1], lines[i * 4 + 2]) / 255
  }

  // штрихи цветного карандаша: узкие длинные полосы под одним наклоном + зерно бумаги
  const ang = (-32 * Math.PI) / 180, ca1 = Math.cos(ang), sa1 = Math.sin(ang)
  const strokes = new Float32Array(N), grain = new Float32Array(N)
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, u = x * ca1 + y * sa1, v = -x * sa1 + y * ca1
      grain[i] = hash(x, y, seed + 7)
      strokes[i] = 0.6 * vnoise(u / 28, v / 2.8, seed + 1) + 0.25 * vnoise(u / 9, v / 1.7, seed + 2) + 0.15 * grain[i]
    }
  }
  const tex = equalize(strokes)

  const out = new Float32Array(N * 4)
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      // цвет чуть выходит за линии и не доходит до них — как у раскраски от руки
      const cx = x + (vnoise(x / 46, y / 46, seed + 11) - 0.5) * 6, cy = y + (vnoise(x / 46, y / 46, seed + 12) - 0.5) * 6
      const a = sample(ca, cx, cy)
      const j = Math.min(W - 1, Math.max(0, Math.round(cy))) * W + Math.min(W - 1, Math.max(0, Math.round(cx)))
      const press = 0.9 + 0.1 * vnoise(x / 110, y / 110, seed + 13)
      const p = a * (0.56 + 0.44 * tex[i]) * press
      const rgb = [1 - p * (1 - cr[j]), 1 - p * (1 - cg[j]), 1 - p * (1 - cb[j])]

      // графит: основная линия чуть дрожит, рядом — бледный второй проход, нажим неровный
      const l1 = sample(ink, x + (vnoise(x / 60, y / 60, seed + 21) - 0.5) * 5, y + (vnoise(x / 60, y / 60, seed + 22) - 0.5) * 5)
      const l2 = sample(ink, x + (vnoise(x / 40, y / 40, seed + 23) - 0.5) * 9, y + (vnoise(x / 40, y / 40, seed + 24) - 0.5) * 9) * 0.3
      const line = clamp01(Math.max(l1, l2)) * (0.72 + 0.28 * grain[i]) * (0.82 + 0.18 * vnoise(x / 70, y / 70, seed + 25)) * 0.92
      let al = 0
      for (let c = 0; c < 3; c++) {
        rgb[c] = rgb[c] * (1 - line) + GRAPHITE[c] * line
        al = Math.max(al, 1 - rgb[c])
      }
      // белая бумага → прозрачность
      al = al < 0.015 ? 0 : al
      for (let c = 0; c < 3; c++) out[i * 4 + c] = al ? 1 - (1 - rgb[c]) / al : 1
      out[i * 4 + 3] = al
    }
  }
  return out
}

/** Предмет — по центру и одного размера на всех рисунках. Плитка показывает картинку на TILE ширины белого круга
 *  (.tile__art в CategoryTile.vue), поэтому рисунок вписывается в круг, а не в квадрат: самая дальняя от центра точка
 *  ложится на RING радиуса круга. Так высокие предметы (бутылка, кролик) не вылезают за край, а вытянутые (рыба)
 *  не выглядят мельче остальных. SIDE — предел по большему измерению: плоский предмет не упрётся в края картинки. */
const TILE = 0.8, RING = 0.86, SIDE = 0.98
async function save(kind, rgba) {
  const buf = Buffer.alloc(W * W * 4)
  for (let i = 0; i < buf.length; i++) buf[i] = Math.round(clamp01(rgba[i]) * 255)
  const solid = (x, y) => buf[(y * W + x) * 4 + 3] > 10
  let x0 = W, y0 = W, x1 = 0, y1 = 0
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (solid(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, cx = x0 + bw / 2, cy = y0 + bh / 2
  let reach = 0 // самая дальняя точка рисунка от его центра
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (solid(x, y)) reach = Math.max(reach, Math.hypot(x + 0.5 - cx, y + 0.5 - cy))
  const k = Math.min((SIZE * SIDE) / Math.max(bw, bh), ((SIZE / 2 / TILE) * RING) / reach)
  const tw = Math.round(bw * k), th = Math.round(bh * k), left = Math.floor((SIZE - tw) / 2), top = Math.floor((SIZE - th) / 2)
  await sharp(buf, { raw: { width: W, height: W, channels: 4 } })
    .extract({ left: x0, top: y0, width: bw, height: bh })
    .resize(tw, th, { kernel: 'lanczos3' })
    .extend({ left, top, right: SIZE - tw - left, bottom: SIZE - th - top, background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .webp({ quality: 88, alphaQuality: 95, effort: 6 })
    .toFile(OUT + kind + '.webp')
}

// ───────────────────────── кисть ─────────────────────────
// Те же сцены гуашью. Картина складывается из отдельных мазков, как у художника: сначала широкая кисть по всему
// рисунку, потом средняя и тонкая — только там, где широкая не передала цвет или деталь. Мазок — изогнутая лента:
// идёт вдоль формы (по краям и цветовым границам рисунка), начинается с нажима и сходит на нет; в нём видны следы
// щетины, край чуть рваный. Контур — тушью: то толще, то тоньше, местами «сухая кисть» его рвёт.
// Под рисунком — круглый мазок светлой краски (щетина идёт по кругу), вне его прозрачно: баннер тёмный.

const DISC = 0.455 // радиус подложки — доля ширины картинки
const FIT = 0.86 // рисунок не дальше этой доли радиуса подложки от центра
const LINE_K = 0.85 // контур кисти тоньше карандашного: главное — мазки
const INK = [0.24, 0.15, 0.1]
const PAPER = [0.975, 0.94, 0.87]
/** Кисти по очереди: шаг сетки, ширина и длина мазка (px рабочего холста), волоски щетины, с какой ошибки цвета нужна. */
const BRUSHES = [
  { step: 14, w: 26, len: 64, bristles: 8, err: 0 },
  { step: 7, w: 12, len: 32, bristles: 4, err: 0.09 },
  { step: 3, w: 4.5, len: 12, bristles: 0, err: 0.11 },
]
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }

/** Размытие: два прохода «ящиком» радиуса r (почти гаусс). */
function boxBlur(src, r) {
  let a = src
  const at = (v) => (v < 0 ? 0 : v >= W ? W - 1 : v), n = 2 * r + 1
  for (let pass = 0; pass < 2; pass++) {
    const h = new Float32Array(W * W), v = new Float32Array(W * W)
    for (let y = 0; y < W; y++) {
      let s = 0
      for (let x = -r; x <= r; x++) s += a[y * W + at(x)]
      for (let x = 0; x < W; x++) { h[y * W + x] = s / n; s += a[y * W + at(x + r + 1)] - a[y * W + at(x - r)] }
    }
    for (let x = 0; x < W; x++) {
      let s = 0
      for (let y = -r; y <= r; y++) s += h[at(y) * W + x]
      for (let y = 0; y < W; y++) { v[y * W + x] = s / n; s += h[at(y + r + 1) * W + x] - h[at(y - r) * W + x] }
    }
    a = v
  }
  return a
}

/** Как вписать сцену в подложку: по пробному растру — рамка рисунка и самая дальняя от её центра точка. */
async function placement(kind) {
  const px = await raster(kind, 'color')
  let x0 = W, y0 = W, x1 = 0, y1 = 0
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 10) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  const cx = (x0 + x1 + 1) / 2, cy = (y0 + y1 + 1) / 2
  let reach = 0
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (px[(y * W + x) * 4 + 3] > 10) reach = Math.max(reach, Math.hypot(x + 0.5 - cx, y + 0.5 - cy))
  const u = 400 / W // пиксели пробного растра → единицы сцены
  const s = Math.min((400 * DISC * FIT) / (reach * u), (400 * DISC * 2 * 0.86) / (Math.max(x1 - x0, y1 - y0) * u))
  return { tf: `translate(200 200) scale(${s.toFixed(4)}) translate(${(-cx * u).toFixed(2)} ${(-cy * u).toFixed(2)})`, K: LINE_K / s }
}

/** Направление мазков в каждой точке: вдоль краёв и цветовых границ рисунка (тензор структуры),
 *  вдали от них — плавное «общее» направление руки. Угол в радианах. */
function flowField(ca, lumA, seed) {
  const N = W * W, f = new Float32Array(N)
  for (let i = 0; i < N; i++) f[i] = ca[i] * (0.4 + 0.6 * lumA[i])
  const b = boxBlur(f, 3)
  const jxx = new Float32Array(N), jxy = new Float32Array(N), jyy = new Float32Array(N)
  for (let y = 1; y < W - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, gx = (b[i + 1] - b[i - 1]) / 2, gy = (b[i + W] - b[i - W]) / 2
      jxx[i] = gx * gx; jxy[i] = gx * gy; jyy[i] = gy * gy
    }
  }
  const sxx = boxBlur(jxx, 14), sxy = boxBlur(jxy, 14), syy = boxBlur(jyy, 14)
  const ang = new Float32Array(N), EPS = 4e-5
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const hand = (-35 * Math.PI) / 180 + (vnoise(x / 220, y / 220, seed + 41) - 0.5) * 1.2 // направление мазка «от руки»
      const g = hand + Math.PI / 2 // ему соответствует градиент поперёк
      const a = sxx[i] + EPS * Math.cos(g) ** 2, c = syy[i] + EPS * Math.sin(g) ** 2, bxy = sxy[i] + EPS * Math.cos(g) * Math.sin(g)
      ang[i] = 0.5 * Math.atan2(2 * bxy, a - c) + Math.PI / 2
    }
  }
  return ang
}

/** Мазки одной кисти. Каждый — лента вдоль поля направлений; обрывается, где цвет рисунка сменился или рисунок кончился. */
function strokesFor(B, T, ang, rand, need) {
  const { ca, r, g, b } = T
  const at = (x, y) => Math.min(W - 1, Math.max(0, Math.round(y))) * W + Math.min(W - 1, Math.max(0, Math.round(x)))
  const out = []
  for (let gy = 0; gy < W; gy += B.step) {
    for (let gx = 0; gx < W; gx += B.step) {
      const x0 = gx + rand() * B.step, y0 = gy + rand() * B.step, i0 = at(x0, y0)
      if (ca[i0] < 0.5 || !need(gx, gy, B.step)) continue
      const col = [r[i0], g[i0], b[i0]]
      const len = B.len * (0.75 + 0.5 * rand()), step = Math.max(2, B.w / 3.5)
      // центральная линия: от точки в обе стороны вдоль поля
      const pts = [[x0, y0]]
      for (const sign of [1, -1]) {
        let x = x0, y = y0, px = Math.cos(ang[i0]) * sign, py = Math.sin(ang[i0]) * sign
        for (let d = 0; d < len / 2; d += step) {
          const i = at(x, y)
          let dx = Math.cos(ang[i]), dy = Math.sin(ang[i])
          if (dx * px + dy * py < 0) { dx = -dx; dy = -dy }
          dx = 0.65 * dx + 0.35 * px; dy = 0.65 * dy + 0.35 * py
          const n = Math.hypot(dx, dy) || 1
          dx /= n; dy /= n
          x += dx * step; y += dy * step
          const j = at(x, y)
          if (x < 0 || y < 0 || x >= W || y >= W || ca[j] < 0.35 || Math.hypot(r[j] - col[0], g[j] - col[1], b[j] - col[2]) > 0.16) break
          if (sign > 0) pts.push([x, y]); else pts.unshift([x, y])
          px = dx; py = dy
        }
      }
      if (pts.length < 2) { const a = ang[i0], h = B.w * 0.35; pts.splice(0, 1, [x0 - Math.cos(a) * h, y0 - Math.sin(a) * h], [x0 + Math.cos(a) * h, y0 + Math.sin(a) * h]) }
      // краска не идеально ровная: чуть светлее/темнее, теплее/холоднее
      const v = 0.9 + 0.2 * rand(), t = (rand() - 0.5) * 0.06
      out.push(ribbon(pts, B.w * (0.8 + 0.4 * rand()), [col[0] * v + t, col[1] * v, col[2] * v - t], B.bristles, rand))
    }
  }
  // широкие мазки ложатся в случайном порядке, как у художника
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]] }
  return out
}

const rgb = (c) => `rgb(${c.map((v) => Math.round(clamp01(v) * 255)).join(',')})`
/** Лента мазка вдоль pts шириной w: начало с нажимом, конец сходит на нет; поверх — волоски щетины. */
function ribbon(pts, w, col, bristles, rand) {
  const n = pts.length, L = [], Rt = [], norms = [], widths = []
  for (let k = 0; k < n; k++) {
    const [ax, ay] = pts[Math.max(0, k - 1)], [bx, by] = pts[Math.min(n - 1, k + 1)]
    const l = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / l, ny = (bx - ax) / l
    const t = n === 1 ? 0.5 : k / (n - 1)
    const wt = w * (t < 0.15 ? 0.7 + 2 * t : t > 0.65 ? Math.max(0.25, 1 - 2.1 * (t - 0.65)) : 1)
    norms.push([nx, ny]); widths.push(wt)
    L.push(`${(pts[k][0] + nx * wt / 2).toFixed(1)} ${(pts[k][1] + ny * wt / 2).toFixed(1)}`)
    Rt.push(`${(pts[k][0] - nx * wt / 2).toFixed(1)} ${(pts[k][1] - ny * wt / 2).toFixed(1)}`)
  }
  let s = `<path d="M${L.join('L')}L${Rt.reverse().join('L')}Z" fill="${rgb(col)}" fill-opacity="${(0.9 + 0.1 * rand()).toFixed(2)}"/>`
  for (let q = 0; q < bristles; q++) {
    const o = (rand() - 0.5) * 0.85, k0 = Math.floor(rand() * 0.3 * n), k1 = Math.max(k0 + 1, Math.ceil((0.6 + 0.4 * rand()) * (n - 1)))
    const line = pts.slice(k0, k1 + 1).map(([x, y], m) => {
      const k = k0 + m
      return `${(x + norms[k][0] * widths[k] * o).toFixed(1)} ${(y + norms[k][1] * widths[k] * o).toFixed(1)}`
    })
    if (line.length < 2) continue
    const dark = rand() < 0.6, c = dark ? col.map((v) => v * 0.72) : col.map((v) => v + (1 - v) * 0.4)
    s += `<path d="M${line.join('L')}" fill="none" stroke="${rgb(c)}" stroke-width="${(1.2 + rand() * 1.8).toFixed(1)}" stroke-opacity="${(0.35 + 0.35 * rand()).toFixed(2)}" stroke-linecap="round"/>`
  }
  return s
}

/** Мазки → растр. Края мазков чуть рвёт шум (feDisplacementMap): у настоящей кисти край не гладкий. */
async function paint(strokes, seed) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}"><defs>` +
    `<filter id="rough" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".07" numOctaves="2" seed="${seed % 97}"/>` +
    `<feDisplacementMap in="SourceGraphic" scale="4.5" xChannelSelector="R" yChannelSelector="G"/></filter></defs>` +
    `<g filter="url(#rough)">${strokes.join('')}</g></svg>`
  const { data } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return data
}

async function brush(color, lines, seed) {
  const N = W * W
  const ca = new Float32Array(N), r = new Float32Array(N), g = new Float32Array(N), b = new Float32Array(N), lumA = new Float32Array(N), ink = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    ca[i] = color[i * 4 + 3] / 255
    r[i] = color[i * 4] / 255; g[i] = color[i * 4 + 1] / 255; b[i] = color[i * 4 + 2] / 255
    lumA[i] = lum(color[i * 4], color[i * 4 + 1], color[i * 4 + 2]) / 255
    ink[i] = 1 - lum(lines[i * 4], lines[i * 4 + 1], lines[i * 4 + 2]) / 255
  }
  const T = { ca, r, g, b }, ang = flowField(ca, lumA, seed), rand = rng(seed + 99)

  // кисти по очереди: следующая кладёт мазки только в клетки, где цвет пока далёк от рисунка
  const strokes = []
  let done = null
  for (const B of BRUSHES) {
    const need = (gx, gy, step) => {
      if (!done) return true
      let e = 0, n = 0
      for (let y = gy; y < Math.min(W, gy + step); y++) {
        for (let x = gx; x < Math.min(W, gx + step); x++) {
          const i = y * W + x
          if (ca[i] < 0.5) continue
          const a = done[i * 4 + 3] / 255
          e += a < 0.5 ? 1 : Math.hypot(done[i * 4] / 255 - r[i], done[i * 4 + 1] / 255 - g[i], done[i * 4 + 2] / 255 - b[i]); n++
        }
      }
      return n > 0 && e / n > B.err
    }
    strokes.push(...strokesFor(B, T, ang, rand, need))
    done = await paint(strokes, seed)
  }

  const ib = boxBlur(ink, 2)
  const C = W / 2, RD = W * DISC, TURN = 2 * Math.PI * RD
  /** Шум вдоль круга без шва: у θ = ±π значения с двух концов дуги смешиваются. */
  const ring = (arc, f) => { const w = ss(0.85 * TURN, TURN, arc); return f(arc) * (1 - w) + f(arc - TURN) * w }
  const out = new Float32Array(N * 4)
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x

      // ── подложка: один круговой мазок светлой краски
      const dx = x - C, dy = y - C, rr = Math.hypot(dx, dy), th = Math.atan2(dy, dx), arc = (th + Math.PI) * RD
      const edge = RD * (1 + 0.035 * (vnoise(Math.cos(th) * 2.4 + 9, Math.sin(th) * 2.4 + 9, seed + 31) - 0.5))
      const dBr = ring(arc, (a) => vnoise(a / 70, rr / 2.2, seed + 32)), dBand = ring(arc, (a) => vnoise(a / 170, rr / 24, seed + 33))
      const dA = ss(edge + 12, edge - 12, rr + (dBr - 0.5) * 30 + (dBand - 0.5) * 14)
      const dk = (0.95 + 0.07 * dBand + 0.03 * (dBr - 0.5)) * (1 - 0.06 * ss(edge - 46, edge - 6, rr))
      let R0 = PAPER[0] * dk * dA, G0 = PAPER[1] * dk * dA, B0 = PAPER[2] * dk * dA, A = dA

      // ── мазки краски
      const pa = done[i * 4 + 3] / 255
      if (pa > 0) {
        R0 = R0 * (1 - pa) + (done[i * 4] / 255) * pa; G0 = G0 * (1 - pa) + (done[i * 4 + 1] / 255) * pa; B0 = B0 * (1 - pa) + (done[i * 4 + 2] / 255) * pa
        A = A * (1 - pa) + pa
      }

      // ── тушь: толщина гуляет (порог по размытой линии), рука чуть дрожит, местами сухая кисть рвёт линию
      const lx = x + (vnoise(x / 55, y / 55, seed + 21) - 0.5) * 5, ly = y + (vnoise(x / 55, y / 55, seed + 22) - 0.5) * 5
      const thr = 0.5 + (vnoise(x / 26, y / 26, seed + 23) - 0.5) * 0.62
      let li = ss(thr - 0.1, thr + 0.1, sample(ib, lx, ly))
      if (li > 0) {
        li *= 1 - 0.7 * ss(0.66, 0.86, vnoise(x / 60, y / 60, seed + 24)) * ss(0.55, 0.25, vnoise(x / 2.5, y / 9, seed + 25))
        li *= 0.84 + 0.16 * vnoise(x / 20, y / 20, seed + 26)
        R0 = R0 * (1 - li) + INK[0] * li; G0 = G0 * (1 - li) + INK[1] * li; B0 = B0 * (1 - li) + INK[2] * li; A = A * (1 - li) + li
      }
      out[i * 4] = A ? R0 / A : 1; out[i * 4 + 1] = A ? G0 / A : 1; out[i * 4 + 2] = A ? B0 / A : 1; out[i * 4 + 3] = A
    }
  }
  return out
}

async function saveBrush(kind, rgba) {
  const buf = Buffer.alloc(W * W * 4)
  for (let i = 0; i < buf.length; i++) buf[i] = Math.round(clamp01(rgba[i]) * 255)
  await sharp(buf, { raw: { width: W, height: W, channels: 4 } }).resize(SIZE, SIZE, { kernel: 'lanczos3' })
    .webp({ quality: 86, alphaQuality: 90, effort: 6 }).toFile(OUT + kind + '.webp')
}

const only = ARGS.filter((a) => !a.startsWith('--'))
for (const kind of Object.keys(scenes).filter((k) => !only.length || only.includes(k))) {
  const seed = [...kind].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) & 0xffff, 7) // свои штрихи у каждого рисунка, но всегда одни и те же
  const t = Date.now()
  if (BRUSH) {
    const at = await placement(kind)
    await saveBrush(kind, await brush(await raster(kind, 'color', at), await raster(kind, 'line', at), seed))
  } else await save(kind, pencil(await raster(kind, 'color'), await raster(kind, 'line'), seed))
  console.log(`${kind}.webp  ${Date.now() - t} мс`)
}
