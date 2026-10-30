import { defineStore } from 'pinia'

/** Строка сводки в окне подтверждения: «Վճարում — Կանխիկ». */
export interface ConfirmRow { label: string; value: string; strong?: boolean }
export interface ConfirmOptions {
  title: string
  text?: string
  rows?: ConfirmRow[]
  /** Надпись на кнопке «да» — что именно произойдёт («Այո, պատվիրել»). */
  yes: string
  /** Надпись на кнопке «нет» (по умолчанию «Ոչ»). */
  no?: string
  /** danger — необратимое действие: красная кнопка, а фокус по умолчанию на «нет». */
  tone?: 'primary' | 'danger'
  icon?: string
}

let resolver: ((ok: boolean) => void) | null = null

// Окно подтверждения одно на весь сайт (ConfirmDialog в MainLayout): ask() открывает его и ждёт ответа.
// const ok = await useConfirm().ask({ title: …, yes: … }); if (!ok) return
export const useConfirm = defineStore('confirm', {
  state: () => ({ current: null as ConfirmOptions | null }),
  actions: {
    ask(o: ConfirmOptions): Promise<boolean> {
      this.answer(false) // новый вопрос закрывает прежний, если он почему-то остался без ответа
      this.current = o
      return new Promise((resolve) => { resolver = resolve })
    },
    answer(ok: boolean) {
      const r = resolver
      resolver = null
      this.current = null
      r?.(ok)
    },
  },
})
