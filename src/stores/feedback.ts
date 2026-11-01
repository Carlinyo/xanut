import { defineStore } from 'pinia'
import { api } from '../api'
import type { FeedbackType } from '../types'

/** website — скрытое поле-ловушка для ботов (у человека всегда пустое). */
export interface FeedbackDraft { type: FeedbackType; message: string; name?: string; contact?: string; orderId?: number; website?: string }

// Окно «Բողոքներ և առաջարկներ» одно на весь сайт (FeedbackDialog в MainLayout).
// open() открывает его: из подвала — как предложение, у заказа в кабинете — как жалобу на этот заказ.
export const useFeedback = defineStore('feedback', {
  state: () => ({ visible: false, type: 'suggestion' as FeedbackType, orderId: null as number | null }),
  actions: {
    open(o: { type?: FeedbackType; orderId?: number } = {}) {
      Object.assign(this, { visible: true, type: o.type ?? (o.orderId ? 'complaint' : 'suggestion'), orderId: o.orderId ?? null })
    },
    close() { this.visible = false },
    /** requestId — ключ от повторной отправки: тот же запрос не создаст вторую запись. Возвращает номер записи. */
    async send(d: FeedbackDraft, requestId: string): Promise<number> {
      return (await api<{ id: number }>('/feedback', { method: 'POST', body: { ...d, requestId } })).id
    },
  },
})
