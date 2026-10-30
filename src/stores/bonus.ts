import { defineStore } from 'pinia'
import { api } from '../api'
import { useCatalog } from './catalog'
import type { BonusEntry, BonusInfo, CustomerLevel, Perks, Product } from '../types'

// Бонусные баллы и группа покупателя (новый, постоянный, VIP). Баланс и группу считает сервер (по заказам), здесь — только показ.
export const useBonus = defineStore('bonus', {
  state: () => ({ available: 0, pending: 0, history: [] as BonusEntry[], level: null as CustomerLevel | null, loaded: false }),
  getters: {
    /** Бонусные товары — из каталога (товары с ценой в баллах), дешёвые первыми. */
    rewards: (): Product[] => useCatalog().products.filter((p) => p.bonusPoints).sort((a, b) => a.bonusPoints! - b.bonusPoints!),
    /** Акция группы покупателя; гостю и пока группа не загружена — акция нового клиента. */
    perks(s): Perks {
      const { config } = useCatalog()
      return s.level?.perks ?? config.segments?.perks.new ?? { discount: 0, bonusPercent: config.bonus?.percent ?? 2, freeDelivery: false }
    },
    /** Сколько процентов покупки возвращается баллами — у этого покупателя. */
    percent(): number { return this.perks.bonusPercent },
  },
  actions: {
    async load() {
      try {
        const r = await api<BonusInfo>('/bonus')
        Object.assign(this, r, { level: r.level ?? null, loaded: true })
      } catch { /* гость или нет связи — покажем без баланса */ }
    },
    reset() { Object.assign(this, { available: 0, pending: 0, history: [], level: null, loaded: false }) },
  },
})
