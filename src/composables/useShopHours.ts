import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useCatalog } from '../stores/catalog'

/** Армения живёт по UTC+4 без перехода на летнее время (как сервер: SHOP.utcOffsetMinutes). */
const OFFSET_MS = 4 * 3_600_000
const pad = (n: number) => String(n).padStart(2, '0')

/** Часы работы магазина (/api/config → hours, время Армении): заказ можно оформить только с open:00 до close:00.
 *  open пересчитывается раз в 30 секунд — открытая корзина сама «закрывается» в 22:00 и «открывается» в 10:00.
 *  Сервер проверяет то же самое (422 SHOP_CLOSED); старый сервер часов не присылает — тогда считаем, что открыто. */
export function useShopHours() {
  const catalog = useCatalog()
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => { timer = setInterval(() => (now.value = Date.now()), 30_000) })
  onUnmounted(() => clearInterval(timer))
  const hours = computed(() => catalog.config.hours ?? null)
  const open = computed(() => {
    const h = hours.value
    if (!h) return true
    const local = new Date(now.value + OFFSET_MS)
    const minutes = local.getUTCHours() * 60 + local.getUTCMinutes()
    return minutes >= h.open * 60 && minutes < h.close * 60
  })
  /** «10:00» и «22:00» — для текстов. */
  const from = computed(() => (hours.value ? `${pad(hours.value.open)}:00` : ''))
  const to = computed(() => (hours.value ? `${pad(hours.value.close)}:00` : ''))
  return { open, hours, from, to }
}
