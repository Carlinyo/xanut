import { defineStore } from 'pinia'

export const useUI = defineStore('ui', {
  state: () => ({ cartOpen: false, kebabOpen: false, kebabMeat: '', meatOpen: false, meatProduct: 0, query: '' }),
  actions: {
    /** Окно «Խորոված պատվիրել»; meat — номер хороваца «за кг», который выбрать сразу (с карточки товара). */
    openKebab(meat = '') {
      this.kebabMeat = meat
      this.kebabOpen = true
    },
    /** Окно выбора веса для мяса «за кг»: id — номер товара. */
    openMeat(id: number) {
      this.meatProduct = id
      this.meatOpen = true
    },
  },
})
