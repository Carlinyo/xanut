import { defineStore } from 'pinia'
import { api, ApiError } from '../api'
import type { Category, ComboFar, KebabConfig, Product, ShopConfig } from '../types'
import { setMobileCodes } from '../utils/phone'

let pending: Promise<void> | null = null // идущая загрузка: повторные вызовы ждут её, а не запускают вторую

export const useCatalog = defineStore('catalog', {
  state: () => ({
    categories: [] as Category[],
    products: [] as Product[],
    kebab: { meats: [], marinades: [], extras: [] } as KebabConfig,
    config: { deliveryFee: 700 } as ShopConfig,
    ready: false,
    loading: false,
    error: '',
  }),
  getters: {
    /** Товары магазина без товаров «только за баллы»: те показываются лишь на странице бонусов. */
    shopProducts: (s): Product[] => s.products.filter((p) => !p.bonusOnly),
    /** Дальняя доставка с комбо — со скидкой: дальше overKm от магазина fee ֏ вместо full ֏.
     *  null — старый сервер: с комбо доставка бесплатна везде. */
    comboFar: (s): ComboFar | null => {
      const far = s.config.deliveryFar
      return far?.comboFee !== undefined ? { overKm: far.overKm, fee: far.comboFee, full: far.fee } : null
    },
  },
  actions: {
    /** Загружает каталог один раз; при ошибке можно вызвать снова (кнопка «Повторить»).
     *  force — загрузить заново, даже если каталог уже есть (сервер сказал, что корзина устарела; админ изменил товар):
     *  тогда — свежие данные с сервера, мимо кэша CDN (каталог там хранится до минуты). */
    load(force = false): Promise<void> {
      if (!force && (pending || this.ready)) return pending ?? Promise.resolve()
      const run: Promise<void> = (pending ?? Promise.resolve()).then(() => this.fetchAll(force)).finally(() => { if (pending === run) pending = null })
      pending = run
      return run
    },
    async fetchAll(fresh = false) {
      this.loading = true
      this.error = ''
      const q = fresh ? `?t=${Date.now()}` : '' // другой адрес — кэш CDN и браузера не используется
      try {
        const [categories, products, kebab, config] = await Promise.all([
          api<Category[]>('/categories' + q), api<Product[]>('/products' + q), api<KebabConfig>('/kebab' + q), api<ShopConfig>('/config' + q),
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
