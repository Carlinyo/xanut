// Способы оплаты и онлайн-оплата AmeriaBank: подписи и переход на страницу оплаты банка.
import { api } from '../api'
import { t } from '../i18n'
import type { Order } from '../types'

/** Подпись способа оплаты; delivery — как получают заказ (у «картой» старых заказов с доставкой — «картой курьеру»). */
export function paymentLabel(method: string, delivery?: string): string {
  if (method === 'cash') return t('checkout.cash')
  if (method === 'online') return t('checkout.online')
  return delivery === 'pickup' ? t('checkout.cardPickup') : t('checkout.card')
}

/** Страница оплаты — только на сайте банка (адрес присылает наш сервер, но уводить покупателя куда-то ещё нельзя). */
export const isBankUrl = (url: string): boolean => /^https:\/\/(services|servicestest)\.ameriabank\.am\//.test(url)

/** Заказ с онлайн-оплатой ещё можно оплатить (не оплачен и не отменён). */
export const canPay = (o: Pick<Order, 'payment' | 'paid' | 'status' | 'pay'>): boolean =>
  o.payment === 'online' && o.paid !== true && o.pay?.state !== 'paid' && o.status !== 'cancelled'

/** «Оплатить» ещё раз: сервер сначала спросит банк о прошлой попытке. payUrl нет — заказ уже оплачен (order — свежий). */
export const startPayment = (orderId: number) => api<{ order: Order; payUrl?: string }>(`/orders/${orderId}/pay`, { method: 'POST', timeout: 30_000 })

/** Уйти на страницу оплаты банка. false — адрес не банка (не переходим). */
export function goToBank(url: string): boolean {
  if (!isBankUrl(url)) return false
  window.location.assign(url)
  return true
}
