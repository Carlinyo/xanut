import { defineStore } from 'pinia'
import { api, ApiError } from '../api'
import type { Category, KebabConfig, Product, ShopConfig } from '../types'
import { setMobileCodes } from '../utils/phone'

let pending: Promise<void> | null = null // идущая загрузка: повторные вызовы ждут её, а не запускают вторую

export const useCatalog = defineStore('catalog', {
  state: () => ({
    categories: [] as Category[],
    products: [] as Product[],
    kebab: { meats: [], marinades: [], extras: [] } as KebabConfig,
    config: { deliveryFee: 700, freeDeliveryFrom: 10000 } as ShopConfig,
    ready: false,
    loading: false,
    error: '',
  }),
  actions: {
    /** Загружает каталог один раз; при ошибке можно вызвать снова (кнопка «Повторить»).
     *  force — загрузить заново, даже если каталог уже есть (например, сервер сказал, что корзина устарела). */
    load(force = false): Promise<void> {
      if (pending) return pending
      if (this.ready && !force) return Promise.resolve()
      pending = this.fetchAll().finally(() => { pending = null })
      return pending
    },
    async fetchAll() {
      this.loading = true
      this.error = ''
      try {
        const [categories, products, kebab, config] = await Promise.all([
          api<Category[]>('/categories'), api<Product[]>('/products'), api<KebabConfig>('/kebab'), api<ShopConfig>('/config'),
        ])
        this.categories = categories
        this.products = products
        this.kebab = kebab
        this.config = config
        setMobileCodes(config.phone?.mobileCodes) // единый список кодов операторов — с сервера
        this.ready = true
      } catch (e) {
        this.error = e instanceof ApiError ? e.code : 'ERROR'
      } finally {
        this.loading = false
      }
    },
  },
})
