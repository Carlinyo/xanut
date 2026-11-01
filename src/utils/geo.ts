import { api } from '../api'
import type { DeliveryZone, GeoPoint } from '../types'

/** Геолокация с погрешностью (м). Погрешность в сотни метров — у компьютера или по Wi‑Fi: такую точку стоит поправить на карте. */
export interface Located extends GeoPoint { accuracy: number }
export type GeoErrorCode = 'unsupported' | 'denied' | 'failed'
export class GeoError extends Error { constructor(public code: GeoErrorCode) { super(code) } }

/** Где сейчас покупатель (браузер спросит разрешение). Работает только по HTTPS и на localhost. */
export function locate(): Promise<Located> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator) || !window.isSecureContext) return reject(new GeoError('unsupported'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject(new GeoError(e.code === e.PERMISSION_DENIED ? 'denied' : 'failed')),
      // старая позиция — не дольше 10 с: повторное нажатие после неточного ответа должно спросить заново
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 },
    )
  })
}

/** Текст ошибки геолокации для покупателя. */
export const geoErrorKey = (e: unknown): string =>
  e instanceof GeoError ? (e.code === 'unsupported' ? 'errors.geoUnsupported' : e.code === 'denied' ? 'errors.geoDenied' : 'errors.geoFailed') : 'errors.geoFailed'

/** Расстояние по прямой (км) — так же, как считает сервер. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
/** Точка в зоне доставки; зона неизвестна (старый сервер) — решит сервер. */
export const inZone = (zone: DeliveryZone | undefined, p: GeoPoint): boolean => !zone || distanceKm(zone, p) <= zone.radiusKm

/**
 * Адрес точки на карте (сервер спрашивает геокодер). formatted пустой — у места нет адреса, покупатель напишет его сам.
 * Ошибки — ApiError: 503 ADDRESS_UNAVAILABLE (геокодер не ответил), 401 (сессия истекла).
 */
export const reverseAddress = (p: GeoPoint) =>
  api<{ inZone: boolean; formatted: string }>('/address/reverse', { method: 'POST', body: { lat: p.lat, lon: p.lon } })
