// Рисунки «цветными карандашами» для плиток раздела «Տեսականի» (категории на главной).
// Каждый рисунок нарисован векторно (сцены ниже) в два слоя — цвет и контур, — а затем «прорисован карандашом»:
// цвет ложится штрихами с зерном бумаги, контур — графитом, чуть дрожащей линией. Фон прозрачный.
// Запуск (нужен sharp): node tools/render-sketches.mjs   → public/img/cat/<вид>.webp
// Только некоторые: node tools/render-sketches.mjs fish rabbit
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const sharp = require('sharp')

const OUT = fileURLToPath(new URL('../public/img/cat/', import.meta.url))
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
function kit(pass) {
  const C = pass === 'color'
  const join = 'stroke-linejoin="round" stroke-linecap="round"'
  return {
    /** фигура с заливкой и контуром толщины lw */
    f: (d, fill, lw = 5, a = '') => C ? `<path d="${d}" fill="${fill}" ${a}/>`
      : `<path d="${d}" fill="#fff" stroke="${lw ? '#000' : 'none'}" stroke-width="${lw}" ${join} ${a}/>`,
    /** только цвет: тень, блик, румянец */
    p: (d, fill, a = '') => (C ? `<path d="${d}" fill="${fill}" ${a}/>` : ''),
    /** цветной штрих */
    s: (d, color, w, a = '') => (C ? `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" ${join} ${a}/>` : ''),
    /** графитовая линия */
    l: (d, w = 3, a = '') => (C ? '' : `<path d="${d}" fill="none" stroke="#000" stroke-width="${w}" ${join} ${a}/>`),
    /** толстая линия с контуром: сосиска, огурец, шампур */
    tube: (d, w, color, lw = 5, a = '') => C ? `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" ${a}/>`
      : `<path d="${d}" fill="none" stroke="#000" stroke-width="${w + 2 * lw}" stroke-linecap="round" ${a}/><path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" ${a}/>`,
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

  // Խոզի միս — свиная отбивная с жировой каймой, розмарин, перец
  ribs(k) {
    return shadow(k, 210, 330, 150) +
      k.f('M92 214C86 150 128 104 196 96C268 88 330 120 344 178C358 238 322 296 254 316C184 336 112 300 92 214Z', 'url(#pFat)', 5.5) +
      k.f('M120 212C116 162 150 128 200 122C256 116 306 140 316 184C326 230 300 272 250 288C196 304 134 276 120 212Z', 'url(#pMeat)', 3.5) +
      k.f(E(156, 162, 17, 14), '#f6eedf', 3.5) + k.p(E(156, 162, 7, 6), '#dcb79c') +
      k.s('M170 196C196 184 226 190 244 208M206 246C230 242 258 252 274 268M156 236C166 252 182 262 202 266', '#fbe6de', 3.5) +
      k.p(E(250, 160, 34, 14), '#fff', 'opacity=".28" transform="rotate(20 250 160)"') +
      sprig(k, 262, 336, 360, 262, 8, 15) + peppers(k, [[104, 316], [122, 330], [90, 300]])
  },

  // Տավարի միս — стейк на T-образной кости, жир по верхнему краю
  steak(k) {
    return shadow(k, 205, 330, 150) +
      k.f('M70 190C64 128 120 84 196 84C262 84 300 104 326 136C352 168 352 236 318 274C284 312 222 330 160 318C100 306 76 252 70 190Z', 'url(#bMeat)', 5.5) +
      k.f('M146 92C206 78 272 90 318 128C334 142 342 158 346 176L330 182C322 156 302 132 272 118C234 102 190 100 152 110Z', '#f7ead6', 0) +
      k.l('M152 110C190 100 234 102 272 118C302 132 322 156 330 182', 3) +
      k.f('M150 120C186 110 236 110 282 126L278 140C252 132 228 129 215 129L208 300L192 300L196 129C182 130 168 132 154 134Z', 'url(#bBone)', 3.5) +
      k.s('M104 176C124 194 146 198 168 194M114 238C134 250 156 262 176 258M230 168C250 184 272 184 294 176M234 228C256 242 282 242 304 234M224 282C244 280 262 270 276 258', '#f4cfc5', 3.5) +
      k.p(E(128, 158, 26, 12), '#fff', 'opacity=".22" transform="rotate(-30 128 158)"') +
      peppers(k, [[332, 300], [350, 286], [318, 316]])
  },

  // Գառան միս — каре ягнёнка: кусок с жировой «шапкой», срез и торчащие косточки
  lamb(k) {
    const bones = [0, 1, 2, 3, 4].map((i) => { const x = 128 + i * 44; return k.tube(`M${x} 200L${x + 36} 86`, 18, '#f4ecdd', 4.5) }).join('')
    return shadow(k, 208, 326, 150) + bones +
      k.f('M66 252C66 208 102 186 160 186L300 180C336 178 352 204 350 236C348 276 318 300 266 302L146 306C98 308 66 290 66 252Z', 'url(#lMeat)', 5.5) +
      k.f('M78 232C84 206 112 194 160 194L300 188C330 187 344 202 347 224C320 214 298 212 270 214L150 220C116 222 94 226 78 232Z', '#f6e7d4', 0) +
      k.l('M78 232C94 226 116 222 150 220L270 214C298 212 320 214 347 224', 3) +
      k.l('M172 224C176 250 176 276 170 302M216 220C220 248 220 274 214 300M260 216C264 244 264 270 258 298M302 214C306 240 306 264 300 290', 2.2) +
      k.s('M130 250C150 262 170 264 190 258M226 246C246 258 270 258 290 250', '#f1c2b8', 3) +
      k.f(E(96, 254, 30, 46), '#f4e4d0', 4.5) + k.f(E(100, 258, 20, 32), '#c14c45', 3) +
      k.p(E(150, 206, 30, 6), '#fff', 'opacity=".4"') +
      sprig(k, 226, 334, 330, 300, 8, 14)
  },

  // Թռչնամիս — две куриные ножки
  chicken(k) {
    const dots = scatter(7, 10, [-50, -86, 50, 30], inEllipse(0, -26, 46, 52), 1.4, 2.4)
    const drum = (t) => k.g(t,
      k.f(R(-11, 50, 22, 76, 9), 'url(#cBone)', 4.5),
      k.f('M-24 128C-24 114 -12 112 0 118C12 112 24 114 24 128C24 142 12 144 0 138C-12 144 -24 142 -24 128Z', 'url(#cBone)', 4.5),
      k.f('M0 -96C46 -96 64 -58 60 -22C56 14 30 38 16 66L-16 66C-30 38 -56 14 -60 -22C-64 -58 -46 -96 0 -96Z', 'url(#cSkin)', 5.5),
      dots.map(([x, y, r]) => k.p(E(x, y, r), '#c47a45', 'opacity=".6"')).join(''),
      k.p(E(-22, -58, 14, 22), '#fff', 'opacity=".35" transform="rotate(20 -22 -58)"'))
    return shadow(k, 200, 330, 145) + drum('translate(146 184) rotate(32)') + drum('translate(258 190) rotate(-30)')
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

async function raster(kind, pass) {
  const k = kit(pass)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 400 400"><defs>${DEFS}</defs>` +
    `${pass === 'line' ? '<rect width="400" height="400" fill="#fff"/>' : ''}${scenes[kind](k)}</svg>`
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

const only = process.argv.slice(2)
for (const kind of Object.keys(scenes).filter((k) => !only.length || only.includes(k))) {
  const seed = [...kind].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) & 0xffff, 7) // свои штрихи у каждого рисунка, но всегда одни и те же
  const t = Date.now()
  await save(kind, pencil(await raster(kind, 'color'), await raster(kind, 'line'), seed))
  console.log(`${kind}.webp  ${Date.now() - t} мс`)
}
