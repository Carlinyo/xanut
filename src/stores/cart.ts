import { defineStore } from 'pinia'
import { api } from '../api'
import { useCatalog } from './catalog'
import { kebabPrice } from '../utils/kebab'
import type { CartItem, KebabSelection, Order } from '../types'

export interface Addable { id: number | string; name: string; price: number; art?: string; image?: string; note?: string; kebab?: KebabSelection; orderable?: boolean }
export interface CheckoutData { name: string; phone: string; address: string; slot: string; payment: 'cash' | 'card' }

/** Сервер принимает не больше 99 штук одной позиции. */
export const MAX_QTY = 99

type OrderLine = { type: 'product'; productId: number; qty: number } | ({ type: 'kebab' } & KebabSelection)

const STORAGE_KEY = 'cart'

function isItem(v: unknown): v is CartItem {
  if (!v || typeof v !== 'object') return false
  const i = v as Partial<CartItem>
  if (!(typeof i.id === 'number' || typeof i.id === 'string') || typeof i.name !== 'string' || typeof i.price !== 'number') return false
  if (!Number.isInteger(i.qty) || (i.qty as number) < 1) return false
  if (i.kind === 'product') return typeof i.productId === 'number'
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

export const useCart = defineStore('cart', {
  state: () => ({ items: stored() }),
  getters: {
    count: (s): number => s.items.reduce((n, i) => n + i.qty, 0),
    // price здесь — только для показа: сервер пересчитывает цены сам
    subtotal: (s): number => s.items.reduce((n, i) => n + i.price * i.qty, 0),
    delivery(): number {
      const { deliveryFee, freeDeliveryFrom } = useCatalog().config
      return this.subtotal === 0 || this.subtotal >= freeDeliveryFrom ? 0 : deliveryFee
    },
    total(): number { return this.subtotal + this.delivery },
  },
  actions: {
    save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items)) } catch { /* хранилище недоступно — корзина живёт до перезагрузки */ }
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
    /** Сверяет корзину с каталогом: убирает то, что больше нельзя заказать (товар скрыт, позиция шашлыка убрана из меню),
     *  и обновляет цены и названия — корзина могла пролежать в браузере долго. true — что-то было убрано. */
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
        const p = i.productId === undefined ? undefined : byId.get(i.productId)
        if (!p) return false
        Object.assign(i, { name: p.name, price: p.price, art: p.art, image: p.image })
        return true
      })
      this.save()
      return this.items.length < before
    },
    /** requestId — ключ идемпотентности: повтор того же запроса вернёт тот же заказ, а не создаст второй. */
    async checkout(form: CheckoutData, requestId: string): Promise<Order> {
      const items = this.items.flatMap((i): OrderLine[] => {
        if (i.kind === 'kebab' && i.kebab) {
          const k = i.kebab
          return Array.from({ length: i.qty }, () => ({ type: 'kebab', ...k })) // на сервере каждая порция — отдельная позиция
        }
        return i.productId === undefined ? [] : [{ type: 'product', productId: i.productId, qty: i.qty }]
      })
      const order = await api<Order>('/orders', { method: 'POST', body: { ...form, items, requestId } })
      this.items = []
      this.save()
      return order
    },
  },
})
