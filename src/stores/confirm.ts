import { defineStore } from 'pinia'

/** Строка сводки в окне подтверждения: «Վճարում — Կանխիկ». */
export interface ConfirmRow { label: string; value: string; strong?: boolean }
/** Поле комментария в окне (askNote): подпись, подсказка в пустом поле, готовые варианты (нажатие подставляет текст). */
export interface NoteField { label: string; placeholder?: string; presets?: string[]; hint?: string }
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
  /** Поле комментария — только через askNote(). */
  note?: NoteField
}

/** Длина комментария (так же проверяет сервер). */
export const NOTE_MAX = 300

let resolver: ((r: { ok: boolean; note: string }) => void) | null = null

// Окно подтверждения одно на весь сайт (ConfirmDialog в MainLayout): ask() открывает его и ждёт ответа.
// const ok = await useConfirm().ask({ title: …, yes: … }); if (!ok) return
// С комментарием: const note = await useConfirm().askNote({ …, note: { label: … } }); if (note === null) return
export const useConfirm = defineStore('confirm', {
  state: () => ({ current: null as ConfirmOptions | null, note: '' }),
  actions: {
    open(o: ConfirmOptions, done: (r: { ok: boolean; note: string }) => void) {
      this.answer(false) // новый вопрос закрывает прежний, если он почему-то остался без ответа
      this.current = o
      this.note = ''
      resolver = done
    },
    ask(o: ConfirmOptions): Promise<boolean> {
      return new Promise((resolve) => this.open({ ...o, note: undefined }, (r) => resolve(r.ok)))
    },
    /** Как ask(), но с полем комментария: текст (может быть пустым) — подтвердили, null — отказались. */
    askNote(o: ConfirmOptions & { note: NoteField }): Promise<string | null> {
      return new Promise((resolve) => this.open(o, (r) => resolve(r.ok ? r.note : null)))
    },
    answer(ok: boolean) {
      const r = resolver
      const note = this.note.trim().slice(0, NOTE_MAX)
      resolver = null
      this.current = null
      this.note = ''
      r?.({ ok, note })
    },
  },
})
