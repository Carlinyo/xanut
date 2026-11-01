/** Сохранить файл на устройстве (папка «Загрузки» или окно «Сохранить как» — как настроен браузер). data — base64. */
export function saveBase64(name: string, data: string, type: string) {
  const bin = atob(data), bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const url = URL.createObjectURL(new Blob([bytes], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name, rel: 'noopener' })
  a.style.display = 'none'
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000) // браузеру нужно время, чтобы забрать файл
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
