import { defineStore } from 'pinia'
import { api } from '../api'
import { useCatalog } from './catalog'
import { useBonus } from './bonus'
import { kebabPrice } from '../utils/kebab'
import { applyPerks } from '../utils/segments'
import type { CartItem, KebabSelection, Order, Perks } from '../types'

export interface Addable { id: number | string; name: string; price: number; art?: string; image?: string; note?: string; kebab?: KebabSelection; orderable?: boolean }
/** delivery — курьер (платно, см. deliveryFee), pickup — самовывоз из магазина (бесплатно, адрес не нужен). */
export type DeliveryMethod = 'delivery' | 'pickup'
export interface CheckoutData { name: string; phone: string; address: string; slot: string; payment: 'cash' | 'card'; delivery: DeliveryMethod; saveProfile?: boolean }

/** Сервер принимает не больше 99 штук одной позиции. */
export const MAX_QTY = 99

type OrderLine = { type: 'product'; productId: number; qty: number } | ({ type: 'kebab' } & KebabSelection)

const STORAGE_KEY = 'cart'
const METHOD_KEY = 'cart-delivery'

function isItem(v: unknown): v is CartItem {
  if (!v || typeof v !== 'object') return false
  const i = v as Partial<CartItem>
  if (!(typeof i.id === 'number' || typeof i.id === 'string') || typeof i.name !== 'string' || typeof i.price !== 'number') return false
  if (!Number.isInteger(i.qty) || (i.qty as number) < 1) return false
  if (i.kind === 'product') return typeof i.productId === 'number'
  // подарки за баллы в корзину больше не кладутся (их обменивают на код) — старые записи отбрасываем
  if (i.kind === 'kebab') return !!i.kebab && typeof i.kebab.meat === 'string' && typeof i.kebab.kg === 'number' && Array.isArray(i.kebab.extras)
  return false
}

// Корзина хранится локально (гость может собирать её до входа), заказ уходит на сервер.
// Повреждённые данные или недоступное хранилище (приватный режим, запрет cookie) не должны ломать сайт.
function stored(): CartItem[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter(isItem).map((i) => ({ ...i, qty: Math.min(i.qty, MAX_QTY), art: i.art || 'basket', note: i.note || '' }))
  } catch {
    return []
  }
}

function storedMethod(): DeliveryMethod {
  try { return localStorage.getItem(METHOD_KEY) === 'pickup' ? 'pickup' : 'delivery' } catch { return 'delivery' }
}

export const useCart = defineStore('cart', {
  state: () => ({ items: stored(), method: storedMethod() }),
  getters: {
    count: (s): number => s.items.reduce((n, i) => n + i.qty, 0),
    // price здесь — только для показа: сервер пересчитывает цены сам (у бонусных товаров price = 0)
    subtotal: (s): number => s.items.reduce((n, i) => n + i.price * i.qty, 0),
    /** Акция группы покупателя (новый, постоянный, VIP): скидка, баллы, бесплатная доставка. */
    perks: (): Perks => useBonus().perks,
    /** Цена с акцией — так же, как посчитает сервер. Порог бесплатной доставки — по сумме до скидки. */
    priced(): ReturnType<typeof applyPerks> {
      const { deliveryFee, freeDeliveryFrom } = useCatalog().config
      const base = this.subtotal === 0 || this.subtotal >= freeDeliveryFrom ? 0 : deliveryFee
      return applyPerks(this.subtotal, base, this.perks)
    },
    /** Скидка по акции группы (֏). */
    discount(): number { return this.priced.discount },
    /** Сколько стоила бы доставка курьером (для подписи варианта). */
    deliveryPrice(): number { return this.priced.deliveryFee },
    /** Доставка в итоге: при самовывозе — 0. */
    delivery(): number { return this.method === 'pickup' ? 0 : this.deliveryPrice },
    total(): number { return this.subtotal - this.discount + this.delivery },
    /** Сколько баллов принесёт заказ (процент группы от товаров после скидки, без доставки) — окончательно считает сервер. */
    pointsEarned(): number { return this.priced.bonusEarned },
  },
  actions: {
    save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items)) } catch { /* хранилище недоступно — корзина живёт до перезагрузки */ }
    },
    setMethod(m: DeliveryMethod) {
      this.method = m
      try { localStorage.setItem(METHOD_KEY, m) } catch { /* выбор живёт до перезагрузки */ }
    },
    add(p: Addable) {
      if (p.orderable === false) return // витринный товар: заказать нельзя (сервер всё равно отклонит)
      const found = this.items.find((i) => i.id === p.id)
      if (found) found.qty = Math.min(MAX_QTY, found.qty + 1)
      else this.items.push({
        id: p.id, kind: p.kebab ? 'kebab' : 'product', productId: typeof p.id === 'number' ? p.id : undefined, kebab: p.kebab,
        name: p.name, price: p.price, art: p.art || 'basket', image: p.image, note: p.note || '', qty: 1,
      })
      this.save()
    },
    change(id: number | string, delta: number) {
      const item = this.items.find((i) => i.id === id)
      if (!item) return
      item.qty = Math.min(MAX_QTY, item.qty + delta)
      if (item.qty <= 0) this.items = this.items.filter((i) => i.id !== id)
      this.save()
    },
    /** Сверяет корзину с каталогом: убирает то, что больше нельзя заказать (товар скрыт или стал витриной, позиция шашлыка
     *  убрана из меню), и обновляет цены и названия — корзина могла пролежать в браузере долго.
     *  true — что-то было убрано. */
    sync(): boolean {
      const { products, kebab } = useCatalog()
      const byId = new Map(products.filter((p) => p.orderable).map((p) => [p.id, p]))
      const before = this.items.length
      this.items = this.items.filter((i) => {
        if (i.kind === 'kebab') {
          const price = i.kebab ? kebabPrice(kebab, i.kebab) : null
          if (price === null) return false
          i.price = price
          return true
        }
        if (i.kind === 'bonus') return false
        const p = i.productId === undefined ? undefined : byId.get(i.productId)
        if (!p) return false
        Object.assign(i, { name: p.name, price: p.price, art: p.art, image: p.image })
        return true
      })
      this.save()
      return this.items.length < before
    },
    /** Очистить корзину после принятого заказа. */
    clear() {
      this.items = []
      this.save()
    },
    /** requestId — ключ идемпотентности: повтор того же запроса вернёт тот же заказ, а не создаст второй.
     *  Корзину не очищает: это делает форма через clear() — уже после того, как сообщила «заказ принят». */
    async checkout(form: CheckoutData, requestId: string): Promise<Order> {
      const items = this.items.flatMap((i): OrderLine[] => {
        if (i.kind === 'kebab' && i.kebab) {
          const k = i.kebab
          return Array.from({ length: i.qty }, () => ({ type: 'kebab', ...k })) // на сервере каждая порция — отдельная позиция
        }
        if (i.productId === undefined) return []
        return [{ type: 'product', productId: i.productId, qty: i.qty }]
      })
      return api<Order>('/orders', { method: 'POST', body: { ...form, items, requestId } })
    },
  },
})
