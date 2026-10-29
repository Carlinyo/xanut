// Фоновые изображения сайта: сцена мангала для главного баннера, угли для подвала и промо-блоков,
// бумажная фактура страницы и декоративные специи по краям секций.
// Запуск (нужны playwright и sharp): node tools/render-backgrounds.mjs [hero coals paper decor]  → public/img/bg/*.webp
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { band, blob, blurFilter, dropShadow, grad, linear, material, rng } from './art-kit.mjs'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const sharp = require('sharp')

const OUT = new URL('../public/img/bg/', import.meta.url).pathname
const PREVIEW = process.env.ART_PREVIEW_DIR
mkdirSync(OUT, { recursive: true })

const UNDER = '<feDistantLight azimuth="90" elevation="18"/>' // тёплая подсветка снизу — от углей

// ---------- угли ----------
/** Ряды углей от дальнего к ближнему: дальние мельче (перспектива). leftAt(y) — левая граница ряда.
 *  heat(x, y) — вероятность, что кусок раскалён; остальные бывают «тёплыми» (тёмно-красными) или холодными. */
function coalBed({ W, y0, y1, leftAt, seed, heat }) {
  const rand = rng(seed)
  const lumps = []
  for (let y = y0; y <= y1; y += 26) {
    const s = 0.6 + ((y - y0) / Math.max(1, y1 - y0)) * 0.75
    let x = leftAt(y) - 30 + rand() * 40
    while (x < W + 80) {
      const rx = (40 + rand() * 36) * s, ry = rx * (0.56 + rand() * 0.2)
      const r = rand(), h = heat(x, y)
      const kind = r < h ? 'hot' : r < h + 0.3 ? 'warm' : 'cold'
      lumps.push({ d: blob(x, y + (rand() - 0.5) * 16 * s, rx, ry, rand, 9, 0.4), kind })
      x += rx * (1.3 + rand() * 0.55)
    }
  }
  return lumps
}

const coalFilters = (W, H) => `
<filter id="fCoal" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="2" seed="41" result="en"/>
  <feDisplacementMap in="SourceGraphic" in2="en" scale="7" xChannelSelector="R" yChannelSelector="G" result="shape"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="4" seed="7" result="n"/>
  <feGaussianBlur in="shape" stdDeviation="6" result="b"/>
  <feComposite in="b" in2="n" operator="arithmetic" k2="1" k3="0.6" result="h"/>
  <feDiffuseLighting in="h" surfaceScale="14" diffuseConstant="1.15" lighting-color="#f3e6da" result="key"><feDistantLight azimuth="225" elevation="40"/></feDiffuseLighting>
  <feDiffuseLighting in="h" surfaceScale="14" diffuseConstant="1.4" lighting-color="#ff5a12" result="under">${UNDER}</feDiffuseLighting>
  <feComposite in="key" in2="under" operator="arithmetic" k2="0.5" k3="0.9" result="l0"/>
  <feComponentTransfer in="l0" result="light">${linear(1, 0.1)}</feComponentTransfer>
  <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="19" result="ashN"/>
  <feColorMatrix in="ashN" type="matrix" values="0 0 0 0 0.58  0 0 0 0 0.56  0 0 0 0 0.53  2.6 0 0 0 -1.5" result="ash"/>
  <feMerge result="col"><feMergeNode in="shape"/><feMergeNode in="ash"/></feMerge>
  <feComposite in="col" in2="shape" operator="in" result="colIn"/>
  <feComposite in="colIn" in2="light" operator="arithmetic" k1="1" result="lit"/>
  <feSpecularLighting in="h" surfaceScale="14" specularConstant="0.5" specularExponent="16" lighting-color="#ffc08a" result="s"><feDistantLight azimuth="225" elevation="40"/></feSpecularLighting>
  <feComposite in="s" in2="shape" operator="in" result="sIn"/>
  <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="2" seed="23" result="t"/>
  <feComponentTransfer in="t" result="tb"><feFuncR type="table" tableValues="${band(0.02, 0.045)}"/></feComponentTransfer>
  <feColorMatrix in="tb" type="matrix" values="0 0 0 0 1  0 0 0 0 0.52  0 0 0 0 0.12  0.85 0 0 0 0" result="crack"/>
  <feComposite in="crack" in2="shape" operator="in" result="crackIn"/>
  <feGaussianBlur in="crackIn" stdDeviation="2.4" result="crackGlow"/>
  <feMerge><feMergeNode in="lit"/><feMergeNode in="sIn"/><feMergeNode in="crackGlow"/><feMergeNode in="crackIn"/></feMerge>
</filter>
<filter id="fBed" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="3" seed="51" result="n"/>
  <feColorMatrix in="n" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="g"/>
  <feComponentTransfer in="g" result="gl">${linear(1.9, -0.35)}</feComponentTransfer>
  <feComposite in="SourceGraphic" in2="gl" operator="arithmetic" k1="1" result="m"/>
  <feComposite in="m" in2="SourceGraphic" operator="in"/>
</filter>`

const COAL_FILL = { cold: 'url(#gCoalCold)', warm: 'url(#gCoalWarm)', hot: 'url(#gCoalHot)' }
/** Раскалённое «дно» (видно в щелях) → куски угля в порядке «от дальних к ближним» → ореол вокруг раскалённых. */
function coalLayers(lumps, bedPath, opts = {}) {
  return `<path d="${bedPath}" fill="url(#gBedGlow)" filter="url(#fBed)"/>
<g filter="url(#fCoal)">${lumps.map((l) => `<path d="${l.d}" fill="${COAL_FILL[l.kind]}"/>`).join('')}</g>
<g filter="url(#bloom)" opacity="${opts.bloom ?? 0.5}" style="mix-blend-mode:screen">${lumps.filter((l) => l.kind === 'hot').map((l) => `<path d="${l.d}" fill="#ff5a12"/>`).join('')}</g>`
}

const smoke = (W, H, maskId, opacity, seed = 17) => `
<filter id="fSmoke" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
  <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.0055" numOctaves="5" seed="${seed}" result="n"/>
  <feDisplacementMap in="n" in2="n" scale="120" xChannelSelector="G" yChannelSelector="B" result="sw"/>
  <feColorMatrix in="sw" type="matrix" values="0 0 0 0 0.9  0 0 0 0 0.88  0 0 0 0 0.86  2.8 0 0 0 -1.42" result="s"/>
  <feGaussianBlur in="s" stdDeviation="5"/>
</filter>
<rect width="${W}" height="${H}" filter="url(#fSmoke)" mask="url(#${maskId})" opacity="${opacity}"/>`

const bokeh = (rand, n, box) => Array.from({ length: n }, () => {
  const x = box[0] + rand() * (box[2] - box[0]), y = box[1] + rand() * (box[3] - box[1]), r = 1.5 + rand() * 4.5
  return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="url(#gSpark)" opacity="${(0.35 + rand() * 0.6).toFixed(2)}"/>`
}).join('')

const commonDefs = (W, H) => [
  grad('gCoalCold', [[0, '#3a3532'], [1, '#100e0d']], true),
  grad('gCoalWarm', [[0, '#6e2d14'], [0.6, '#3a160a'], [1, '#140806']], true),
  grad('gCoalHot', [[0, '#ffb25a'], [0.4, '#f0601a'], [1, '#7a1c08']], true),
  grad('gBedGlow', [[0, '#ff9a3a'], [0.5, '#e2541c'], [1, '#8a2208']]),
  `<radialGradient id="gSpark"><stop offset="0" stop-color="#fff4c4"/><stop offset=".35" stop-color="#ffb02e"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/></radialGradient>`,
  `<radialGradient id="gVignette" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>`,
  `<filter id="bloom" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="22"/></filter>`,
  coalFilters(W, H),
].join('')

// ---------- 1. сцена мангала для главного баннера ----------
function hero() {
  const W = 1920, H = 1000
  const rand = rng(2026)
  const wallX = (y) => 900 - (y - 690) * 0.387 // левая стенка мангала (в перспективе); левее — место под текст
  const lumps = coalBed({ W, y0: 712, y1: 1040, leftAt: (y) => wallX(y) + 34, seed: 7, heat: (x) => 0.1 + 0.14 * Math.exp(-(((x - 1450) / 380) ** 2)) })
  const bedPath = `M${wallX(698)} 698 H${W + 10} V${H + 10} H${wallX(H + 10)} Z`

  const pieceMats = [
    material('mChar', W, H, { seed: 11, edge: 6, f: '0.04 0.04', blur: 12, scale: 20, bump: 0.35, spec: [0.9, 24, 0.5], vary: { f: 0.05, c: [0.1, 0.04, 0.02], k: 1.6, t: -0.85 }, sparkle: { c: 1.2, e: 55, a: 0.6 }, fillLight: UNDER, fillColor: '#ff7a2a', fillK: 0.6, amb: [0.7, 0.3] }),
    material('mTomato', W, H, { seed: 12, edge: 3, f: '0.03 0.03', oct: 2, blur: 12, scale: 20, bump: 0.06, spec: [1.4, 44, 0.8], ao: 0.3, fillLight: UNDER, fillColor: '#ff8a3a', fillK: 0.5 }),
    material('mOnion', W, H, { seed: 22, edge: 2, f: '0.02 0.06', oct: 2, blur: 7, scale: 12, bump: 0.08, spec: [1, 30, 0.6], ao: 0.25, aoBlur: 8, fillLight: UNDER, fillColor: '#ff9a4a', fillK: 0.5 }),
    material('mSteel', W, H, { seed: 13, edge: 0, f: '0.02 0.02', oct: 1, blur: 5, scale: 10, bump: 0.02, spec: [1.5, 60, 0.9], ao: 0.15, aoBlur: 4, fillLight: UNDER, fillColor: '#ff7a2a', fillK: 0.6 }),
    material('mIron', W, H, { seed: 14, edge: 1, f: '0.06 0.06', oct: 3, blur: 8, scale: 12, bump: 0.25, spec: [0.8, 20, 0.5], ao: 0.3, aoBlur: 10, fillLight: '<feDistantLight azimuth="0" elevation="16"/>', fillColor: '#ff6a1a', fillK: 0.9, amb: [0.62, 0.22] }),
  ].join('')

  // шампуры лежат на стенках мангала над углями; ближние крупнее
  const skewer = (y, s) => {
    const x0 = wallX(y) - 150 * s
    let x = wallX(y) + 70 * s, out = '', marks = ''
    const seq = ['meat', 'onion', 'meat', 'tomato', 'meat', 'pepper']
    const groups = { meat: [], tomato: [], pepper: [], onion: [] }
    for (let k = 0; x < W + 80; k++) {
      const kind = seq[k % seq.length]
      if (kind === 'meat') {
        const w = (108 + rand() * 26) * s, h = (96 + rand() * 18) * s
        groups.meat.push(`<path d="${blob(x + w / 2, y, w / 2, h / 2, rand, 10, 0.24)}" fill="url(#gChar)"/>`)
        for (const k of [-0.22, 0.1, 0.38]) marks += `<rect x="${(x + w * (0.5 + k) - 6 * s).toFixed(1)}" y="${(y - h * 0.36).toFixed(1)}" width="${(11 * s).toFixed(1)}" height="${(h * 0.72).toFixed(1)}" rx="${(5 * s).toFixed(1)}" fill="#250c03" opacity=".72" transform="rotate(14 ${(x + w * (0.5 + k)).toFixed(1)} ${y})"/>`
        x += w + 6 * s
      } else if (kind === 'onion') {
        groups.onion.push(`<rect x="${x.toFixed(1)}" y="${(y - 44 * s).toFixed(1)}" width="${(30 * s).toFixed(1)}" height="${(88 * s).toFixed(1)}" rx="${(15 * s).toFixed(1)}" fill="url(#gOnion)"/>`)
        x += 36 * s
      } else {
        const w = 58 * s, h = 70 * s
        groups[kind].push(`<path d="${blob(x + w / 2, y, w / 2, h / 2, rand, 8, 0.12)}" fill="url(#${kind === 'tomato' ? 'gTomato' : 'gPepper'})"/>`)
        x += w + 6 * s
      }
    }
    const rod = `<rect x="${x0.toFixed(1)}" y="${(y - 3.5 * s).toFixed(1)}" width="${(W + 200 - x0).toFixed(1)}" height="${(7 * s).toFixed(1)}" rx="${(3.5 * s).toFixed(1)}" fill="url(#gSteel)"/>
      <circle cx="${(x0 - 16 * s).toFixed(1)}" cy="${y}" r="${(17 * s).toFixed(1)}" fill="none" stroke="url(#gSteelR)" stroke-width="${(6 * s).toFixed(1)}"/>`
    const meatShape = groups.meat.join('')
    return `${dropShadow(meatShape, 0, 26 * s, 0.55, 'shSoft')}
<g filter="url(#mSteel)">${rod}</g>
<g filter="url(#mChar)">${meatShape}${marks}</g>
<g filter="url(#mOnion)">${groups.onion.join('')}</g>
<g filter="url(#mTomato)">${groups.tomato.join('')}${groups.pepper.join('')}</g>`
  }

  const defs = [
    commonDefs(W, H), pieceMats,
    grad('gChar', [[0, '#c98a44'], [0.5, '#8e4a1c'], [1, '#4a1f08']], true),
    grad('gTomato', [[0, '#f0604e'], [1, '#a81f16']], true),
    grad('gPepper', [[0, '#6fb84e'], [1, '#2f6a1f']], true),
    grad('gOnion', [[0, '#fbf2ff'], [1, '#dcc0df']]),
    grad('gSteel', [[0, '#f7f9fa'], [0.5, '#a9b4ba'], [1, '#5f6c73']]),
    `<linearGradient id="gSteelR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7f9fa"/><stop offset="1" stop-color="#6f7c83"/></linearGradient>`,
    grad('gIron', [[0, '#5b6266'], [0.5, '#2c3134'], [1, '#141719']]),
    `<radialGradient id="gHeat" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff7a1a" stop-opacity=".6"/><stop offset=".5" stop-color="#c2410c" stop-opacity=".22"/><stop offset="1" stop-color="#c2410c" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="gSkyGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff8a2a" stop-opacity=".55"/><stop offset=".45" stop-color="#d9541a" stop-opacity=".22"/><stop offset="1" stop-color="#d9541a" stop-opacity="0"/></radialGradient>`,
    `<linearGradient id="gGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0f0e" stop-opacity="0"/><stop offset=".35" stop-color="#0b0f0e" stop-opacity=".85"/><stop offset="1" stop-color="#070a09"/></linearGradient>`,
    `<radialGradient id="gSmokeMask" cx=".74" cy=".45" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
    `<mask id="smokeMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#gSmokeMask)"/></mask>`,
    `<filter id="fStone" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0035 0.006" numOctaves="6" seed="11" result="n"/>
      <feDiffuseLighting in="n" surfaceScale="4" diffuseConstant="1.1" lighting-color="#fff" result="d"><feDistantLight azimuth="235" elevation="58"/></feDiffuseLighting>
      <feComponentTransfer in="d" result="d2">${linear(0.6, 0.32)}</feComponentTransfer>
      <feTurbulence type="fractalNoise" baseFrequency="0.0015" numOctaves="3" seed="5" result="v"/>
      <feColorMatrix in="v" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.12  0 0 0 0 0.08  1.2 0 0 0 -0.55" result="warm"/>
      <feMerge result="c"><feMergeNode in="SourceGraphic"/><feMergeNode in="warm"/></feMerge>
      <feComposite in="c" in2="d2" operator="arithmetic" k1="1"/>
    </filter>`,
    blurFilter('shSoft', W, H, 16),
  ].join('')

  const wall = `<path d="M${wallX(686) - 26} 686 L${wallX(686) + 22} 686 L${wallX(1010) + 22} 1010 L${wallX(1010) - 46} 1010 Z" fill="url(#gIron)"/>`
  const backRim = `<rect x="${wallX(686) - 26}" y="672" width="${W + 40}" height="26" rx="10" fill="url(#gIron)"/>`

  return { W, H, defs, body: `
<rect width="${W}" height="${H}" fill="#1a2420" filter="url(#fStone)"/>
<ellipse cx="1450" cy="700" rx="1050" ry="380" fill="url(#gSkyGlow)" style="mix-blend-mode:screen"/>
<rect x="0" y="600" width="${W}" height="${H - 600}" fill="url(#gGround)"/>
<g filter="url(#mIron)">${backRim}</g>
${coalLayers(lumps, bedPath)}
<ellipse cx="1450" cy="900" rx="760" ry="300" fill="url(#gHeat)" style="mix-blend-mode:screen"/>
<g filter="url(#mIron)">${wall}</g>
${skewer(748, 0.6)}${skewer(842, 0.8)}${skewer(950, 1.02)}
${smoke(W, H, 'smokeMask', 0.3)}
${bokeh(rand, 46, [900, 120, 1900, 690])}
<rect width="${W}" height="${H}" fill="url(#gVignette)"/>` }
}

// ---------- 2. угли для подвала и промо-блоков ----------
function coals() {
  const W = 1600, H = 520
  const rand = rng(77)
  const lumps = coalBed({ W, y0: 30, y1: 560, leftAt: () => -70, seed: 19, heat: (x) => 0.08 + 0.12 * Math.exp(-(((x - 900) / 500) ** 2)) })
  const bedPath = `M-10 -10 H${W + 10} V${H + 10} H-10 Z`
  const defs = [commonDefs(W, H),
    `<radialGradient id="gSmokeMask" cx=".5" cy=".2" r=".7"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
    `<mask id="smokeMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#gSmokeMask)"/></mask>`,
  ].join('')
  return { W, H, defs, body: `
<rect width="${W}" height="${H}" fill="#0d0a08"/>
${coalLayers(lumps, bedPath, { bloom: 0.45 })}
${smoke(W, H, 'smokeMask', 0.18, 29)}
${bokeh(rand, 26, [0, 0, W, H * 0.6])}
<rect width="${W}" height="${H}" fill="url(#gVignette)"/>` }
}

// ---------- 3. бумажная фактура (бесшовная плитка) ----------
function paper() {
  const W = 512, H = 512
  const defs = `<filter id="fPaper" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" seed="3" result="fine"/>
    <feColorMatrix in="fine" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.36  0 0 0 0 0.27  0.11 0 0 0 0" result="grain"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="4" stitchTiles="stitch" seed="8" result="cl"/>
    <feColorMatrix in="cl" type="matrix" values="0 0 0 0 0.86  0 0 0 0 0.78  0 0 0 0 0.64  0.22 0 0 0 -0.06" result="cloud"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.004 0.09" numOctaves="2" stitchTiles="stitch" seed="12" result="fib"/>
    <feColorMatrix in="fib" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.16 0 0 0 -0.05" result="fibers"/>
    <feFlood flood-color="#faf6ee" result="base"/>
    <feMerge><feMergeNode in="base"/><feMergeNode in="cloud"/><feMergeNode in="fibers"/><feMergeNode in="grain"/></feMerge>
  </filter>`
  return { W, H, defs, body: `<rect width="${W}" height="${H}" filter="url(#fPaper)"/>`, opaque: true }
}

// ---------- 4. декор: травы и специи для углов секций ----------
function decor() {
  const W = 900, H = 900
  const rand = rng(404)
  const mats = [
    material('mHerb', W, H, { seed: 24, edge: 3, f: '0.05 0.05', oct: 2, blur: 4, scale: 8, bump: 0.2, spec: [0.6, 20, 0.4], ao: 0.25, aoBlur: 4 }),
    material('mLeaf', W, H, { seed: 25, edge: 3, f: '0.02 0.08', oct: 3, blur: 6, scale: 10, bump: 0.18, spec: [0.9, 28, 0.55], ao: 0.25, aoBlur: 8 }),
    material('mChili', W, H, { seed: 26, edge: 2, f: '0.03 0.03', oct: 2, blur: 12, scale: 20, bump: 0.05, spec: [1.5, 50, 0.85], ao: 0.3 }),
    material('mGarlic', W, H, { seed: 27, edge: 3, f: '0.03 0.09', oct: 3, blur: 14, scale: 18, bump: 0.15, spec: [0.6, 18, 0.45], ao: 0.35 }),
    material('mPeppercorn', W, H, { seed: 28, edge: 2, f: '0.2 0.2', oct: 2, blur: 3, scale: 6, bump: 0.6, spec: [0.7, 20, 0.45], ao: 0.2, aoBlur: 3 }),
  ].join('')
  const defs = [mats, blurFilter('shSoft', W, H, 9),
    grad('gHerb', [[0, '#5d9a3a'], [1, '#2b5a1a']]), grad('gBay', [[0, '#8fa84e'], [1, '#4d6a26']]),
    grad('gChili', [[0, '#ef4a36'], [1, '#9a1610']]), grad('gGarlic', [[0, '#fffaf2'], [0.7, '#efe2d6'], [1, '#c9a9b8']], true),
    grad('gPeppercorn', [[0, '#6a5442'], [1, '#1f1610']], true),
  ].join('')

  const rosemary = (x, y, rot, s) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <path d="M0 0 L190 0" stroke="#4f6b2c" stroke-width="7" stroke-linecap="round" fill="none"/>
    ${Array.from({ length: 14 }, (_, i) => { const lx = 8 + i * 13, ly = i % 2 ? -15 : 15; return `<ellipse cx="${lx}" cy="${ly}" rx="22" ry="6.5" transform="rotate(${i % 2 ? -36 : 36} ${lx} ${ly})" fill="url(#gHerb)"/>` }).join('')}</g>`
  const bay = (x, y, rot, s) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0 C40 -30 120 -32 172 0 C120 32 40 30 0 0 Z" fill="url(#gBay)"/><path d="M4 0 L166 0" stroke="#c9d39a" stroke-width="2.4" opacity=".75" fill="none"/>${[30, 60, 90, 120].map((v) => `<path d="M${v} 0 L${v + 22} -14 M${v} 0 L${v + 22} 14" stroke="#b7c487" stroke-width="1.4" opacity=".55" fill="none"/>`).join('')}</g>`
  const chili = (x, y, rot, s) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0 C30 -22 120 -26 200 -6 C240 4 262 26 270 46 C240 28 200 20 150 20 C90 20 30 22 0 14 Z" fill="url(#gChili)"/><path d="M-6 -6 C-22 -8 -30 4 -26 16 C-14 18 -2 14 4 10 Z M-24 6 C-40 0 -52 -14 -56 -30" fill="#3f7a26" stroke="#3f7a26" stroke-width="5" stroke-linecap="round"/></g>`
  const garlic = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -70 C30 -60 74 -22 74 20 C74 60 38 82 0 82 C-38 82 -74 60 -74 20 C-74 -22 -30 -60 0 -70 Z" fill="url(#gGarlic)"/>${[-40, -16, 12, 38].map((v) => `<path d="M${v * 0.3} -52 C${v} -20 ${v * 1.1} 30 ${v * 0.7} 76" stroke="#c4a3b6" stroke-width="2.2" opacity=".55" fill="none"/>`).join('')}<path d="M0 -70 C2 -88 -4 -100 -10 -112" stroke="#d8c6a8" stroke-width="7" stroke-linecap="round" fill="none"/></g>`
  const corns = Array.from({ length: 16 }, () => `<circle cx="${(60 + rand() * 520).toFixed(0)}" cy="${(60 + rand() * 520).toFixed(0)}" r="${(8 + rand() * 4).toFixed(1)}" fill="url(#gPeppercorn)"/>`).join('')
  const salt = Array.from({ length: 22 }, () => { const x = 80 + rand() * 520, y = 80 + rand() * 520, r = 4 + rand() * 5; return `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${r.toFixed(1)}" height="${r.toFixed(1)}" rx="1.2" fill="#ffffff" opacity=".92" transform="rotate(${(rand() * 45).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>` }).join('')

  const herbs = `${rosemary(30, 210, -16, 3.1)}${rosemary(120, 470, -48, 2.2)}`
  const leaves = `${bay(300, 300, 12, 1.25)}${bay(200, 120, -30, 1.05)}${bay(40, 380, 28, 1.1)}`
  const pepper = chili(330, 470, 30, 1.25)
  const garl = garlic(160, 640, 1.35)
  const all = herbs + leaves + pepper + garl + corns
  return { W, H, defs, transparent: true, body: `
${dropShadow(all, 10, 16, 0.32, 'shSoft')}
<g filter="url(#mGarlic)">${garl}</g>
<g filter="url(#mLeaf)">${leaves}</g>
<g filter="url(#mHerb)">${herbs}</g>
<g filter="url(#mChili)">${pepper}</g>
<g filter="url(#mPeppercorn)">${corns}</g>
${salt}` }
}

const scenes = { hero, coals, paper, decor }
const only = process.argv.slice(2)
const browser = await chromium.launch()
for (const [name, make] of Object.entries(scenes)) {
  if (only.length && !only.includes(name)) continue
  const t0 = Date.now()
  const { W, H, defs, body, transparent, opaque } = make()
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: name === 'decor' ? 2 : 1 })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs>${body}</svg>`
  await page.setContent(`<body style="margin:0;background:transparent">${svg}</body>`)
  const png = await page.screenshot({ omitBackground: !!transparent, clip: { x: 0, y: 0, width: W, height: H } })
  await page.close()
  let img = sharp(png)
  if (name === 'decor') img = img.resize(W, H, { kernel: 'lanczos3' })
  await img.clone().webp(opaque ? { quality: 82 } : transparent ? { quality: 84, alphaQuality: 90 } : { quality: 80 }).toFile(`${OUT}${name}.webp`)
  if (PREVIEW) await img.clone().png().toFile(`${PREVIEW}/bg-${name}.png`)
  console.log('ok', name, `${((Date.now() - t0) / 1000).toFixed(1)}s`)
}
await browser.close()
