import { defineStore } from 'pinia'
export const useUI = defineStore('ui', { state: () => ({ cartOpen: false, kebabOpen: false, query: '' }) })
