import { defineStore } from 'pinia'
import { api } from '../api'
import { useCatalog } from './catalog'
import type { BonusEntry, BonusInfo, Product } from '../types'

// Бонусные баллы покупателя. Баланс считает сервер (по заказам), здесь — только показ.
export const useBonus = defineStore('bonus', {
  state: () => ({ available: 0, pending: 0, history: [] as BonusEntry[], loaded: false }),
  getters: {
    /** Бонусные товары — из каталога (товары с ценой в баллах), дешёвые первыми. */
    rewards: (): Product[] => useCatalog().products.filter((p) => p.bonusPoints).sort((a, b) => a.bonusPoints! - b.bonusPoints!),
    percent: (): number => useCatalog().config.bonus?.percent ?? 2,
  },
  actions: {
    async load() {
      try {
        const r = await api<BonusInfo>('/bonus')
        Object.assign(this, r, { loaded: true })
      } catch { /* гость или нет связи — покажем без баланса */ }
    },
    reset() { Object.assign(this, { available: 0, pending: 0, history: [], loaded: false }) },
  },
})
