import { computed, reactive, ref, watch } from 'vue'
import { t } from '../i18n'
import { ApiError } from '../api'
import { useCatalog } from '../stores/catalog'
import { GeoError, geoErrorKey, inZone, locate, reverseAddress } from '../utils/geo'
import type { GeoPoint } from '../types'

/** Геолокация точнее — сразу подставляем адрес; грубее (компьютер, Wi‑Fi) — открываем карту, чтобы поправить. */
const ACCURATE_M = 100

/**
 * Точка адреса на карте — «Моё местоположение» и «Отметить на карте» у поля адреса (оформление заказа, профиль).
 * По точке курьер найдёт место, а текст адреса — описание к ней. Дописали к тексту подъезд или квартиру — точка остаётся;
 * переписали адрес — точка снимается (она про другое место).
 * onError — ошибки сервера при поиске адреса точки, кроме недоступного геокодера (например, истекла сессия);
 * onPoint — точку поставили (убрать прежнюю ошибку поля).
 */
export function useGeoPoint(
  form: { address: string; point: GeoPoint | null },
  opts: { onError: (e: unknown) => unknown; onPoint?: () => void },
) {
  const catalog = useCatalog()
  const zone = computed(() => catalog.config.zone)
  const outOfZone = () => t('map.outOfZone', { km: zone.value?.radiusKm ?? '' })

  // ошибка геолокации или подсказка «допишите адрес»; error — ошибка (красным), а не подсказка
  const msg = ref('')
  const msgError = ref(false)
  function show(text: string, error = true) { msg.value = text; msgError.value = error }

  let pointText = ''
  function setPoint(p: GeoPoint | null, text = '') { form.point = p; pointText = text }
  watch(() => form.address, (v) => {
    msg.value = '' // подсказка относится к прежнему тексту
    if (form.point && !v.includes(pointText)) setPoint(null)
  })

  const map = reactive({ open: false, start: null as GeoPoint | null, accuracy: undefined as number | undefined, note: '' })
  function openMap(start: GeoPoint | null = form.point, accuracy?: number, note = '') {
    Object.assign(map, { open: true, start, accuracy, note })
  }
  /** Точка выбрана: адрес места — в поле (если геокодер его знает), иначе просим написать адрес самому. */
  function usePoint(p: GeoPoint, text: string) {
    if (text) form.address = text
    setPoint({ lat: p.lat, lon: p.lon }, text)
    show(text ? '' : t('checkout.pointNoAddress'), false)
    opts.onPoint?.()
  }
  function onMapPick(p: GeoPoint, text: string) {
    map.open = false
    usePoint(p, text)
  }

  const locating = ref(false)
  async function useMyLocation() {
    if (locating.value) return
    msg.value = ''
    locating.value = true
    try {
      const here = await locate()
      if (here.accuracy > ACCURATE_M) { openMap(here, here.accuracy, t('map.refine')); return }
      if (!inZone(zone.value, here)) { show(outOfZone()); return }
      let text = ''
      try {
        const r = await reverseAddress(here)
        if (!r.inZone) { show(outOfZone()); return }
        text = r.formatted
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) throw e
        // адрес места не узнали (геокодер или сеть) — точку всё равно ставим, адрес напишут сами
      }
      usePoint(here, text)
    } catch (e) {
      if (e instanceof GeoError) show(t(geoErrorKey(e)))
      else await opts.onError(e)
    } finally {
      locating.value = false
    }
  }

  return { zone, msg, msgError, show, setPoint, map, openMap, onMapPick, locating, useMyLocation }
}
