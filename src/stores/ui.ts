import { defineStore } from 'pinia'

export const useUI = defineStore('ui', {
  state: () => ({ cartOpen: false, kebabOpen: false, kebabMeat: '', query: '' }),
  actions: {
    /** Окно «Խորոված պատվիրել»; meat — номер хороваца «за кг», который выбрать сразу (с карточки товара). */
    openKebab(meat = '') {
      this.kebabMeat = meat
      this.kebabOpen = true
    },
  },
})
