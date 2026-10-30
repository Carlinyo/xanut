// Фото товара перед загрузкой: уменьшаем в браузере до 800 px по большей стороне — с телефона приходят снимки
// по 3–8 МБ, а на карточке товара нужно 300–400 px. Результат — data URL (webp; где браузер не умеет — jpeg).

const MAX_BYTES = 580_000 // сервер принимает до 600 КБ

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('IMAGE_TYPE')) }
    img.src = url
  })
}

function render(img: HTMLImageElement, max: number, quality: number): string {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const webp = canvas.toDataURL('image/webp', quality)
  if (webp.startsWith('data:image/webp')) return webp
  // старый Safari не умеет webp: jpeg на белом фоне (у jpeg нет прозрачности)
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

const bytes = (dataUrl: string) => Math.floor(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4)

/** Файл картинки → уменьшенный data URL. Ошибка IMAGE_TYPE — это не картинка, IMAGE_BIG — не удалось ужать. */
export async function shrinkImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('IMAGE_TYPE')
  const img = await load(file)
  for (const [max, q] of [[800, 0.85], [640, 0.8], [480, 0.72]] as const) {
    const url = render(img, max, q)
    if (bytes(url) <= MAX_BYTES) return url
  }
  throw new Error('IMAGE_BIG')
}
