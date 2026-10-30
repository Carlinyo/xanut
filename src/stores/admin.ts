import { defineStore } from 'pinia'
import { api } from '../api'
import type { AdminOrder, AdminProduct, EmailResult } from '../types'

interface OrdersPage { orders: AdminOrder[]; nextBefore: string | null; lastId: number }
interface OrderUpdate { order: AdminOrder; email: EmailResult | null }
/** Новый товар только за баллы. */
export interface RewardDraft { name: string; bonusPoints: number; price: number; art: string; image?: string }
export type RewardPatch = Partial<Omit<RewardDraft, 'bonusPoints'>> & { bonusPoints?: number | null }

const newestFirst = (a: AdminOrder, b: AdminOrder) => b.createdAt.localeCompare(a.createdAt)

// Админка: заказы и бонусные товары. Права проверяет сервер (роль admin), здесь — только данные для экрана.
export const useAdmin = defineStore('admin', {
  state: () => ({
    orders: [] as AdminOrder[],
    nextBefore: null as string | null,
    /** Номер последнего заказа — по нему видно, что пришли новые. */
    lastId: 0,
    ordersLoaded: false,
    products: [] as AdminProduct[],
    productsLoaded: false,
  }),
  getters: {
    rewards: (s): AdminProduct[] => s.products.filter((p) => p.bonusPoints || p.bonusOnly).sort((a, b) => (a.bonusPoints ?? 0) - (b.bonusPoints ?? 0)),
  },
  actions: {
    put(o: AdminOrder) {
      const i = this.orders.findIndex((x) => x.id === o.id)
      if (i >= 0) this.orders[i] = o
      else this.orders = [...this.orders, o].sort(newestFirst)
    },
    async loadOrders() {
      const r = await api<OrdersPage>('/admin/orders')
      Object.assign(this, { orders: r.orders, nextBefore: r.nextBefore, lastId: r.lastId, ordersLoaded: true })
    },
    async loadMore() {
      if (!this.nextBefore) return
      const r = await api<OrdersPage>(`/admin/orders?before=${encodeURIComponent(this.nextBefore)}`)
      r.orders.forEach((o) => this.put(o))
      this.nextBefore = r.nextBefore
    },
    /** Пришли ли новые заказы (дешёвый запрос). Если да — список загружается заново; возвращает номера новых заказов. */
    async checkNew(): Promise<number[]> {
      const { lastId } = await api<{ lastId: number }>('/admin/orders/head')
      if (lastId <= this.lastId) return []
      const known = new Set(this.orders.map((o) => o.id))
      await this.loadOrders()
      return this.orders.filter((o) => !known.has(o.id)).map((o) => o.id)
    },
    async setStatus(id: number, status: string): Promise<EmailResult | null> {
      const r = await api<OrderUpdate>(`/admin/orders/${id}`, { method: 'PATCH', body: { status }, timeout: 40_000 }) // письмо может идти до ~15 с
      this.put(r.order)
      return r.email
    },
    async resendEmail(id: number): Promise<EmailResult | null> {
      const r = await api<OrderUpdate>(`/admin/orders/${id}/notify`, { method: 'POST', timeout: 40_000 })
      this.put(r.order)
      return r.email
    },

    async loadProducts() {
      this.products = await api<AdminProduct[]>('/admin/products')
      this.productsLoaded = true
    },
    putProduct(p: AdminProduct) {
      const i = this.products.findIndex((x) => x.id === p.id)
      if (i >= 0) this.products[i] = p
      else this.products.push(p)
    },
    async createReward(d: RewardDraft) {
      this.putProduct(await api<AdminProduct>('/admin/products', { method: 'POST', body: d }))
    },
    async updateProduct(id: number, patch: RewardPatch) {
      this.putProduct(await api<AdminProduct>(`/admin/products/${id}`, { method: 'PATCH', body: patch }))
    },
    async removeReward(id: number) {
      await api(`/admin/products/${id}`, { method: 'DELETE' })
      this.products = this.products.filter((p) => p.id !== id)
    },
    /** Картинка (data URL) → адрес на сервере. */
    async uploadImage(data: string): Promise<string> {
      return (await api<{ url: string }>('/admin/images', { method: 'POST', body: { data }, timeout: 60_000 })).url
    },
  },
})
