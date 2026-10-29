// Общие кирпичики для процедурных изображений: SVG-материалы с рельефом, светом и бликами.
// Используется в tools/render-backgrounds.mjs. (tools/render-art.mjs содержит свою копию — он старше.)

export const KEY = '<feDistantLight azimuth="225" elevation="46"/>'
export const FILL = '<feDistantLight azimuth="40" elevation="26"/>'
export const linear = (s, i) => ['R', 'G', 'B'].map((c) => `<feFunc${c} type="linear" slope="${s}" intercept="${i}"/>`).join('')

/** Детерминированный генератор случайных чисел: сцена одинакова при каждом рендере. */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Тонкая полоса вокруг уровня `at` для feFuncR type="table": из изолиний шума получаются прожилки и трещины. */
export function band(at, width, n = 41) {
  return Array.from({ length: n }, (_, i) => Math.max(0, 1 - Math.abs(i / (n - 1) - at) / width).toFixed(3)).join(' ')
}

/** Неровный округлый «камень»: замкнутая гладкая кривая через случайные точки вокруг центра. */
export function blob(cx, cy, rx, ry, rand, n = 9, jitter = 0.32) {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.5
    const k = 1 - jitter / 2 + rand() * jitter
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]
  })
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
  const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`
  let d = `M${f(mid(pts[n - 1], pts[0]))}`
  for (let i = 0; i < n; i++) d += ` Q${f(pts[i])} ${f(mid(pts[i], pts[(i + 1) % n]))}`
  return d + 'Z'
}

export const grad = (id, stops, radial = false) => radial
  ? `<radialGradient id="${id}" cx=".38" cy=".32" r=".85">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`
  : `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`

/** Материал-фильтр (как в render-art), но на холст произвольного размера W×H. */
export function material(id, W, H, o = {}) {
  const m = {
    edge: 8, edgeF: 0.014, f: '0.02 0.03', oct: 4, seed: 3, blur: 14, scale: 22, bump: 0.2,
    amb: [0.66, 0.4], spec: [0.7, 24, 0.5], sparkle: null, vary: null, ao: 0.45, aoBlur: 22, light: KEY, ...o,
  }
  const s = m.seed
  const vary = m.vary ? `
  <feTurbulence type="fractalNoise" baseFrequency="${m.vary.f ?? 0.01}" numOctaves="3" seed="${s + 13}" result="vr"/>
  <feColorMatrix in="vr" type="matrix" values="0 0 0 0 ${m.vary.c[0]}  0 0 0 0 ${m.vary.c[1]}  0 0 0 0 ${m.vary.c[2]}  ${m.vary.k} 0 0 0 ${m.vary.t}" result="vary"/>` : ''
  const sparkle = m.sparkle ? `
  <feTurbulence type="fractalNoise" baseFrequency="${m.sparkle.f ?? 0.09}" numOctaves="2" seed="${s + 21}" result="sn"/>
  <feComposite in="b" in2="sn" operator="arithmetic" k2="1" k3="${m.sparkle.bump ?? 0.3}" result="h2"/>
  <feSpecularLighting in="h2" surfaceScale="${m.scale}" specularConstant="${m.sparkle.c ?? 1.2}" specularExponent="${m.sparkle.e ?? 60}" lighting-color="${m.sparkle.color ?? '#fff'}" result="sp">${m.light}</feSpecularLighting>
  <feComposite in="sp" in2="shape" operator="in" result="spIn"/>
  <feColorMatrix in="spIn" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${m.sparkle.a ?? 0.7} 0" result="spark"/>` : ''
  return `<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${m.edgeF}" numOctaves="2" seed="${s + 31}" result="en"/>
  <feDisplacementMap in="SourceGraphic" in2="en" scale="${m.edge}" xChannelSelector="R" yChannelSelector="G" result="shape"/>
  <feTurbulence type="fractalNoise" baseFrequency="${m.f}" numOctaves="${m.oct}" seed="${s}" result="n"/>
  <feGaussianBlur in="shape" stdDeviation="${m.blur}" result="b"/>
  <feComposite in="b" in2="n" operator="arithmetic" k2="1" k3="${m.bump}" result="h"/>
  <feDiffuseLighting in="h" surfaceScale="${m.scale}" diffuseConstant="1.15" lighting-color="${m.keyColor ?? '#fff'}" result="key">${m.light}</feDiffuseLighting>
  <feDiffuseLighting in="h" surfaceScale="${m.scale}" diffuseConstant="1" lighting-color="${m.fillColor ?? '#ffe7c9'}" result="fill">${m.fillLight ?? FILL}</feDiffuseLighting>
  <feComposite in="key" in2="fill" operator="arithmetic" k2="${m.keyK ?? 0.8}" k3="${m.fillK ?? 0.34}" result="l0"/>
  <feComponentTransfer in="l0" result="light">${linear(m.amb[0], m.amb[1])}</feComponentTransfer>${vary}
  <feMerge result="col"><feMergeNode in="shape"/>${m.vary ? '<feMergeNode in="vary"/>' : ''}</feMerge>
  <feComposite in="col" in2="shape" operator="in" result="colIn"/>
  <feComposite in="colIn" in2="light" operator="arithmetic" k1="1" result="lit"/>
  <feGaussianBlur in="shape" stdDeviation="${m.aoBlur}" result="ab"/>
  <feColorMatrix in="ab" type="matrix" values="0 0 0 0 0.09  0 0 0 0 0.03  0 0 0 0 0.02  0 0 0 -${m.ao} ${m.ao}" result="ao0"/>
  <feComposite in="ao0" in2="shape" operator="in" result="aoIn"/>
  <feSpecularLighting in="h" surfaceScale="${m.scale}" specularConstant="${m.spec[0]}" specularExponent="${m.spec[1]}" lighting-color="${m.specColor ?? '#fff'}" result="s">${m.light}</feSpecularLighting>
  <feComposite in="s" in2="shape" operator="in" result="sIn"/>
  <feColorMatrix in="sIn" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${m.spec[2]} 0" result="sS"/>${sparkle}
  <feMerge><feMergeNode in="lit"/><feMergeNode in="aoIn"/><feMergeNode in="sS"/>${m.sparkle ? '<feMergeNode in="spark"/>' : ''}</feMerge>
</filter>`
}

export const blurFilter = (id, W, H, sd) => `<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="${sd}"/></filter>`

/** Тень от предмета: его же силуэт, тёмный и размытый, со сдвигом. */
export const dropShadow = (shape, dx = 10, dy = 18, opacity = 0.38, filterId = 'shSoft') =>
  `<g transform="translate(${dx} ${dy})" opacity="${opacity}" filter="url(#${filterId})">${shape
    .replace(/fill="url\(#[^)]+\)"/g, 'fill="#1a0d06"').replace(/fill="#[0-9a-fA-F]{3,6}"/g, 'fill="#1a0d06"')
    .replace(/stroke="url\(#[^)]+\)"/g, 'stroke="#1a0d06"').replace(/filter="url\(#[^)]+\)"/g, '')}</g>`
