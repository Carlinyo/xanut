import { defineStore } from 'pinia'
import { api } from '../api'
import { useCatalog } from './catalog'
import { saveBase64, XLSX_MIME } from '../utils/download'
import { noteBody } from '../utils/orderNote'
import type { AdminCategory, AdminFeedback, AdminOrder, AdminProduct, AdminReview, AdminUser, EmailResult, ExportsOverview, ProductKind, ProductUnit, Segment, SegmentSettings } from '../types'

interface OrdersPage { orders: AdminOrder[]; nextBefore: string | null; lastId: number }
interface OrderUpdate { order: AdminOrder; email: EmailResult | null }
/** Новый товар только за баллы. */
export interface RewardDraft { name: string; bonusPoints: number; price: number; art: string; image?: string }
export type RewardPatch = Partial<Omit<RewardDraft, 'bonusPoints'>> & { bonusPoints?: number | null }
/** Новый товар каталога. price — за 1 кг или за штуку (unit); oldPrice — цена до скидки (null — без скидки). */
export interface ProductDraft {
  name: string; categoryId: number; price: number; oldPrice: number | null; unit: ProductUnit; description: string
  /** Вид мяса у хороваца (фильтр в каталоге); null — «прочее». */
  kind: ProductKind | null
  art: string; image?: string; inStock: boolean; active: boolean
  /** Комбо: в «Հատուկ առաջարկներ», доставка заказа с ним бесплатна. */
  combo: boolean
  /** На развес (порциями, цена — после взвешивания): true/false — задано вручную, null — по умолчанию (рыба и кролик). */
  weighed?: boolean | null
}
/** Изменение товара: любые поля каталога и баллы; image: '' — убрать фото. */
export type ProductPatch = Partial<ProductDraft> & { bonusPoints?: number | null }
/** Новая категория: название, карандашный рисунок (utils/art.ts → CATEGORY_ARTS), «можно заказать на сайте». */
export interface CategoryDraft { name: string; art: string; orderable: boolean }

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
    /** Категории в порядке сайта. */
    categories: [] as AdminCategory[],
    categoriesLoaded: false,
    users: [] as AdminUser[],
    usersLoaded: false,
    /** Акции групп клиентов и правила групп. */
    segments: null as SegmentSettings | null,
    reviews: [] as AdminReview[],
    reviewsLoaded: false,
    /** Жалобы и предложения с сайта, новые первыми. */
    feedback: [] as AdminFeedback[],
    feedbackLoaded: false,
    /** Отчёты за недели и месяцы: что скачано, что очищено, что пора сделать (null — ещё не загружены). */
    exports: null as ExportsOverview | null,
  }),
  getters: {
    /** Сколько жалоб и предложений ещё не разобрано (метка на вкладке). */
    feedbackNew: (s): number => s.feedback.filter((f) => f.status === 'new').length,
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
    /** note — комментарий магазина покупателю (при принятии и отмене; пустой не отправляется). */
    async setStatus(id: number, status: string, note?: string): Promise<EmailResult | null> {
      const r = await api<OrderUpdate>(`/admin/orders/${id}`, { method: 'PATCH', body: { status, ...noteBody(note) }, timeout: 40_000 }) // письмо может идти до ~15 с
      this.put(r.order)
      return r.email
    },
    /** Рыба, кролик: вес позиций на развес (номер позиции и кг всех её порций) → покупателю чек; note — комментарий ему. */
    async weighOrder(id: number, lines: { index: number; kg: number }[], note?: string): Promise<EmailResult | null> {
      const r = await api<OrderUpdate>(`/admin/orders/${id}/weigh`, { method: 'POST', body: { lines, ...noteBody(note) }, timeout: 40_000 })
      this.put(r.order)
      return r.email
    },
    async resendEmail(id: number): Promise<EmailResult | null> {
      const r = await api<OrderUpdate>(`/admin/orders/${id}/notify`, { method: 'POST', timeout: 40_000 })
      this.put(r.order)
      return r.email
    },
    /** Подтвердить оплату (баллы заказа сразу начисляются покупателю) или снять ошибочную отметку. */
    async setPaid(id: number, paid: boolean): Promise<AdminOrder> {
      const r = await api<{ order: AdminOrder }>(`/admin/orders/${id}/payment`, { method: 'POST', body: { paid } })
      this.put(r.order)
      return r.order
    },
    /** Онлайн-оплата: спросить у банка, чем закончился платёж (покупатель закрыл страницу банка, не вернувшись на сайт). */
    async checkPayment(id: number): Promise<AdminOrder> {
      const r = await api<{ order: AdminOrder }>(`/admin/orders/${id}/payment/check`, { method: 'POST', timeout: 30_000 })
      this.put(r.order)
      return r.order
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
    /** Роль: worker — работник (раздел «Պատվերներ» для работников), customer — обычный покупатель. */
    async setRole(id: string, role: 'worker' | 'customer'): Promise<AdminUser> {
      const u = await api<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: { role } })
      this.users = this.users.map((x) => (x.id === u.id ? u : x))
      return u
    },
    /** Баллы клиенту вручную: points > 0 — начислить, < 0 — снять (не больше доступного — иначе BONUS_INSUFFICIENT).
     *  note — причина: покупатель увидит её в истории баллов. */
    async adjustBonus(id: string, points: number, note: string): Promise<AdminUser> {
      const u = await api<AdminUser>(`/admin/users/${id}/bonus`, { method: 'POST', body: { points, note } })
      this.users = this.users.map((x) => (x.id === u.id ? u : x))
      return u
    },
    /** Заказы одного клиента (карточка клиента), новые первыми. archived — сколько его заказов уже только в файлах отчётов. */
    async loadUserOrders(id: string): Promise<{ orders: AdminOrder[]; archived: number }> {
      return api<{ orders: AdminOrder[]; archived: number }>(`/admin/users/${id}/orders`)
    },
    /** Сохранить акции групп. Новые пороги меняют группы клиентов — список загружается заново. */
    async saveSegments(value: SegmentSettings) {
      const saved = await api<SegmentSettings>('/admin/segments', { method: 'PUT', body: value })
      this.segments = saved
      const catalog = useCatalog()
      catalog.config = { ...catalog.config, segments: saved, bonus: catalog.config.bonus && { ...catalog.config.bonus, percent: saved.perks.new.bonusPercent, rate: saved.perks.new.bonusPercent / 100 } }
      await this.loadUsers().catch(() => {}) // акции уже сохранены; список обновится при следующем открытии
    },

    async loadFeedback() {
      this.feedback = (await api<{ items: AdminFeedback[] }>('/admin/feedback')).items
      this.feedbackLoaded = true
    },
    /** done — разобрано (ответили, исправили); new — вернуть в неразобранные. */
    async setFeedbackStatus(id: number, status: AdminFeedback['status']): Promise<AdminFeedback> {
      const f = await api<AdminFeedback>(`/admin/feedback/${id}`, { method: 'PATCH', body: { status } })
      this.feedback = this.feedback.map((x) => (x.id === f.id ? f : x))
      return f
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

    // ---------- категории: после каждой правки сайт в этой вкладке сразу показывает новые (мимо кэша) ----------
    async loadCategories() {
      this.categories = await api<AdminCategory[]>('/admin/categories')
      this.categoriesLoaded = true
    },
    async createCategory(d: CategoryDraft): Promise<AdminCategory> {
      const c = await api<AdminCategory>('/admin/categories', { method: 'POST', body: d })
      this.categories = [...this.categories, c]
      void useCatalog().load(true)
      return c
    },
    async updateCategory(id: number, patch: Partial<CategoryDraft>): Promise<AdminCategory> {
      const c = await api<AdminCategory>(`/admin/categories/${id}`, { method: 'PATCH', body: patch })
      this.categories = this.categories.map((x) => (x.id === id ? c : x))
      void useCatalog().load(true)
      return c
    },
    /** Новый порядок: ids — все категории так, как они должны идти на сайте. */
    async reorderCategories(ids: number[]) {
      this.categories = await api<AdminCategory[]>('/admin/categories/order', { method: 'PUT', body: { ids } })
      void useCatalog().load(true)
    },
    async removeCategory(id: number) {
      await api(`/admin/categories/${id}`, { method: 'DELETE' })
      this.categories = this.categories.filter((c) => c.id !== id)
      void useCatalog().load(true)
    },

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
    // ---------- отчёты: Excel за неделю и месяц, очистка закончившегося месяца ----------
    async loadExports() {
      this.exports = await api<ExportsOverview>('/admin/exports')
    },
    /** Скачать файл отчёта и сообщить серверу, что он сохранён: только после этого месяц можно очистить. Возвращает имя файла. */
    async downloadExport(id: string): Promise<string> {
      const f = await api<{ name: string; hash: string; data: string }>(`/admin/exports/${id}/file`, { method: 'POST', timeout: 60_000 })
      saveBase64(f.name, f.data, XLSX_MIME)
      this.exports = await api<ExportsOverview>(`/admin/exports/${id}/saved`, { method: 'POST', body: { hash: f.hash } })
      return f.name
    },
    /** Удалить закрытые заказы закончившегося (и скачанного) месяца. kept — изменились во время удаления и остались. */
    async purgeExport(id: string): Promise<{ deleted: number; kept: number }> {
      const { deleted, kept, ...overview } = await api<ExportsOverview & { deleted: number; kept: number }>(`/admin/exports/${id}/purge`, { method: 'POST', timeout: 60_000 })
      this.exports = overview
      // удалённые заказы не должны остаться в списке «Պատվերներ» (он не перезагружается при переключении вкладок)
      if (deleted && this.ordersLoaded) void this.loadOrders().catch(() => {})
      return { deleted, kept }
    },

    /** Картинка (data URL) → адрес на сервере. */
    async uploadImage(data: string): Promise<string> {
      return (await api<{ url: string }>('/admin/images', { method: 'POST', body: { data }, timeout: 60_000 })).url
    },
  },
})
