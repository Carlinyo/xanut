import type { App } from 'vue'
import hy from './locales/hy.json'

type Params = Record<string, string | number>

// t('cart.freeFrom', { amount: 10000 }) — тексты берутся из JSON, {name} подставляется из params.
// Возвращает any: по ключу может прийти и строка, и массив/объект (promos, features, ...).
export function t(key: string, params: Params = {}): any {
  const v = key.split('.').reduce<any>((o, k) => o?.[k], hy)
  if (v == null) return key
  return typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? '')) : v
}
export default { install(app: App) { app.config.globalProperties.$t = t } }
