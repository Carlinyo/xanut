// Комментарий магазина покупателю при принятии и отмене заказа — одинаково в админке и у работника.
// Готовые причины отмены — в locales/hy.json → orderNote.cancelPresets (добавлять и менять там).
import { t } from '../i18n'
import type { NoteField } from '../stores/confirm'

/** Принять заказ: свой текст (например, когда будет готов). */
export const acceptNote = (): NoteField => ({
  label: t('orderNote.acceptLabel'), placeholder: t('orderNote.acceptPlaceholder'), hint: t('orderNote.hint'),
})

/** Отменить заказ: готовые причины, их можно поправить или написать свою. */
export const cancelNote = (): NoteField => {
  const presets: unknown = t('orderNote.cancelPresets')
  return {
    label: t('orderNote.cancelLabel'), placeholder: t('orderNote.cancelPlaceholder'), hint: t('orderNote.hint'),
    presets: Array.isArray(presets) ? presets.filter((p): p is string => typeof p === 'string') : [],
  }
}

/** Тело запроса: комментарий уходит, только если его написали. */
export const noteBody = (note?: string): { note?: string } => (note ? { note } : {})
