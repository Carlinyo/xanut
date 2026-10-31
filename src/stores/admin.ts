import { defineStore } from 'pinia'
import { api } from '../api'
import { useCatalog } from './catalog'
import type { AdminOrder, AdminProduct, AdminReview, AdminUser, EmailResult, ProductUnit, Segment, SegmentSettings } from '../types'

interface OrdersPage { orders: AdminOrder[]; nextBefore: string | null; lastId: number }
interface OrderUpdate { order: AdminOrder; email: EmailResult | null }
/** Новый товар только за баллы. */
export interface RewardDraft { name: string; bonusPoints: number; price: number; art: string; image?: string }
export type RewardPatch = Partial<Omit<RewardDraft, 'bonusPoints'>> & { bonusPoints?: number | null }
/** Новый товар каталога. price — за 1 кг или за штуку (unit); oldPrice — цена до скидки (null — без скидки). */
export interface ProductDraft {
  name: string; categoryId: number; price: number; oldPrice: number | null; unit: ProductUnit; description: string
  art: string; image?: string; inStock: boolean; active: boolean
}
/** Изменение товара: любые поля каталога и баллы; image: '' — убрать фото. */
export type ProductPatch = Partial<ProductDraft> & { bonusPoints?: number | null }

const newestFirst = (a: AdminOrder, b: AdminOrder) => b.createdAt.localeCompare(a.createdAt)

// Админка: заказы, клиенты и их группы, бонусные товары. Права проверяет сервер (роль admin), здесь — только данные для экрана.
export const useAdmin = defineStore('admin', {
  state: () => ({
    orders: [] as AdminOrder[],
    nextBefore: null as string | null,
    /** Номер последнего заказа — по нему видно, что пришли новые. */
    lastId: 0,
    /** Новые заказы, которые админ ещё не открыл (плашка «Նոր պատվեր» и метка на вкладке «Заказы»). */
    newIds: [] as number[],
    ordersLoaded: false,
    products: [] as AdminProduct[],
    productsLoaded: false,
    users: [] as AdminUser[],
    usersLoaded: false,
    /** Акции групп клиентов и правила групп. */
    segments: null as SegmentSettings | null,
    reviews: [] as AdminReview[],
    reviewsLoaded: false,
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

    async loadUsers() {
      const r = await api<{ users: AdminUser[]; segments: SegmentSettings }>('/admin/users')
      Object.assign(this, { users: r.users, segments: r.segments, usersLoaded: true })
    },
    /** Назначить группу клиенту; null — снова считать по покупкам. */
    async setSegment(id: string, segment: Segment | null): Promise<AdminUser> {
      const u = await api<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: { segment } })
      this.users = this.users.map((x) => (x.id === u.id ? u : x))
      return u
    },
    /** Сохранить акции групп. Новые пороги меняют группы клиентов — список загружается заново. */
    async saveSegments(value: SegmentSettings) {
      const saved = await api<SegmentSettings>('/admin/segments', { method: 'PUT', body: value })
      this.segments = saved
      const catalog = useCatalog()
      catalog.config = { ...catalog.config, segments: saved, bonus: catalog.config.bonus && { ...catalog.config.bonus, percent: saved.perks.new.bonusPercent, rate: saved.perks.new.bonusPercent / 100 } }
      await this.loadUsers().catch(() => {}) // акции уже сохранены; список обновится при следующем открытии
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
    /** Новый товар каталога. Сайт (каталог в этой же вкладке) обновляет вызывающий. */
    async createProduct(d: ProductDraft): Promise<AdminProduct> {
      const p = await api<AdminProduct>('/admin/products', { method: 'POST', body: d })
      this.putProduct(p)
      return p
    },
    async updateProduct(id: number, patch: RewardPatch | ProductPatch): Promise<AdminProduct> {
      const p = await api<AdminProduct>(`/admin/products/${id}`, { method: 'PATCH', body: patch })
      this.putProduct(p)
      return p
    },
    /** Удалить товар насовсем (каталога или только за баллы). */
    async removeProduct(id: number) {
      await api(`/admin/products/${id}`, { method: 'DELETE' })
      this.products = this.products.filter((p) => p.id !== id)
    },
    removeReward(id: number) { return this.removeProduct(id) },

    async loadReviews() {
      this.reviews = await api<AdminReview[]>('/admin/reviews')
      this.reviewsLoaded = true
    },
    /** Скрыть отзыв с сайта или вернуть (скрытый не входит в рейтинг товаров). */
    async setReviewHidden(orderId: number, hidden: boolean) {
      const r = await api<AdminReview>(`/admin/reviews/${orderId}`, { method: 'PATCH', body: { hidden } })
      this.reviews = this.reviews.map((x) => (x.orderId === r.orderId ? r : x))
      return r
    },
    /** Картинка (data URL) → адрес на сервере. */
    async uploadImage(data: string): Promise<string> {
      return (await api<{ url: string }>('/admin/images', { method: 'POST', body: { data }, timeout: 60_000 })).url
    },
  },
})
