import { defineStore } from 'pinia'
import { api, ApiError } from '../api'
import type { Category, KebabConfig, Product, ShopConfig } from '../types'
import { setMobileCodes } from '../utils/phone'

export const useCatalog = defineStore('catalog', {
  state: () => ({
    categories: [] as Category[],
    products: [] as Product[],
    kebab: { meats: [], marinades: [], extras: [] } as KebabConfig,
    config: { deliveryFee: 500, freeDeliveryFrom: 10000 } as ShopConfig,
    ready: false,
    loading: false,
    error: '',
  }),
  actions: {
    /** Загружает каталог один раз; при ошибке можно вызвать снова (кнопка «Повторить»). */
    async load() {
      if (this.loading || this.ready) return
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
