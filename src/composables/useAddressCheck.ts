import { ref, watch } from 'vue'
import { api, ApiError } from '../api'

export type AddressState = 'idle' | 'checking' | 'ok' | 'invalid' | 'unavailable'

/**
 * Проверка существования адреса на сервере. Результат сбрасывается, как только пользователь меняет адрес.
 * check(): true — адрес найден; false — не найден или сервис недоступен (смотрите state);
 * null — пока шла проверка, адрес изменили: результат устарел, показывать нечего.
 * km — расстояние от магазина до найденного адреса (null — неизвестно): по нему считается цена доставки.
 * Ошибка 401 (сессия истекла) пробрасывается — её обрабатывает форма.
 */
export function useAddressCheck(address: () => string) {
  const state = ref<AddressState>('idle')
  const formatted = ref('')
  const km = ref<number | null>(null)
  let verified = ''

  watch(address, () => { state.value = 'idle'; formatted.value = ''; km.value = null; verified = '' })

  async function check(): Promise<boolean | null> {
    const value = address().trim()
    if (state.value === 'ok' && verified === value) return true // уже проверено, сеть не нужна
    state.value = 'checking'
    let r: { valid: boolean; formatted?: string; km?: number }
    try {
      r = await api<{ valid: boolean; formatted?: string; km?: number }>('/address/check', { method: 'POST', body: { address: value } })
    } catch (e) {
      if (value !== address().trim()) return null
      if (e instanceof ApiError && e.status === 401) { state.value = 'idle'; throw e }
      state.value = 'unavailable'
      return false
    }
    if (value !== address().trim()) return null // пока шла проверка, адрес изменили
    state.value = r.valid ? 'ok' : 'invalid'
    formatted.value = r.formatted ?? ''
    km.value = r.valid && typeof r.km === 'number' ? r.km : null
    verified = r.valid ? value : ''
    return r.valid
  }
  return { state, formatted, km, check }
}
