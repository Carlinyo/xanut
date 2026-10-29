import { defineStore } from 'pinia'
import { api } from '../api'
import { useCatalog } from './catalog'
import type { CartItem, KebabSelection, Order } from '../types'

export interface Addable { id: number | string; name: string; price: number; art?: string; note?: string; kebab?: KebabSelection; orderable?: boolean }
export interface CheckoutData { name: string; phone: string; address: string; slot: string; payment: 'cash' | 'card' }

// Корзина хранится локально (гость может собирать её до входа), заказ уходит на сервер.
// price здесь — только для показа: сервер пересчитывает цены сам.
const stored = (): CartItem[] => (JSON.parse(localStorage.getItem('cart') || '[]') as CartItem[]).filter((i) => i.kind)

export const useCart = defineStore('cart', {
  state: () => ({ items: stored() }),
  getters: {
    count: (s): number => s.items.reduce((n, i) => n + i.qty, 0),
    subtotal: (s): number => s.items.reduce((n, i) => n + i.price * i.qty, 0),
    delivery(): number {
      const { deliveryFee, freeDeliveryFrom } = useCatalog().config
      return this.subtotal === 0 || this.subtotal >= freeDeliveryFrom ? 0 : deliveryFee
    },
    total(): number { return this.subtotal + this.delivery },
  },
  actions: {
    save() { localStorage.setItem('cart', JSON.stringify(this.items)) },
    add(p: Addable) {
      if (p.orderable === false) return // витринный товар: заказать нельзя (сервер всё равно отклонит)
      const found = this.items.find((i) => i.id === p.id)
      if (found) found.qty++
      else this.items.push({
        id: p.id, kind: p.kebab ? 'kebab' : 'product', productId: typeof p.id === 'number' ? p.id : undefined, kebab: p.kebab,
        name: p.name, price: p.price, art: p.art || 'basket', note: p.note || '', qty: 1,
      })
      this.save()
    },
    change(id: number | string, delta: number) {
      const item = this.items.find((i) => i.id === id)
      if (!item) return
      item.qty += delta
      if (item.qty <= 0) this.items = this.items.filter((i) => i.id !== id)
      this.save()
    },
    /** Убирает из корзины товары, которых нет в каталоге или которые нельзя заказать (шашлык остаётся). */
    prune(validIds: Set<number>) {
      this.items = this.items.filter((i) => i.kind === 'kebab' || (i.productId !== undefined && validIds.has(i.productId)))
      this.save()
    },
    /** requestId — ключ идемпотентности: повтор того же запроса вернёт тот же заказ, а не создаст второй. */
    async checkout(form: CheckoutData, requestId: string): Promise<Order> {
      const items = this.items.flatMap((i) => {
        if (i.kind === 'kebab' && i.kebab) {
          const k = i.kebab
          return Array.from({ length: i.qty }, () => ({ type: 'kebab' as const, ...k })) // на сервере каждая порция — отдельная позиция
        }
        return [{ type: 'product' as const, productId: Number(i.productId), qty: i.qty }]
      })
      const order = await api<Order>('/orders', { method: 'POST', body: { ...form, items, requestId } })
      this.items = []
      this.save()
      return order
    },
  },
})
